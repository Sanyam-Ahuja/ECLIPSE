# Phase 4 — ML Training + Simulation: DETAILED EXECUTION PLAN

**Goal:** Distributed ML training works (Local SGD on WiFi + DDP on LAN). Physics simulation works with MPI.

---

## Docker Overlay Network (`client/daemon/`)

### 1. `daemon/network_manager.py` — Overlay Network for Inter-Node Comms

**Purpose:** For ML training and simulation jobs, containers must communicate. This manager creates/joins a Docker overlay network that only allows traffic between peer containers and MinIO.

**Key contents:**
```python
class NetworkManager:
    async def setup_overlay(self, job_id: str, peer_nodes: list[str], minio_ip: str):
        """Create or join a Docker overlay network for a job."""
        network_name = f"campugrid_{job_id}"
        
        # If this is the first node for this job, create the network
        # Docker Swarm overlay requires swarm mode OR we use a manual approach:
        # Option A: Docker Swarm (requires swarm init on each node — complex)
        # Option B: WireGuard tunnel between nodes (more control, no swarm needed)
        # Option C: SSH tunnel + Docker bridge per node (simplest for MVP)
        
        # MVP APPROACH (Option C):
        # 1. Server tells each node the IPs of its peers
        # 2. Each node creates a Docker bridge network with known subnet
        # 3. Containers get static IPs within the bridge
        # 4. SSH tunnels forward ports between nodes for MPI/DDP communication
        # 5. iptables rules restrict traffic to only peer IPs + MinIO
        
        # For campus LAN (same subnet), direct IP communication works without tunnels
        
    async def get_peer_addresses(self, job_id: str) -> dict[str, str]:
        """Get IP:port mapping for all nodes in this job."""
        # Query server for all nodes assigned to chunks of this job
        # Return: {"rank_0": "192.168.1.50:29500", "rank_1": "192.168.1.52:29500", ...}
    
    async def teardown(self, job_id: str):
        """Clean up network after job completes."""
        # Remove Docker network, close tunnels
```

**Design decision:** For MVP, use direct IP communication on campus LAN. SSH tunnels for cross-subnet. Full Docker Swarm overlay is V2.

---

## Auto-Checkpoint Injection (`server/docker/wrappers/`)

### 2. `docker/wrappers/ml_checkpoint_wrapper.py` — Monkey-Patch PyTorch

**Purpose:** Runs BEFORE the student's training script. Patches PyTorch to automatically save checkpoints every N optimizer steps. Student never modifies their code.

