# Phase 2 — AI Pipeline + Rendering: DETAILED EXECUTION PLAN

**Goal:** Drag a `.blend` file → system detects, splits, dispatches to a node, renders, assembles video.

---

## Pipeline Components (`server/app/pipeline/`)

### 1. `pipeline/detector.py` — Magic Bytes & File Type Detection

**Purpose:** Step 1 of pipeline. Read first 16 bytes of every uploaded file, match against known signatures, cross-check with file extension.

**Key contents:**
```python
MAGIC_SIGNATURES = {
    b'BLENDER':          'blender',
    b'PK\x03\x04':       'zip_based',    # .c4d, .docx, .zip
    b'\x89PNG\r\n':      'png',
    b'%PDF':             'pdf',
    b'RIFF':             'riff',          # .avi, .wav
    b'\x1f\x8b':         'gzip',         # .gz, .tar.gz
    b'\x7fELF':          'elf',           # Linux binary
    b'GIF8':             'gif',
}

EXTENSION_MAP = {
    '.blend': 'blender',
    '.py': 'python_script',
    '.csv': 'csv_data',
    '.parquet': 'parquet_data',
    '.tar.gz': 'gzip',
    '.zip': 'zip_based',
    # ... etc
}

class FileDetection:
    file_type: str          # 'blender', 'python_script', 'csv_data', etc.
    magic_match: str        # what magic bytes said
    extension_match: str    # what extension said
    confidence: float       # 1.0 if both agree, 0.7 if only one matches
    is_valid: bool          # False if magic and extension contradict

async def detect_file(file_path: str, filename: str) -> FileDetection
```

**Inputs:** File path in MinIO (already uploaded), original filename
**Outputs:** `FileDetection` object
**Edge cases:** ZIP-based formats (.c4d is ZIP internally) → unzip in memory, inspect manifest

---

### 2. `pipeline/analyzer.py` — Deep Content Analysis

**Purpose:** Step 2. Analyze file contents to extract workload-specific metadata WITHOUT executing any code.

**Key contents:**
```python
# --- Blend file analysis ---
async def analyze_blend(file_path: str) -> BlendProfile:
    """Uses blend_file_reader to parse binary .blend format."""
    # Extracts: frame_start, frame_end, render_engine (CYCLES/EEVEE),
    # use_gpu, scene complexity estimate, resolution
    # Returns: BlendProfile with all render metadata

# --- Python script analysis ---
async def analyze_python(source: str) -> PythonProfile:
    """AST parsing — safe, no code execution."""
    # 1. Parse imports → detect framework (torch, tensorflow, jax, sklearn, cv2)
    # 2. Detect GPU usage: .cuda(), .to('cuda'), device='cuda'
    # 3. Estimate model params (heuristic from nn.Linear/nn.Conv2d layer sizes)
    # 4. Find dataset loading line (pd.read_csv, torch.utils.data.DataLoader)
    # 5. Detect if training loop exists (for epoch in..., model.train())
    # Returns: PythonProfile with framework, gpu_needed, vram_estimate, etc.

# --- CSV/data file analysis ---
async def analyze_data(file_path: str) -> DataProfile:
    """Read header + estimate row count from file size."""
    # Returns: DataProfile with columns, estimated_rows, file_size

# --- Dispatcher ---
async def analyze_files(files: list[UploadedFile]) -> JobProfile:
    """Route to correct analyzer based on detection result."""
    # Calls detector first, then routes to analyze_blend / analyze_python / etc.
    # Returns unified JobProfile
```

**Key type:**
```python
@dataclass
class JobProfile:
    type: str               # 'render', 'data', 'ml_training', 'simulation'
    framework: str | None   # 'pytorch', 'blender', 'openfoam', etc.
    gpu_required: bool
    resources: Resources    # vram_gb, ram_gb, cpu_cores needed per chunk
    split_params: dict      # type-specific: {frame_start, frame_end} or {file_size, row_count}
    confidence: float       # how sure we are about this profile
```

---

### 3. `pipeline/catalog.py` — Tier 1 Pre-Defined Docker Configs

**Purpose:** Step 3. Look up the analyzed profile against hand-crafted, tested Docker configs. This is the fast path — 90%+ of jobs.

