"""
CampuGrid Local SGD Wrapper
============================
For Standard-tier ML training over WiFi. Each node trains independently
for SYNC_INTERVAL steps, then averages model weights with all peers
via a lightweight HTTP-based sync server.

This is the key innovation that makes ML training viable over campus WiFi:
- DDP syncs ~300MB every step (~200ms) → 15-30x slower on WiFi
- Local SGD syncs ~300MB every 100 steps (~20s) → near-linear speedup

Usage:
    python -u /campugrid/local_sgd_wrapper.py /workspace/input/train.py

Environment Variables:
    CAMPUGRID_SYNC_INTERVAL  — steps between weight averaging (default: 100)
    CAMPUGRID_PEERS          — JSON array of "ip:port" strings
    CAMPUGRID_RANK           — this node's rank
    CAMPUGRID_WORLD_SIZE     — total number of nodes
"""

import os
import sys
import gc
import io
import json
import time
import logging
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format="[CampuGrid/LSGD] %(message)s")
logger = logging.getLogger("campugrid.local_sgd")

# ── Configuration ──────────────────────────────────────────────

SYNC_INTERVAL = int(os.environ.get("CAMPUGRID_SYNC_INTERVAL", "100"))
PEERS = json.loads(os.environ.get("CAMPUGRID_PEERS", "[]"))
NODE_RANK = int(os.environ.get("CAMPUGRID_RANK", "0"))
WORLD_SIZE = int(os.environ.get("CAMPUGRID_WORLD_SIZE", "1"))
SYNC_PORT = 29500 + NODE_RANK

logger.info(f"Local SGD: rank={NODE_RANK}, world_size={WORLD_SIZE}, sync_every={SYNC_INTERVAL}")

# ── State ──────────────────────────────────────────────────────

_tracked_models: list = []
_tracked_optimizers: list = []
_step_count: int = 0
_torch = None
_current_state_dict = None  # Served to peers
_state_lock = threading.Lock()


def _ensure_torch():
    global _torch
    if _torch is None:
        import torch
        _torch = torch
    return _torch


# ── Sync Server ────────────────────────────────────────────────

class WeightServerHandler(BaseHTTPRequestHandler):
    """Serves current model weights to requesting peers."""

    def do_GET(self):
        """Return serialized state_dict."""
        with _state_lock:
            if _current_state_dict is None:
                self.send_response(503)
                self.end_headers()
                return

            torch = _ensure_torch()
            buf = io.BytesIO()
            torch.save(_current_state_dict, buf)
            data = buf.getvalue()

        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logging


def _start_sync_server():
    """Start a background HTTP server to serve weights."""
    server = HTTPServer(("0.0.0.0", SYNC_PORT), WeightServerHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info(f"Weight sync server started on port {SYNC_PORT}")
    return server


# ── Weight Averaging ───────────────────────────────────────────

def _fetch_peer_weights(peer_addr: str) -> dict | None:
    """Fetch weights from a peer's sync server."""
    import urllib.request
    torch = _ensure_torch()

    try:
        url = f"http://{peer_addr}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            buf = io.BytesIO(data)
            return torch.load(buf, map_location="cpu", weights_only=False)
    except Exception as e:
        logger.warning(f"Failed to fetch weights from {peer_addr}: {e}")
        return None


def _average_weights():
    """Collect weights from all peers, compute average, apply to local model."""
    global _current_state_dict
    torch = _ensure_torch()

    if not _tracked_models:
        return

    model = _tracked_models[0]  # Primary model
    my_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    # Update served state
    with _state_lock:
        _current_state_dict = my_state

    # Give peers a moment to also publish their state
    time.sleep(0.5)

    # Collect from peers
    all_states = [my_state]
    my_addr = f"0.0.0.0:{SYNC_PORT}"

    for peer in PEERS:
        # Skip self
        if peer.endswith(f":{SYNC_PORT}"):
            continue
        peer_state = _fetch_peer_weights(peer)
        if peer_state is not None:
            all_states.append(peer_state)

    if len(all_states) <= 1:
        logger.info(f"No peer weights received, skipping averaging (step {_step_count})")
        return

    # Average all weights
    avg_state = {}
    for key in my_state:
        stacked = torch.stack([s[key].float() for s in all_states if key in s])
        avg_state[key] = stacked.mean(dim=0).to(my_state[key].dtype)

    # Apply averaged weights
    model.load_state_dict(avg_state)
    logger.info(
        f"Weight averaging complete: step={_step_count}, "
        f"peers={len(all_states)}/{WORLD_SIZE}"
    )


# ── Monkey-Patches ─────────────────────────────────────────────

def _install_patches():
    """Install monkey-patches for Local SGD sync."""
    torch = _ensure_torch()

    # Import and apply checkpoint patches first
    # We delegate checkpointing to the checkpoint wrapper's logic
    from ml_checkpoint_wrapper import (
        _install_patches as install_checkpoint_patches,
        CHECKPOINT_INTERVAL,
        _save_checkpoint,
    )
    install_checkpoint_patches()

    # Now overlay the Local SGD sync on top
    _original_step = torch.optim.Optimizer.step

    def _patched_step_with_sync(self, *args, **kwargs):
        global _step_count
        result = _original_step(self, *args, **kwargs)
        _step_count += 1

        # Periodic checkpoint (from checkpoint wrapper)
        if _step_count % CHECKPOINT_INTERVAL == 0:
            _save_checkpoint(_step_count)

        # Local SGD sync
        if _step_count % SYNC_INTERVAL == 0 and WORLD_SIZE > 1:
            logger.info(f"Triggering Local SGD weight sync at step {_step_count}...")
            _average_weights()

        return result

    torch.optim.Optimizer.step = _patched_step_with_sync

    # Track optimizers
    _original_optim_init = torch.optim.Optimizer.__init__

    def _patched_optim_init(self, params, *args, **kwargs):
        _original_optim_init(self, params, *args, **kwargs)
        _tracked_optimizers.append(self)

        optim_param_ids = set()
        for group in self.param_groups:
            for p in group["params"]:
                optim_param_ids.add(id(p))

        for obj in gc.get_objects():
            if isinstance(obj, torch.nn.Module) and obj not in _tracked_models:
                model_param_ids = set(id(p) for p in obj.parameters())
                if model_param_ids & optim_param_ids:
                    _tracked_models.append(obj)
                    break

    torch.optim.Optimizer.__init__ = _patched_optim_init
    logger.info("Local SGD patches installed")


# ── Main ───────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python local_sgd_wrapper.py <script.py> [args...]")
        sys.exit(1)

    script_path = sys.argv[1]
    sys.argv = sys.argv[1:]

    # Start sync server
    if WORLD_SIZE > 1:
        _start_sync_server()

    # Install patches
    try:
        _install_patches()
    except ImportError as e:
        logger.warning(f"Could not install patches: {e}")

    logger.info(f"Executing student script: {script_path}")

    with open(script_path) as f:
        code = compile(f.read(), script_path, "exec")
        exec(code, {"__name__": "__main__", "__file__": script_path})