**Key contents:**
```python
"""
CampuGrid Auto-Checkpoint Wrapper
Loaded before student's script. Monkey-patches torch.optim.Optimizer.step()
to auto-save model + optimizer state every CHECKPOINT_INTERVAL steps.
"""
import os, sys, glob, json, time
import torch

CHECKPOINT_INTERVAL = int(os.environ.get("CAMPUGRID_CHECKPOINT_INTERVAL", "100"))
CHECKPOINT_PATH = os.environ.get("CAMPUGRID_CHECKPOINT_PATH", "/output/checkpoints/")
RESUME_FROM = os.environ.get("CAMPUGRID_RESUME_CHECKPOINT", "")  # path to resume from

os.makedirs(CHECKPOINT_PATH, exist_ok=True)

# Track all nn.Module instances created
_tracked_models = []
_tracked_optimizers = []
_step_count = 0

# --- Monkey-patch nn.Module.__init__ to track models ---
_original_module_init = torch.nn.Module.__init__
def _patched_module_init(self, *args, **kwargs):
    _original_module_init(self, *args, **kwargs)
    # Only track top-level models (not submodules)
    # Heuristic: track if it has parameters and isn't already inside a tracked model
    if not any(self is m or any(p is q for p in self.parameters() for q in m.parameters()) for m in _tracked_models if hasattr(m, 'parameters')):
        pass  # Will be tracked when optimizer is created
torch.nn.Module.__init__ = _patched_module_init

# --- Monkey-patch Optimizer.__init__ to track optimizers ---
_original_optim_init = torch.optim.Optimizer.__init__
def _patched_optim_init(self, params, *args, **kwargs):
    _original_optim_init(self, params, *args, **kwargs)
    _tracked_optimizers.append(self)
    # Find the model these params belong to
    for obj in gc.get_objects():
        if isinstance(obj, torch.nn.Module) and obj not in _tracked_models:
            model_params = set(id(p) for p in obj.parameters())
            optim_params = set(id(p) for group in self.param_groups for p in group['params'])
            if model_params & optim_params:  # overlap
                _tracked_models.append(obj)
torch.optim.Optimizer.__init__ = _patched_optim_init

# --- Monkey-patch Optimizer.step to auto-checkpoint ---
_original_step = torch.optim.Optimizer.step
def _patched_step(self, *args, **kwargs):
    global _step_count
    result = _original_step(self, *args, **kwargs)
    _step_count += 1
    
    if _step_count % CHECKPOINT_INTERVAL == 0:
        _save_checkpoint(_step_count)
    
    return result
torch.optim.Optimizer.step = _patched_step

def _save_checkpoint(step: int):
    """Save all tracked models and optimizers."""
    checkpoint = {
        "step": step,
        "timestamp": time.time(),
        "models": {},
        "optimizers": {},
    }
    for i, model in enumerate(_tracked_models):
        checkpoint["models"][f"model_{i}"] = model.state_dict()
    for i, opt in enumerate(_tracked_optimizers):
        checkpoint["optimizers"][f"optimizer_{i}"] = opt.state_dict()
    
    path = os.path.join(CHECKPOINT_PATH, f"checkpoint_step_{step}.pt")
    torch.save(checkpoint, path)
    
    # Keep only last 3 checkpoints to save disk
    old_checkpoints = sorted(glob.glob(os.path.join(CHECKPOINT_PATH, "checkpoint_step_*.pt")))[:-3]
    for old in old_checkpoints:
        os.remove(old)

def _resume_if_needed():
    """Resume from checkpoint if CAMPUGRID_RESUME_CHECKPOINT is set."""
    if not RESUME_FROM:
        return
    checkpoint = torch.load(RESUME_FROM, map_location="cpu")
    for i, model in enumerate(_tracked_models):
        if f"model_{i}" in checkpoint["models"]:
            model.load_state_dict(checkpoint["models"][f"model_{i}"])
    for i, opt in enumerate(_tracked_optimizers):
        if f"optimizer_{i}" in checkpoint["optimizers"]:
            opt.load_state_dict(checkpoint["optimizers"][f"optimizer_{i}"])
    global _step_count
    _step_count = checkpoint["step"]

# Auto-resume is called after model+optimizer are created
# We hook into the first optimizer.step() call:
_first_step_done = False
_original_step_resume = torch.optim.Optimizer.step
def _patched_step_with_resume(self, *args, **kwargs):
    global _first_step_done
    if not _first_step_done:
        _resume_if_needed()
        _first_step_done = True
    return _patched_step(self, *args, **kwargs)
torch.optim.Optimizer.step = _patched_step_with_resume

# --- Now exec the student's script ---
if __name__ == "__main__":
    script_path = sys.argv[1]
    sys.argv = sys.argv[1:]  # Remove wrapper from argv
    with open(script_path) as f:
        exec(compile(f.read(), script_path, "exec"))
```

### 3. `docker/wrappers/entrypoint_wrapper.sh` — Container Entrypoint

```bash
#!/bin/bash
set -e

# Copy checkpoint wrapper into Python path
export PYTHONPATH="/campugrid:$PYTHONPATH"

# If ML job → run through wrapper
if [ "$CAMPUGRID_JOB_TYPE" = "ml_training" ]; then
    python -u /campugrid/ml_checkpoint_wrapper.py "$@"
else
    # Non-ML jobs → run directly
    exec "$@"
fi
```

---

## ML Training — Local SGD (`server/docker/wrappers/`)

### 4. `docker/wrappers/local_sgd_wrapper.py` — Periodic Weight Averaging

**Purpose:** For Standard-tier ML training (WiFi). Each node trains independently for N steps, then syncs model weights with all peers via simple HTTP/socket exchange.