**Key contents:**
```python
@dataclass
class CatalogEntry:
    image: str                          # e.g. "campugrid/blender:4.1-cycles"
    entrypoint_template: str            # with {INPUT}, {CHUNK_START}, etc. placeholders
    env_vars: list[str]                 # expected env vars
    gpu_required: bool
    preinstalled_packages: list[str]    # version-pinned packages in the image
    tested: bool                        # has integration tests

CATALOG: dict[tuple, CatalogEntry] = {
    ("render", "blender", True): CatalogEntry(...),
    ("render", "blender", False): CatalogEntry(...),  # EEVEE CPU
    ("render", "luxcore", True): CatalogEntry(...),
    ("ml_training", "pytorch", True): CatalogEntry(...),
    ("ml_training", "pytorch", False): CatalogEntry(...),
    ("ml_training", "tensorflow", True): CatalogEntry(...),
    ("ml_training", "jax", True): CatalogEntry(...),
    ("data", "python", False): CatalogEntry(...),
    ("data", "pyspark", False): CatalogEntry(...),
    ("simulation", "openfoam", False): CatalogEntry(...),
    ("simulation", "lammps", True): CatalogEntry(...),
    ("simulation", "gromacs", True): CatalogEntry(...),
    ("cv", "opencv", True): CatalogEntry(...),
}

async def lookup(profile: JobProfile) -> CatalogEntry | None:
    """Returns matching CatalogEntry or None (triggers Tier 2/3)."""

async def check_missing_deps(entry: CatalogEntry, user_imports: set[str]) -> set[str]:
    """Returns set of packages user needs but aren't pre-installed."""
```

---

### 4. `pipeline/splitter.py` — Chunk Computation

**Purpose:** Step 6. Given a JobProfile and available node count, compute chunk boundaries.

**Key contents:**
```python
def split_render(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Frame-range parallelism. Each chunk = [start_frame, end_frame]."""
    # E.g., 300 frames / 4 nodes = chunks of 75 frames each
    # Returns: [{chunk_start: 1, chunk_end: 75}, {chunk_start: 76, chunk_end: 150}, ...]

def split_data(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Byte-range sharding. Each chunk = [byte_offset_start, byte_offset_end]."""
    # Reads file header to find clean row boundaries
    # Returns chunks with byte ranges

def split_ml(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Dataset row sharding for data parallelism."""
    # Each chunk = [row_start, row_end]
    # All nodes get full model, different data shards

def split_simulation(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Domain decomposition wrapper (calls OpenFOAM decomposePar or equivalent)."""
    # Returns: chunk per subdomain

def compute_chunks(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Router — picks correct splitter based on profile.type."""

@dataclass
class ChunkSpec:
    chunk_index: int
    chunk_start: int | float
    chunk_end: int | float
    command: str                # Full command to run inside container
    env_vars: dict[str, str]    # CHUNK_START, CHUNK_END, OUTPUT_PATH, etc.
    resources: Resources        # per-chunk resource requirements
```

---

### 5. `pipeline/orchestrator.py` — Full Pipeline Coordinator

**Purpose:** Celery task that chains the entire pipeline. Called when a job is submitted.

**Key contents:**
```python
@celery.task(name="pipeline.analyze_and_dispatch")
async def analyze_and_dispatch(job_id: str, user_id: str):
    """Full pipeline: detect → analyze → catalog → split → queue → dispatch."""
    
    # 1. Get uploaded files from MinIO
    # 2. Run detector on each file → FileDetection
    # 3. Run analyzer → JobProfile
    # 4. Broadcast to customer via WS: detection steps (live animation)
    # 5. Catalog lookup → CatalogEntry or None
    # 6. If None → Tier 2 (verifier) or Tier 3 (generator) [Phase 3]
    # 7. If missing deps → Tier 2 verify & adapt [Phase 3]
    # 8. Compute chunks → list[ChunkSpec]
    # 9. Write chunks to Postgres (status=pending)
    # 10. Push chunk IDs to Redis queue
    # 11. Update job status to 'queued'
    # 12. Trigger scheduler for each chunk (event-driven)
    # 13. Broadcast to customer: {status: "queued", chunks: N, estimated_minutes: X}
```

