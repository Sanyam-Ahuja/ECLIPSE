"""
CampuGrid Auto-Checkpoint Wrapper
=================================
Loaded BEFORE the student's training script. Monkey-patches
torch.optim.Optimizer.step() to auto-save model + optimizer state
every CHECKPOINT_INTERVAL steps — the student never modifies their code.

Usage (inside container):
    python -u /campugrid/ml_checkpoint_wrapper.py /workspace/input/train.py

Environment Variables:
    CAMPUGRID_CHECKPOINT_INTERVAL  — steps between saves (default: 100)
    CAMPUGRID_CHECKPOINT_PATH      — where to write checkpoints (default: /output/checkpoints/)
    CAMPUGRID_RESUME_CHECKPOINT    — path to resume from (empty = fresh start)
    CAMPUGRID_JOB_ID               — job ID for logging
    CAMPUGRID_CHUNK_ID             — chunk ID for logging
"""

import os
import sys
import gc
import glob
import time
import logging

logging.basicConfig(level=logging.INFO, format="[CampuGrid] %(message)s")
logger = logging.getLogger("campugrid.checkpoint")

# ── Configuration ──────────────────────────────────────────────

CHECKPOINT_INTERVAL = int(os.environ.get("CAMPUGRID_CHECKPOINT_INTERVAL", "100"))
CHECKPOINT_PATH = os.environ.get("CAMPUGRID_CHECKPOINT_PATH", "/output/checkpoints/")
RESUME_FROM = os.environ.get("CAMPUGRID_RESUME_CHECKPOINT", "")
JOB_ID = os.environ.get("CAMPUGRID_JOB_ID", "unknown")
CHUNK_ID = os.environ.get("CAMPUGRID_CHUNK_ID", "unknown")
MAX_KEPT_CHECKPOINTS = 3

os.makedirs(CHECKPOINT_PATH, exist_ok=True)

logger.info(f"Auto-checkpoint enabled: interval={CHECKPOINT_INTERVAL}, path={CHECKPOINT_PATH}")
if RESUME_FROM:
    logger.info(f"Will resume from: {RESUME_FROM}")

# ── Tracking State ─────────────────────────────────────────────

_tracked_models: list = []
_tracked_optimizers: list = []
_step_count: int = 0
_first_step_done: bool = False

# Lazy import — torch might not exist until student code runs
_torch = None


def _ensure_torch():
    global _torch
    if _torch is None:
        import torch
        _torch = torch
    return _torch


# ── Checkpoint Save ────────────────────────────────────────────

def _save_checkpoint(step: int):
    """Save all tracked models and optimizers."""
    torch = _ensure_torch()

    checkpoint = {
        "step": step,
        "timestamp": time.time(),
        "job_id": JOB_ID,
        "chunk_id": CHUNK_ID,
        "models": {},
        "optimizers": {},
    }

    for i, model in enumerate(_tracked_models):
        try:
            checkpoint["models"][f"model_{i}"] = model.state_dict()
        except Exception as e:
            logger.warning(f"Failed to save model_{i} state: {e}")

    for i, opt in enumerate(_tracked_optimizers):
        try:
            checkpoint["optimizers"][f"optimizer_{i}"] = opt.state_dict()
        except Exception as e:
            logger.warning(f"Failed to save optimizer_{i} state: {e}")

    path = os.path.join(CHECKPOINT_PATH, f"checkpoint_step_{step}.pt")
    torch.save(checkpoint, path)
    logger.info(f"Checkpoint saved: step={step}, path={path}")

    # Keep only last N checkpoints to save disk
    old_checkpoints = sorted(
        glob.glob(os.path.join(CHECKPOINT_PATH, "checkpoint_step_*.pt"))
    )[:-MAX_KEPT_CHECKPOINTS]
    for old in old_checkpoints:
        try:
            os.remove(old)
        except OSError:
            pass


# ── Checkpoint Resume ──────────────────────────────────────────

def _resume_if_needed():
    """Resume from checkpoint if CAMPUGRID_RESUME_CHECKPOINT is set."""
    global _step_count

    if not RESUME_FROM or not os.path.exists(RESUME_FROM):
        return

    torch = _ensure_torch()
    logger.info(f"Resuming from checkpoint: {RESUME_FROM}")

    checkpoint = torch.load(RESUME_FROM, map_location="cpu", weights_only=False)

    for i, model in enumerate(_tracked_models):
        key = f"model_{i}"
        if key in checkpoint.get("models", {}):
            model.load_state_dict(checkpoint["models"][key])
            logger.info(f"Restored {key}")

    for i, opt in enumerate(_tracked_optimizers):
        key = f"optimizer_{i}"
        if key in checkpoint.get("optimizers", {}):
            opt.load_state_dict(checkpoint["optimizers"][key])
            logger.info(f"Restored {key}")

    _step_count = checkpoint.get("step", 0)
    logger.info(f"Resumed at step {_step_count}")


# ── Monkey-Patches ─────────────────────────────────────────────

def _install_patches():
    """Install monkey-patches on PyTorch classes."""
    torch = _ensure_torch()

    # Track optimizers when they're created
    _original_optim_init = torch.optim.Optimizer.__init__

    def _patched_optim_init(self, params, *args, **kwargs):
        _original_optim_init(self, params, *args, **kwargs)
        _tracked_optimizers.append(self)

        # Find the model these params belong to
        optim_param_ids = set()
        for group in self.param_groups:
            for p in group["params"]:
                optim_param_ids.add(id(p))

        for obj in gc.get_objects():
            if isinstance(obj, torch.nn.Module) and obj not in _tracked_models:
                model_param_ids = set(id(p) for p in obj.parameters())
                if model_param_ids & optim_param_ids:  # overlap
                    _tracked_models.append(obj)
                    logger.info(f"Tracking model: {obj.__class__.__name__}")
                    break

        logger.info(f"Tracking optimizer: {self.__class__.__name__}")

    torch.optim.Optimizer.__init__ = _patched_optim_init

    # Auto-checkpoint on optimizer.step()
    _original_step = torch.optim.Optimizer.step

    def _patched_step(self, *args, **kwargs):
        global _step_count, _first_step_done

        # Resume on first step
        if not _first_step_done:
            _resume_if_needed()
            _first_step_done = True

        result = _original_step(self, *args, **kwargs)
        _step_count += 1

        if _step_count % CHECKPOINT_INTERVAL == 0:
            _save_checkpoint(_step_count)

        return result

    torch.optim.Optimizer.step = _patched_step
    logger.info("Monkey-patches installed on torch.optim.Optimizer")


# ── Main ───────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ml_checkpoint_wrapper.py <script.py> [args...]")
        sys.exit(1)

    script_path = sys.argv[1]
    sys.argv = sys.argv[1:]  # Remove wrapper from argv

    # Install patches before executing student code
    try:
        _install_patches()
    except ImportError:
        logger.warning("torch not available — checkpoint wrapper disabled")

    logger.info(f"Executing student script: {script_path}")

    with open(script_path) as f:
        code = compile(f.read(), script_path, "exec")
        exec(code, {"__name__": "__main__", "__file__": script_path})