**Key contents:**
```python
"""
Local SGD Wrapper — trains independently, syncs every SYNC_INTERVAL steps.
Much less network traffic than DDP. Works over WiFi.
"""
import os, torch, requests, json

SYNC_INTERVAL = int(os.environ.get("CAMPUGRID_SYNC_INTERVAL", "100"))  # steps between syncs
PEER_ADDRESSES = json.loads(os.environ.get("CAMPUGRID_PEERS", "[]"))    # ["ip:port", ...]
NODE_RANK = int(os.environ.get("CAMPUGRID_RANK", "0"))
WORLD_SIZE = int(os.environ.get("CAMPUGRID_WORLD_SIZE", "1"))

class LocalSGDSynchronizer:
    """Handles periodic weight averaging between nodes."""
    
    def __init__(self):
        self.sync_server = start_sync_server(port=29500 + NODE_RANK)
    
    def should_sync(self, step: int) -> bool:
        return step % SYNC_INTERVAL == 0 and WORLD_SIZE > 1
    
    def average_weights(self, model: torch.nn.Module):
        """Collect weights from all peers, compute average, apply."""
        my_state = {k: v.cpu() for k, v in model.state_dict().items()}
        
        # Send my weights to all peers, receive theirs
        peer_states = [my_state]
        for peer in PEER_ADDRESSES:
            if peer != f"{MY_IP}:{MY_PORT}":
                peer_state = self.request_weights(peer)
                peer_states.append(peer_state)
        
        # Average all weights
        avg_state = {}
        for key in my_state:
            avg_state[key] = torch.stack([s[key] for s in peer_states]).mean(dim=0)
        
        model.load_state_dict(avg_state)
    
    def request_weights(self, peer_address: str) -> dict:
        """HTTP request to get peer's current weights."""
        # POST to peer's sync server, receive serialized state_dict
    
    def serve_weights(self, model: torch.nn.Module):
        """Serve current weights to requesting peers."""
        # HTTP endpoint that returns serialized state_dict

# Integration: monkey-patch Optimizer.step to call sync check
_sync = LocalSGDSynchronizer()
# After every SYNC_INTERVAL steps, call _sync.average_weights(model)
```

**Network requirement:** Each container in a Local SGD job needs:
- Port 29500+rank exposed
- HTTP access to peer containers (via overlay network)
- MinIO access for checkpoints

---

## ML Training — DDP (`server/app/scheduler/`)

### 5. DDP Orchestration (additions to `scheduler/dispatcher.py`)

**Purpose:** For Premium-tier ML training (LAN only). Launch `torchrun` across multiple nodes simultaneously.

**Key additions:**
```python
async def dispatch_ddp_job(job_id: str, chunks: list[ChunkSpec], nodes: list[NodeInfo]):
    """Coordinate multi-node DDP launch."""
    world_size = len(nodes)
    master_node = nodes[0]  # rank 0 = master
    master_addr = master_node.ip_address
    master_port = 29500  # PyTorch default
    
    for rank, (chunk, node) in enumerate(zip(chunks, nodes)):
        ddp_env = {
            "MASTER_ADDR": master_addr,
            "MASTER_PORT": str(master_port),
            "WORLD_SIZE": str(world_size),
            "RANK": str(rank),
            "LOCAL_RANK": "0",  # 1 GPU per node
            "CAMPUGRID_JOB_TYPE": "ml_training",
            "CAMPUGRID_SYNC_MODE": "ddp",
        }
        chunk.spec["env_vars"].update(ddp_env)
        chunk.spec["network_mode"] = "campugrid_overlay"
        chunk.spec["command"] = f"torchrun --nproc_per_node=1 --nnodes={world_size} --node_rank={rank} --master_addr={master_addr} --master_port={master_port} {chunk.spec['user_script']}"
        
        await dispatch_to_node(node.id, chunk)
    
    # All nodes must start within 60s of each other (torchrun timeout)
```

**LAN detection** (additions to `scheduler/matcher.py`):
```python
def is_lan_peer(node_a: NodeInfo, node_b: NodeInfo) -> bool:
    """Check if two nodes are on the same LAN (same /24 subnet)."""
    subnet_a = ".".join(node_a.ip_address.split(".")[:3])
    subnet_b = ".".join(node_b.ip_address.split(".")[:3])
    return subnet_a == subnet_b

def find_lan_cluster(nodes: list[NodeInfo], min_size: int) -> list[NodeInfo] | None:
    """Find a group of min_size nodes all on the same LAN."""
    from collections import Counter
    subnets = Counter(".".join(n.ip_address.split(".")[:3]) for n in nodes)
    for subnet, count in subnets.most_common():
        if count >= min_size:
            return [n for n in nodes if n.ip_address.startswith(subnet)]
    return None
```

---

## ML Assembler

### 6. `assembler/ml_assembler.py` — Final Model Weights + Training Curves

**Key contents:**
```python
@celery.task(name="assembler.assemble_ml")
async def assemble_ml(job_id: str):
    """Select best model weights and extract training curves."""
    # For Local SGD: all nodes should have synchronized weights at the end
    #   → Take weights from rank 0 (or the node that finished last)
    # For DDP: all nodes have identical weights
    #   → Take weights from rank 0
    
    # 1. Download final checkpoint from rank 0's output
    # 2. Download training logs (stdout captured by daemon) from all nodes
    # 3. Parse logs to extract loss values per epoch/step
    # 4. Generate training curve data: [{epoch: 1, loss: 0.45, lr: 0.001}, ...]
    # 5. Upload: final_model.pt, training_curve.json to MinIO
    # 6. Generate presigned URLs
    # 7. Update job: status=completed
```