**WS messages emitted during pipeline (streamed to customer):**
```python
{"step": "detecting", "detail": "Reading file format..."}
{"step": "detecting", "detail": "Detected Blender scene (.blend)"}
{"step": "analyzing", "detail": "Parsing render settings..."}
{"step": "analyzing", "detail": "Frame range 1–300, Cycles renderer, GPU enabled"}
{"step": "catalog", "detail": "Selecting container image: campugrid/blender:4.1-cycles"}
{"step": "splitting", "detail": "Splitting into 4 chunks of 75 frames each"}
{"step": "estimating", "detail": "Estimated cost: $1.92, time: ~47 minutes"}
{"step": "queued", "chunks": 4, "estimated_minutes": 47, "cost": 1.92}
```

---

## Scheduler (`server/app/scheduler/`)

### 6. `scheduler/matcher.py` — Event-Driven Node Matching

**Purpose:** Match chunks to nodes. Fires ON EVENTS (chunk queued, node becomes available), NOT on a timer.

**Key contents:**
```python
def score_node(node: NodeInfo, chunk: ChunkSpec) -> float:
    """Score a node for a chunk. Higher = better match."""
    # image_cached * 50 (biggest bonus — saves 3-5 min pull time)
    # + reliability * 30
    # + bandwidth * 0.1
    # + proximity bonus (same subnet for DDP jobs)

def find_best_match(chunk: ChunkSpec, available_nodes: list[NodeInfo]) -> NodeInfo | None:
    """Filter by resource requirements, score remaining, return best."""
    # Filter: vram >= required, ram >= required, cpu >= required, cuda >= min_cuda
    # Score remaining candidates
    # Return highest score or None

@celery.task(name="scheduler.dispatch_chunk")
async def dispatch_chunk(chunk_id: str):
    """Triggered when a chunk enters the queue. Matches and dispatches."""
    # 1. Get chunk from DB
    # 2. Get available nodes from Redis heartbeat registry
    # 3. Find best match
    # 4. If no match → chunk stays in queue, will retry when node becomes available
    # 5. If match → update Postgres FIRST (chunk.status=assigned, chunk.node_id=X)
    # 6. Mark node busy in Redis
    # 7. Push job spec to node via WebSocket
    # 8. Broadcast to customer: chunk assigned to node

@celery.task(name="scheduler.on_node_available")
async def on_node_available(node_id: str):
    """Triggered when a node heartbeat shows it's free. Check for pending chunks."""
    # Get pending chunks from Redis (priority queue — rescued first)
    # Try to match this node to any pending chunk
    # If match → call dispatch_chunk
```

---

### 7. `scheduler/dispatcher.py` — Job Spec Delivery to Nodes

**Purpose:** Format and send the actual job specification to a contributor node via WebSocket.

**Key contents:**
```python
@dataclass
class DispatchSpec:
    job_id: str
    chunk_id: str
    image: str                  # Docker image to run
    command: str                # Command to execute inside container
    env_vars: dict[str, str]    # All environment variables
    input_keys: list[str]       # MinIO keys to download
    output_prefix: str          # MinIO prefix for uploads
    resource_limits: Resources  # CPU, RAM, GPU limits for docker run
    network_mode: str           # "none" or "campugrid_overlay"
    checkpoint_config: dict | None  # For ML jobs: interval, path
    timeout_seconds: int        # Max execution time before auto-kill

async def dispatch_to_node(node_id: str, spec: DispatchSpec):
    """Send dispatch spec to node via WebSocket connection manager."""
    # Serialize DispatchSpec → JSON
    # Send via ws_manager.send_to_node(node_id, message)
    # Start timeout timer
```

---

## Assembler (`server/app/assembler/`)

### 8. `assembler/render_assembler.py` — FFmpeg Frame Stitching

**Purpose:** When all render chunks complete, stitch PNG frames into final video.

**Key contents:**
```python
@celery.task(name="assembler.assemble_render")
async def assemble_render(job_id: str):
    """Download all frames from MinIO, run FFmpeg, upload final video."""
    # 1. List all frame PNGs from MinIO: job-outputs/{job_id}/output/frame_*.png
    # 2. Download to temp directory
    # 3. Run FFmpeg: ffmpeg -framerate 24 -i frame_%04d.png -c:v libx264 -pix_fmt yuv420p output.mp4
    # 4. Upload output.mp4 to MinIO
    # 5. Generate presigned URL (4hr expiry)
    # 6. Update job record: status=completed, output_path, presigned_url
    # 7. Broadcast to customer: {status: "completed", download_url: "..."}
    # 8. Clean up temp directory

async def validate_frame(frame_path: str) -> bool:
    """Check PNG header is valid."""
    # Read first 8 bytes, verify PNG magic: \x89PNG\r\n\x1a\n
```

---

## Contributor Daemon (`client/daemon/`)

### 9. `daemon/agent.py` — Main Entry Point

**Purpose:** Starts all daemon subsystems. This is what Tauri launches as a child process.

**Key contents:**
```python
class CampuGridAgent:
    """Main daemon orchestrator."""
    
    def __init__(self, server_url, node_id, auth_token):
        self.ws_client = WebSocketClient(server_url, node_id, auth_token)
        self.monitor = ResourceMonitor(limits=load_settings())
        self.executor = JobExecutor()
        self.storage = StorageBridge(minio_url, minio_creds)
        self.heartbeat = HeartbeatManager(self.ws_client, self.monitor)
    
    async def run(self):
        """Start all subsystems concurrently."""
        await asyncio.gather(
            self.ws_client.connect(),           # Persistent WS connection
            self.heartbeat.start(),             # 10s heartbeat loop
            self.monitor.start(),               # Continuous resource monitoring
            self.message_handler(),             # Handle incoming WS messages
        )
    
    async def message_handler(self):
        """Route incoming WS messages to handlers."""
        async for message in self.ws_client.receive():
            if message["type"] == "job_dispatch":
                await self.handle_job(message)
            elif message["type"] == "job_cancel":
                await self.executor.cancel(message["chunk_id"])
    
    async def handle_job(self, dispatch_spec):
        """Full job execution flow."""
        # 1. ACK receipt → server marks chunk "running"
        # 2. Pull Docker image if not cached
        # 3. If network_mode == "none":
        #    a. storage_bridge.prepare_workspace() → download inputs
        #    b. Run container with --network none + volume mount
        #    c. storage_bridge.upload_results() → upload outputs
        # 4. If network_mode == "overlay":
        #    a. network_manager.join_overlay()
        #    b. Run container with --network campugrid_overlay
        # 5. Monitor container (CPU/GPU/temp)
        # 6. On container exit:
        #    a. If exit 0 → report success + output paths
        #    b. If exit != 0 → report failure + stderr logs
        # 7. Clean up workspace
```

---

### 10. `daemon/heartbeat.py` — Resource Reporting

**Purpose:** Send heartbeat every 10 seconds via WebSocket with current resource availability.

**Key contents:**
```python
class HeartbeatManager:
    async def start(self):
        while True:
            resources = self.monitor.get_current()
            await self.ws_client.send({
                "type": "heartbeat",
                "node_id": self.node_id,
                "available": not self.executor.is_busy,
                "resources": {
                    "cpu_cores": resources.free_cpu_cores,
                    "ram_gb": resources.free_ram_gb,
                    "gpu_vram_gb": resources.free_vram_gb,
                    "gpu_model": resources.gpu_model,
                    "gpu_cuda_version": resources.cuda_version,
                    "bandwidth_mbps": resources.bandwidth,
                    "cached_images": self.executor.get_cached_images(),
                    "reliability_score": self.reliability_score,
                }
            })
            await asyncio.sleep(10)
```

---

### 11. `daemon/executor.py` — Docker Container Lifecycle

**Purpose:** Run Docker containers for job chunks. Manages the `docker run` subprocess.

**Key contents:**
```python
class JobExecutor:
    is_busy: bool = False
    current_container_id: str | None = None
    
    async def run_chunk(self, spec: DispatchSpec, workspace_path: str) -> ExecutionResult:
        """Run a Docker container for a chunk."""
        # Build docker run command:
        # docker run --rm
        #   --gpus device={gpu_id} (if GPU required)
        #   --memory {ram}g --memory-swap {ram}g
        #   --cpus {cores}
        #   --network {none | campugrid_overlay}
        #   -v {workspace}/input:/input:ro
        #   -v {workspace}/output:/output:rw
        #   -e CHUNK_START=... -e CHUNK_END=... -e JOB_ID=... -e OUTPUT_PATH=/output/
        #   {image}
        #   {command}
        
        # Monitor subprocess:
        # - Capture stdout/stderr for logs
        # - Check exit code
        # - If temperature > 83°C → docker pause → report to server
        # - If user activity spike → docker pause → report to server
    
    async def cancel(self, chunk_id: str):
        """Stop running container."""
        # docker stop {container_id}
    
    def get_cached_images(self) -> list[str]:
        """List Docker images already pulled locally."""
        # docker images --format '{{.Repository}}:{{.Tag}}'
```