---

## Simulation Pipeline

### 7. Simulation Splitter (additions to `pipeline/splitter.py`)

```python
async def split_simulation(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Domain decomposition using OpenFOAM decomposePar or equivalent."""
    if profile.framework == "openfoam":
        # 1. Upload case directory to MinIO
        # 2. Run decomposePar on server to determine subdomains
        #    (this is a lightweight pre-processing step, not the actual simulation)
        # 3. Create chunk per subdomain
        # Each chunk gets: its subdomain data + env vars for MPI rank
    elif profile.framework == "lammps":
        # LAMMPS spatial decomposition via -partition flag
    elif profile.framework == "gromacs":
        # GROMACS domain decomposition via -dd flag
```

### 8. `assembler/sim_assembler.py` — Domain Reconstruction

```python
@celery.task(name="assembler.assemble_simulation")
async def assemble_simulation(job_id: str):
    """Reconstruct simulation results from subdomains."""
    # For OpenFOAM: run reconstructPar to merge subdomains
    # For LAMMPS: merge trajectory files
    # For GROMACS: merge trajectory files (.trr, .xtc)
    # Upload merged results to MinIO
```

---

## Docker Images to Build

### 9. Docker images for Phase 4

**`server/docker/images/pytorch-cuda12/Dockerfile`**
```dockerfile
FROM nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install torch==2.2.0 torchvision==0.17.0 torchaudio==2.2.0 \
    numpy==1.26.4 pandas==2.2.0 scikit-learn==1.4.0 matplotlib==3.8.3 \
    pillow==10.2.0 tqdm==4.66.1 tensorboard==2.16.2
COPY wrappers/ml_checkpoint_wrapper.py /campugrid/
COPY wrappers/local_sgd_wrapper.py /campugrid/
COPY wrappers/entrypoint_wrapper.sh /campugrid/
RUN chmod +x /campugrid/entrypoint_wrapper.sh
WORKDIR /workspace
ENTRYPOINT ["/campugrid/entrypoint_wrapper.sh"]
```

**`server/docker/images/openfoam/Dockerfile`**
```dockerfile
FROM opencfd/openfoam-default:2312
# OpenFOAM official image includes MPI
WORKDIR /workspace
```

**Also build:** `tensorflow-gpu`, `jax-gpu`, `lammps-gpu`, `gromacs-gpu`

---

## ML Sync Mode Selection & Pricing

### Updates to existing files:

**`api/v1/jobs.py`** — Add sync mode parameter:
```python
@router.post("/jobs")
async def submit_job(
    files: list[UploadFile],
    ml_sync_mode: str | None = Form(None),  # "standard" (Local SGD) or "premium" (DDP)
    ...
):
    # If ML job and sync_mode == "premium":
    #   - Verify enough LAN nodes available
    #   - Price at 1.5x base rate
    # If ML job and sync_mode == "standard" (or None):
    #   - Any nodes OK
    #   - Price at 1.0x base rate
```

**`utils/gpu_benchmarks.py`** — Add sync mode pricing:
```python
ML_SYNC_MULTIPLIER = {
    "local_sgd": 1.0,   # Standard — any network
    "ddp": 1.5,          # Premium — LAN only, better convergence
}
```

---

## Phase 4 Completion Test

**ML Training test:**
1. Submit a PyTorch MNIST training script + MNIST dataset
2. Pipeline detects → PyTorch ML training → catalog hit
3. User selects "Standard" (Local SGD)
4. Dataset splits into 2 shards
5. 2 contributor nodes each get: full model + 1 shard
6. Nodes train independently for 100 steps, then sync weights
7. After training: final model weights + training_curve.json returned
8. Verify: model accuracy is reasonable (~95%+ on MNIST)

**Fault + Checkpoint test:**
9. Start ML training, kill a node mid-training
10. Watchdog detects → rescues chunk
11. New node loads from auto-saved checkpoint → resumes
12. Training completes, loss curve shows no regression

**Simulation test:**
13. Submit a simple OpenFOAM cavity case
14. Domain decomposed into 2 subdomains
15. MPI communication between containers via overlay network
16. Simulation completes → domains reconstructed → results returned