---

### 12. `daemon/storage_bridge.py` — MinIO ↔ Local Volume Sync

**Purpose:** For `--network none` containers. Downloads inputs from MinIO to local disk before container starts, uploads outputs after container finishes.

**Key contents:**
```python
class StorageBridge:
    async def prepare_workspace(self, spec: DispatchSpec) -> str:
        """Download inputs from MinIO to local temp directory."""
        workspace = f"/tmp/campugrid/{spec.job_id}/{spec.chunk_id}"
        os.makedirs(f"{workspace}/input", exist_ok=True)
        os.makedirs(f"{workspace}/output", exist_ok=True)
        
        for key in spec.input_keys:
            await self.minio.fget_object("job-inputs", key, f"{workspace}/input/{basename(key)}")
        return workspace
    
    async def upload_results(self, workspace: str, spec: DispatchSpec):
        """Upload outputs from local disk to MinIO."""
        output_dir = f"{workspace}/output"
        for filename in os.listdir(output_dir):
            await self.minio.fput_object(
                "job-outputs",
                f"{spec.job_id}/output/{filename}",
                f"{output_dir}/{filename}"
            )
    
    def cleanup(self, workspace: str):
        shutil.rmtree(workspace, ignore_errors=True)
```

---

### 13. `daemon/ws_client.py` — Persistent WebSocket Client

**Purpose:** Maintains a persistent WebSocket connection to the server. Auto-reconnects on disconnect.

**Key contents:**
```python
class WebSocketClient:
    async def connect(self):
        """Connect to server with auto-reconnect."""
        while True:
            try:
                async with websockets.connect(self.ws_url, extra_headers={"Authorization": f"Bearer {self.token}"}) as ws:
                    self.ws = ws
                    self.connected = True
                    await self._listen()
            except (ConnectionClosed, ConnectionError):
                self.connected = False
                await asyncio.sleep(5)  # Reconnect backoff
    
    async def send(self, message: dict):
        """Send JSON message. Queue if disconnected."""
    
    async def receive(self) -> AsyncGenerator[dict, None]:
        """Yield incoming messages."""
```

---

### 14. `daemon/monitor.py` — CPU/RAM/GPU/Temperature Monitoring

**Purpose:** Continuous resource monitoring using `psutil` + `GPUtil`.

**Key contents:**
```python
class ResourceMonitor:
    def get_current(self) -> ResourceSnapshot:
        """Get current resource availability within user-configured limits."""
        # psutil.cpu_percent(), psutil.virtual_memory()
        # GPUtil.getGPUs() → utilization, memory, temperature
        # Apply user limits (max_cpu%, max_ram, max_gpu%)
        # Return: ResourceSnapshot with free_cpu_cores, free_ram_gb, free_vram_gb, gpu_temp
    
    def is_safe_to_run(self) -> bool:
        """Check if GPU temp is below cutoff and user isn't actively using machine."""
    
    def should_pause(self) -> bool:
        """Check if we should pause current job (temp too high, user active)."""
```

---

## Docker Images

### 15. `server/docker/images/blender-cycles/Dockerfile`

```dockerfile
FROM nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y blender ffmpeg && rm -rf /var/lib/apt/lists/*
# OR download specific Blender version for reproducibility
WORKDIR /workspace
ENTRYPOINT ["blender", "-b"]
```

### 16. Pre-built images to push to local registry

Build and push during Phase 2 setup:
- `campugrid/blender:4.1-cycles`
- `campugrid/python-data:3.11` (for Phase 3 but build early)

---

## Phase 2 Completion Test

**End-to-end test scenario:**
1. Start server + infra (docker compose up)
2. Start 1 contributor daemon (pointing to local server)
3. Daemon registers, heartbeat appears in Redis
4. `POST /api/v1/jobs` with a `.blend` file (simple 10-frame animation)
5. Pipeline detects → analyzes → catalog hit → splits into 2 chunks
6. Scheduler dispatches both chunks to the contributor node
7. Node runs Blender containers (sequentially since 1 node)
8. Frames uploaded to MinIO
9. Assembler FFmpeg stitches → final video in MinIO
10. Job status → completed, presigned URL returned
11. Download video → verify all 10 frames rendered correctly
