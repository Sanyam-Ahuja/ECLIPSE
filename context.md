# CampuGrid — Complete Technical & Product Brief

## What This Is

CampuGrid is a distributed peer-to-peer compute platform that pools idle GPUs and CPUs from student laptops, gaming PCs, and campus lab machines, making that compute accessible to students and eventually external customers who need high-performance computing for ML training, 3D rendering, physics simulations, and large-scale data processing. Think of it as Google Colab meets Airbnb for compute, with an AI pipeline layer that automatically understands what the user's code or file needs and handles everything — splitting, containerising, distributing, fault-recovering — without the user ever touching Docker, cloud configs, or infrastructure.

The system was designed specifically to solve a real campus problem: students with meaningful ML, rendering, and simulation workloads cannot afford cloud compute and their own laptops aren't powerful enough, while simultaneously hundreds of high-spec machines across the same campus sit idle overnight. The platform bridges this gap and extends into a commercial two-sided marketplace as a startup play.

---

## The Core Problem Being Solved

Three distinct pain points drive the need:

**ML training cost:** Google Colab Pro charges $0.41–$4.71 per GPU hour depending on GPU tier. AWS GPU instances range from $3.06/hr (V100) to $4.10/hr (A100). A student running 10 training experiments per week on medium-sized models spends more on compute than on textbooks. Most students downgrade their models or use toy datasets not because their ideas are bad but because they cannot afford to run full experiments.

**3D rendering inaccessibility:** A 300-frame animation render on a student laptop takes 18–40 hours of continuous computation. The machine overheats, cannot be used for anything else, and frequently crashes mid-render losing all progress. Professional render farms require technical setup and charge per GHz-hour. Architecture, design, and game development students regularly submit lower-quality work because of hardware, not skill.

**Idle campus hardware:** A typical university campus has thousands of high-spec machines — RTX 3060s, 3070s, 4080s in gaming laptops, lab PCs with 32GB RAM — that are idle 70%+ of the time. GPU utilisation across campus is under 15%. The compute already exists and is already paid for. It is simply not accessible to the people who need it.

---

## What Makes This Different From Everything That Already Exists

The competitive landscape includes Vast.ai (GPU marketplace, you bring your own Docker image), Salad.com (consumer GPU sharing, no job splitting, no AI pipeline), Hyperbolic (decentralised GPU OS, enterprise-focused), Kinesis (idle compute aggregation, university partnerships), RunPod (GPU cloud, technical users only). AWS, Azure, and Oracle operate datacentre capacity and are structurally incapable of building a peer-to-peer model that would directly cannibalise their own revenue.

Every existing platform requires the customer to know what they're doing — bring a container image, specify resources, handle job splitting yourself. They are infrastructure tools built for engineers.

CampuGrid is the only system where a student drags a `.blend` file or a `train.py` script onto a web UI and gets back a finished result without knowing what Docker is. The AI pipeline — automatic file detection, framework identification, job splitting, container selection or generation, fault-tolerant distributed execution — does not exist in any competitor today. That is the actual differentiator.

The one-line pitch: **"Vast.ai for people who don't know what Vast.ai is."**

The BitTorrent analogy is exact and useful: BitTorrent proved that a distributed network of consumer hardware, properly coordinated, outperforms any single centralised server. It split files into chunks, distributed those chunks across peers, verified each chunk with a hash, and reassembled at the end. CampuGrid does the same thing but instead of chunks of a file, it distributes chunks of a workload. Contributors are seeders. Customers are leechers. The central scheduler is the tracker. The job profile is the `.torrent` file. The critical upgrade over BitTorrent: contributors get paid, so the supply side is financially self-sustaining rather than goodwill-dependent.

---

## The Four Supported Workload Types

### 3D Rendering

Split strategy: frame-level parallelism. Each frame of an animation is completely independent — rendering frame 47 requires no information from frame 46. This is called embarrassingly parallel. A 300-frame animation across 4 nodes becomes [1–75], [76–150], [151–225], [226–300] running simultaneously. Each node runs Blender CLI inside a Docker container: `blender -b project.blend -f 1 -e 75 -o /output/frame_####.png`. All frames write to shared MinIO storage. When all chunks complete, an FFmpeg assembler stitches PNGs into the final video. If a node goes offline mid-render, the system knows exactly which frames it was handling and reassigns that range to another available node. No state to recover. No checkpoint needed. This is the most reliable workload type.

Supported renderers via Docker images: Blender (Cycles, EEVEE), LuxCoreRender, Radeon ProRender. For proprietary software like Cinema 4D or 3ds Max: if the campus has a site license, those tools run on worker nodes legally. If not, the system offers FBX conversion through Blender — detected automatically via ZIP-internal structure analysis of the `.c4d` file.

### Data Processing

Split strategy: dataset sharding. A 10GB CSV file gets split into N equal shards by the ingestion service reading the file header and computing byte offsets for clean row boundaries. Each shard is uploaded to MinIO. Each worker node downloads its shard, runs the student's transform script against it, writes the output shard back to storage. This is the Map step. Once all Map tasks complete, a Reduce step merges all output shards into a single result file. The student's transform script runs identically on every shard — the system does not need to understand what the script does, only that it is stateless (reads shard, processes, writes output, no cross-shard dependencies during Map phase). Fault handling: if a node fails, the shard is still in MinIO; reassign to another node.

### Physics Simulation

Split strategy: domain decomposition. Unlike rendering and data processing, simulation nodes are not independent — they must communicate with their spatial neighbours at every timestep because the physics at the boundary of one subdomain affects the adjacent subdomain. A fluid simulation mesh gets decomposed into N spatial regions using OpenFOAM's `decomposePar` utility (or equivalent for LAMMPS molecular dynamics, GROMACS biomolecular simulation). Each node computes its subdomain, then exchanges boundary values with neighbouring nodes via MPI (Message Passing Interface) before advancing to the next timestep. Network latency matters here — campus WiFi is acceptable for simulations where boundary exchange volume is small relative to per-step computation. Very fine-grained molecular dynamics with tiny timesteps can become communication-bound on WiFi; the scheduler warns the student if this is detected.

Checkpointing: every T seconds of simulation time (configurable, default every 100 timesteps), all nodes pause at the same simulation timestamp, each writes its full field state (pressure, velocity, temperature arrays) to MinIO as `checkpoint_t{N}.tar`. If a node fails, the watchdog reloads the last checkpoint and reassigns the subdomain to a new node, replaying only steps after the last checkpoint.

### ML Training

Split strategy: data parallelism. Every node receives a complete copy of the model weights and a unique shard of the training dataset. Each node runs a full forward pass on its batch, computes gradients, then participates in an all-reduce operation — every node broadcasts its gradient tensor to every other node, receives theirs, and computes the average. After averaging, every node applies the same averaged gradient to update its weights. All nodes are now identical. The next step begins. This is PyTorch DDP (DistributedDataParallel) / `torchrun`. It requires the model to fit in a single node's VRAM. For an RTX 3060 with 8GB VRAM, this covers ResNet-50, small transformers, most CNNs, BERT-base. Models requiring 20GB+ VRAM (large LLMs, large diffusion models) need model parallelism — layer splitting across GPUs — which is a future feature, currently out of scope. Large model inference (running a trained model) is also out of scope for V1 because it requires the entire model loaded in VRAM simultaneously with no clean split.

Checkpointing for ML: the system injects a checkpoint helper module into every ML container. The student calls `from campus_compute import checkpoint` in their training loop. This function serialises `model.state_dict()` and `optimizer.state_dict()` and pushes them to MinIO as `checkpoint_epoch_{N}.pt`. If a node drops during training, the watchdog detects it at the next all-reduce (the missing node simply doesn't respond), the job pauses, reloads the last checkpoint from MinIO, reassigns the data shard to a new node, and resumes. Progress lost is at most one checkpoint interval.

---

## Full System Architecture — Every Component

### The Five Layers

**Layer 1 — Worker nodes (contributor laptops and machines)**

Every contributor runs a lightweight background application. On Windows and Mac, this is packaged as an Electron app with a system tray icon — grey when idle, green when contributing, yellow when paused. The UI is minimal: a toggle, an earnings display, a settings panel for limits (max CPU%, max RAM, max GPU%, schedule, minimum payout threshold).

The actual work is done by a Python daemon running inside the Electron app. The daemon maintains a persistent WebSocket connection to the central server — not HTTP polling, WebSocket — so the server can push jobs to the node instantly rather than the node checking for work. Every 10 seconds the daemon sends a heartbeat:

```python
{
    "type": "heartbeat",
    "node_id": "uuid-assigned-at-registration",
    "available": True,
    "resources": {
        "cpu_cores": 6,              # free cores within contributor's limit
        "ram_gb": 11.2,              # free RAM within contributor's limit
        "gpu_vram_gb": 7.4,          # free VRAM within contributor's limit
        "gpu_model": "RTX 3060",
        "gpu_cuda_version": "12.1",
        "bandwidth_mbps": 94.2,      # measured via 1MB ping to server
        "cached_images": [           # Docker images already pulled locally
            "campus/pytorch:2.2-cuda12",
            "campus/blender:4.1-cycles"
        ],
        "location": "IN",
        "reliability_score": 0.94    # historical job completion rate
    }
}
```

When the server dispatches a chunk, the daemon runs:

```python
subprocess.run([
    "docker", "run",
    "--rm",
    "--gpus", f"device={job['gpu_id']}",
    "--memory", f"{job['ram_gb']}g",
    "--memory-swap", f"{job['ram_gb']}g",   # hard limit, no swap
    "--cpus", str(job['cpu_cores']),
    "--network", "none",                     # zero internet access
    "-v", f"{storage_mount}:/storage:rw",
    "-e", f"CHUNK_START={job['chunk_start']}",
    "-e", f"CHUNK_END={job['chunk_end']}",
    "-e", f"JOB_ID={job['job_id']}",
    "-e", f"CHUNK_ID={job['chunk_id']}",
    "-e", f"OUTPUT_PATH=/storage/jobs/{job['job_id']}/output/",
    "-e", f"MINIO_URL={internal_minio_url}",
    job["image"],
    *job["command"].split()
])
```

`--network none` is the entire security model. The container has zero network access. It cannot call home, cannot scan the host network, cannot access other processes, cannot see the host filesystem beyond its mounted volume. Even a deliberately malicious job submission cannot exfiltrate data or harm the contributor's machine. `--memory-swap` equal to `--memory` means Docker OOM-kills the container rather than swapping to disk, protecting the contributor's machine from grinding to a halt. The contributor's machine security is enforced at the kernel level by Linux namespaces and cgroups — not by trusting the container's code.

Resource monitoring runs in a parallel thread — psutil for CPU/RAM, GPUtil for GPU utilisation and temperature. If GPU temperature exceeds 83°C or the contributor starts using their machine heavily (CPU usage spike on their own processes), the daemon signals Docker to pause the container and reports back to the server, which requeues the chunk.

**Layer 2 — API Gateway**

FastAPI. Single HTTPS entry point for all clients — web app, desktop app, CLI, external API customers. Handles JWT authentication (issued at login, 24-hour expiry, refresh tokens), OAuth2 for campus SSO integration (students log in with their university Google account), multipart file upload, WebSocket upgrade for live job status, Stripe webhooks for billing.

Every job submission is non-blocking. The API saves uploaded files to MinIO, creates a job record in Postgres with status `analyzing`, kicks off the AI pipeline as a background Celery task, and returns a job ID immediately. The customer never waits at the HTTP layer. All subsequent communication is over WebSocket.

```python
@router.post("/jobs")
async def submit_job(
    files: List[UploadFile],
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    job_id = str(uuid4())
    for file in files:
        await minio.upload(
            bucket="job-inputs",
            key=f"{job_id}/{file.filename}",
            data=await file.read()
        )
    background_tasks.add_task(ai_pipeline.analyze_and_dispatch, job_id, user.id)
    return {"job_id": job_id, "status": "analyzing"}
```

**Layer 3 — The AI Pipeline**

This is the core intellectual property of the system. It runs as Celery workers — separate processes consuming tasks from Redis. The full pipeline per job:

*Step 1 — Magic bytes detection*

Read the first 16 bytes of every uploaded file. Match against a signature database:

```python
MAGIC_SIGNATURES = {
    b'BLENDER':          'blender',       # .blend
    b'PK\x03\x04':       'zip_based',    # .c4d, .docx, .zip — all ZIP internally
    b'\x89PNG\r\n':      'png',
    b'%PDF':             'pdf',
    b'RIFF':             'riff',          # .avi, .wav
    b'\x1f\x8b':         'gzip',         # .gz, .tar.gz
}
```

Extension and magic bytes are cross-checked. Mismatch → reject file, notify customer. This cannot be spoofed — magic bytes are in the binary content, not the filename.

For ZIP-based formats (`.c4d` is ZIP internally): unzip in memory, inspect the internal manifest to determine the actual application.

*Step 2 — Deep content analysis*

For `.blend` files: use `blend_file_reader` Python library to parse the binary Blender file format without opening Blender itself. Extract: `frame_start`, `frame_end`, `render_engine` (CYCLES vs EEVEE), `use_gpu`, scene complexity estimate from mesh data. This determines: job type (render), split strategy (frame range), total chunks, estimated VRAM requirement.

For Python scripts: AST (Abstract Syntax Tree) parsing — safe, no code execution:

```python
import ast, re

def analyze_python(source: str) -> FileProfile:
    tree = ast.parse(source)
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split('.')[0])
        if isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module.split('.')[0])

    framework = None
    if 'torch' in imports:          framework = 'pytorch'
    elif 'tensorflow' in imports:   framework = 'tensorflow'
    elif 'jax' in imports:          framework = 'jax'
    elif 'cv2' in imports:          framework = 'opencv'
    elif 'sklearn' in imports:      framework = 'sklearn'

    uses_gpu = bool(re.search(r'\.cuda\(\)|\.to\(["\']cuda|device=["\']cuda', source))
    param_count = estimate_model_params(tree)
    vram_needed = params_to_vram_gb(param_count)  # rough heuristic

    return FileProfile(
        type='ml_training',
        framework=framework,
        uses_gpu=uses_gpu,
        resources=Resources(vram_gb=vram_needed, ram_gb=16, cores=4)
    )
```

The AST scanner also finds the dataset loading line (e.g. `pd.read_csv('data.csv')`) to cross-reference with the uploaded data file size for RAM estimation.

*Step 3 — Catalog lookup*

```python
IMAGE_CATALOG = {
    ('ml_training', 'pytorch',     True):  'campus/pytorch:2.2-cuda12',
    ('ml_training', 'pytorch',     False): 'campus/pytorch:2.2-cpu',
    ('ml_training', 'tensorflow',  True):  'campus/tensorflow:2.15-gpu',
    ('ml_training', 'jax',         True):  'campus/jax:0.4-gpu',
    ('ml_training', 'opencv',      True):  'campus/opencv:4.9-gpu',
    ('render',      'blender',     True):  'campus/blender:4.1-cycles',
    ('simulation',  'openfoam',    False): 'campus/openfoam:11',
    ('simulation',  'lammps',      True):  'campus/lammps:23-gpu',
    ('data',        'generic',     False): 'campus/python-data:3.11',
}
```

Catalog hit (95% of jobs) → go directly to scheduling. Fast path, 30-second job start.

*Step 4 — AI Dockerfile generation (5% of jobs, catalog miss)*

Send the source code and `requirements.txt` to Claude API (claude-sonnet-4-20250514):

```python
prompt = f"""
You are a Dockerfile generator for a GPU compute platform.
Generate a minimal, working Dockerfile for the code below.

STRICT RULES:
- Base: nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04 if GPU detected, else python:3.11-slim
- Pin ALL package versions exactly as specified in requirements.txt
- For OpenCV: apt-get install -y libgl1 libglib2.0-0
- Entrypoint must accept environment variables: CHUNK_START, CHUNK_END, JOB_ID, OUTPUT_PATH
- Output ONLY the Dockerfile. No explanation. No markdown.

requirements.txt:
{requirements_content}

source.py (first 3000 chars):
{source_code[:3000]}
"""

response = await claude_client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1000,
    messages=[{"role": "user", "content": prompt}]
)
dockerfile = response.content[0].text
```

The generated Dockerfile is hashed (SHA-256 of content). If an image with that hash already exists in the registry → skip build, use cached image. If not → trigger Kaniko build. The cache hit rate increases over time as common dependency combinations accumulate.

*Step 5 — Image building with Kaniko*

`docker build` cannot be run on the server to build user-submitted Dockerfiles — Docker-in-Docker requires root/privileged mode which gives the build process host-level access, a critical security hole. Kaniko (by Google) builds container images from Dockerfiles without Docker daemon, without root, as a regular unprivileged process. It reads the build context from MinIO and pushes the result directly to the private registry:

```bash
kaniko \
  --context s3://build-contexts/{hash}/ \
  --destination registry.yourplatform.com/generated/{hash}:latest \
  --cache=true \
  --cache-ttl=168h \
  --compressed-caching \
  --no-push=false
```

Build time: 3–8 minutes first build. With layer caching (same base image, same pip install layer), subsequent similar builds: under 60 seconds.

*Step 6 — Chunk computation*

Based on job type and profile, compute how many chunks and what each chunk covers:

```python
def compute_chunks(profile: JobProfile, available_nodes: int) -> List[Chunk]:
    if profile.type == 'render':
        total_frames = profile.frame_end - profile.frame_start + 1
        chunk_size = ceil(total_frames / available_nodes)
        return [
            Chunk(start=i, end=min(i + chunk_size - 1, profile.frame_end))
            for i in range(profile.frame_start, profile.frame_end + 1, chunk_size)
        ]
    elif profile.type == 'data':
        file_size = minio.get_size(profile.input_key)
        shard_size = file_size // available_nodes
        return compute_byte_range_chunks(profile.input_key, shard_size, available_nodes)
    elif profile.type == 'ml_training':
        dataset_rows = profile.estimated_rows
        rows_per_node = dataset_rows // available_nodes
        return [
            Chunk(start=i * rows_per_node, end=(i+1) * rows_per_node)
            for i in range(available_nodes)
        ]
```

*Step 7 — Queue and dispatch*

All chunks pushed to Redis as a list. Job record written to PostgreSQL with status `queued`, chunk count, resource requirements. WebSocket broadcast to customer: `{status: "queued", chunks: 4, estimated_minutes: 47}`.

**Layer 4 — The Scheduler**

Runs as a Celery beat task every 5 seconds. Reads all pending chunks from Redis. Reads all available nodes from the heartbeat registry (Redis sorted set, nodes sorted by last-seen timestamp — anything not seen in 30 seconds is considered unavailable). Matches chunks to nodes:

```python
def match(self, chunk: dict, nodes: list) -> Node | None:
    req = chunk["resources"]
    candidates = [
        n for n in nodes
        if n.vram_gb       >= req["vram_gb"]
        and n.ram_gb       >= req["ram_gb"]
        and n.cpu_cores    >= req["cores"]
        and n.cuda_version >= req.get("min_cuda", "11.0")
    ]
    if not candidates:
        return None

    def score(node: Node) -> float:
        image_cached   = chunk["image"] in node.cached_images
        reliability    = node.historical_success_rate   # 0.0–1.0
        bandwidth      = node.bandwidth_mbps
        return (
            image_cached * 50 +    # largest bonus — saves 3–5 min pull time
            reliability  * 30 +
            bandwidth    * 0.1
        )

    return max(candidates, key=score)
```

The `image_cached` bonus of 50 points is deliberate and large. If 8 nodes are available and 3 of them already have the PyTorch image pulled, those 3 get heavily preferred. A job that would wait 4 minutes for an image pull starts in 30 seconds on a cache-warm node. Over time, popular images accumulate across the network and the average job start latency drops.

On assignment: node is marked `busy` in Redis, chunk record updated in Postgres with `node_id` and `started_at`, WebSocket push to node agent with the job spec, WebSocket push to customer showing which node their chunk landed on.

**Layer 5 — Storage, State, and Monitoring**

MinIO: S3-compatible object storage, self-hosted on a dedicated server. All files pass through MinIO — job inputs, job outputs, intermediate shards, checkpoints, Docker build contexts, generated Dockerfiles. Bucket structure:

```
job-inputs/{job_id}/{filename}
job-outputs/{job_id}/output/{files}
checkpoints/{job_id}/{chunk_id}/epoch_{N}.pt
build-contexts/{dockerfile_hash}/Dockerfile
```

Customer output files are pre-signed URL accessible — a temporary link (4-hour expiry) generated for the customer to download their results. Contributor nodes access MinIO via an internal FUSE mount that decrypts data on read — the contributor's OS filesystem never sees customer data in plaintext.

PostgreSQL: core relational database. Tables: `users` (customers and contributors, roles), `nodes` (contributor machines, specs, reliability scores, earnings), `jobs` (full job record, status, image, resource requirements), `chunks` (per-chunk state machine, node assignment, timestamps), `billing` (per-chunk compute time, customer charge, contributor credit), `images` (catalog and generated images, content hash, build status).

Redis: job queue (list data structure, FIFO), heartbeat registry (sorted set, scored by timestamp), pub/sub channels for WebSocket event broadcasting, Celery broker for async task queue.

Prometheus + Grafana: every node agent exposes metrics (GPU utilisation %, VRAM used, CPU %, temperature, jobs completed, errors). Prometheus scrapes every 15 seconds. Grafana dashboards show cluster-wide compute utilisation, job throughput, node availability over time, earnings distribution. This is also what the contributor's Electron app queries for their personal dashboard.

---

## Fault Tolerance — The Watchdog System

The JobWatchdog runs continuously, checking every 30 seconds:

```python
class JobWatchdog:
    async def watch_all_running_chunks(self):
        while True:
            await asyncio.sleep(30)
            running_chunks = await db.get_chunks_by_status("running")
            for chunk in running_chunks:
                node = await db.get_node(chunk.node_id)
                time_since_heartbeat = datetime.now() - node.last_heartbeat
                if time_since_heartbeat > timedelta(seconds=90):
                    # 3 missed heartbeats — node presumed offline
                    await self.rescue_chunk(chunk)
                    await db.penalise_node_reliability(node.id, penalty=0.1)

    async def rescue_chunk(self, chunk: Chunk):
        latest_checkpoint = await minio.get_latest_checkpoint(
            f"checkpoints/{chunk.job_id}/{chunk.chunk_id}/"
        )
        resume_from = latest_checkpoint.epoch if latest_checkpoint else None
        resume_start = latest_checkpoint.progress if latest_checkpoint else chunk.original_start

        await redis.lpush("job_queue", json.dumps({
            **chunk.to_dict(),
            "resume_from_checkpoint": latest_checkpoint.path if latest_checkpoint else None,
            "chunk_start": resume_start,
            "priority": "high"   # rescued chunks jump the queue
        }))
        await db.update_chunk(chunk.id, status="requeued", node_id=None)
        await websocket.broadcast(f"job:{chunk.job_id}", {
            "event": "chunk_rescued",
            "chunk_id": chunk.chunk_id,
            "lost_progress": f"Resuming from checkpoint at step {resume_from}" if resume_from
                             else "No checkpoint — restarting chunk from beginning"
        })
```

Node reliability scores degrade with failures and recover with successes. A node that frequently goes offline gets a lower reliability score and the scheduler deprioritises it for long jobs while still using it for short rendering chunks where a failure costs little.

---

## The Pricing and Earnings Engine

All pricing is GPU-normalised. The baseline is the Tesla T4 (what Colab uses, well-understood performance). Every other GPU is scored relative to T4:

```python
GPU_BENCHMARKS = {
    "Tesla T4":       (8.1,  16, 70),    # (fp32_tflops, vram_gb, power_watts)
    "RTX 3060":       (12.7,  8, 170),
    "RTX 3070":       (20.3,  8, 220),
    "RTX 3080":       (29.7, 10, 320),
    "RTX 3090":       (35.6, 24, 350),
    "RTX 4060":       (15.1,  8, 115),
    "RTX 4070":       (29.1, 12, 200),
    "RTX 4080":       (48.7, 16, 320),
    "RTX 4090":       (82.6, 24, 450),
    "A100 40GB":      (77.9, 40, 400),
}

BASE_PRICE_PER_TFLOP_HOUR = 0.075  # USD — calibrated so T4 = $0.61/hr matching Colab
CUSTOMER_DISCOUNT = 0.50           # customer pays 50% of equivalent Colab price
CONTRIBUTOR_SHARE = 0.72           # 72% of customer payment to contributor
PLATFORM_CUT      = 0.28           # 28% platform margin

def customer_price_per_hour(gpu_model: str) -> float:
    tflops = GPU_BENCHMARKS[gpu_model][0]
    return round(tflops * BASE_PRICE_PER_TFLOP_HOUR * CUSTOMER_DISCOUNT, 3)

def contributor_net_per_hour(gpu_model: str) -> float:
    gross = customer_price_per_hour(gpu_model) * CONTRIBUTOR_SHARE
    power_watts = GPU_BENCHMARKS[gpu_model][2]
    electricity_cost = (power_watts / 1000) * 0.096  # $0.096/kWh India average
    return round(gross - electricity_cost, 3)
```

Results: RTX 3060 customer price $0.48/hr (vs Colab T4 equivalent $0.61/hr for less power). RTX 3060 contributor earns $0.33/hr net of electricity = ₹27.5/hr. 10 idle hours/day = ₹275/day = ₹8,250/month. RTX 4090 customer price $3.10/hr (vs Colab A100 at $1.30/hr but A100 is faster for large batch — comparable wall-clock time cost). RTX 4090 contributor earns ₹190/hr net.

Dynamic pricing engine adjusts in real time based on supply (available node count for a GPU tier) and demand (queue depth for that tier):

```python
def dynamic_multiplier(gpu_model: str) -> float:
    available = node_registry.count_available(gpu_model)
    total = node_registry.count_total(gpu_model)
    supply_ratio = available / max(total, 1)
    queue_depth = job_queue.count_waiting_for_tier(gpu_model)

    if supply_ratio > 0.5 and queue_depth < 5:  return 0.90  # surplus discount
    elif supply_ratio > 0.2:                     return 1.00  # normal
    elif queue_depth > 20:                       return 1.50  # high demand
    else:                                        return 2.00  # scarcity surge
```

The customer UI shows a live price comparison before they confirm any job:

```
Your job: PyTorch training, RTX 3060-tier, estimated 4 GPU-hours

                      Cost      Notes
Google Colab Pro    $2.44     disconnects randomly, shared queue
Google Colab A100   $5.20     waitlist, managed by Google
RunPod RTX 3080     $1.76     you manage infra, no auto-splitting
AWS p3.2xl          $12.24    you manage infra, full cloud setup

CampuGrid           $1.92     fault tolerant, auto-split, managed

You save 68% vs Colab Pro, 84% vs AWS
```

---

## Security Model — End to End

Every container: `--network none` (no internet), cgroup resource caps (cannot exceed allocated CPU/RAM/GPU), separate Linux namespaces (cannot see host processes or other containers), read-only input mount (cannot tamper with other jobs' inputs), write access only to its own output path.

Customer data: encrypted at rest in MinIO (AES-256). The FUSE mount on contributor nodes decrypts on read at the kernel level — the contributor's OS filesystem, file manager, and any other process never sees plaintext customer data.

Node authentication: every contributor node receives a signed certificate at registration (asymmetric key pair, certificate signed by platform CA). Server only dispatches jobs to nodes with valid certificates. Certificates can be revoked for misbehaving nodes.

Job output verification: for rendering jobs, each completed frame is checked for valid PNG header before being accepted. For ML jobs, the checkpoint file format is validated. Corrupted or missing output triggers chunk rescue.

Rate limiting on API: per-user job submission rate limited at the API gateway. Prevents abuse of free tier or DoS via job spam.

---

## The Customer Web Application (Next.js)

Three core screens:

**Submit:** Drag-and-drop file upload zone. As files upload, the AI pipeline runs and streams detection results back via WebSocket. The UI animates through detection steps: "Reading file format... Detected Blender scene... Parsing render settings... Frame range 1–300 detected... Selecting container image... Estimating resources..." The customer watches the system thinking. When detection completes, a job profile card appears showing detected type, selected image, estimated cost, estimated time, number of chunks, resource requirements, and confidence score. If confidence < 80%, an edit mode lets the customer correct the profile before dispatching.

**Monitor:** Live job dashboard. Each chunk rendered as a card showing: the assigned node (anonymised — "Node #7, RTX 3070, Mumbai"), a real-time GPU utilisation bar, current step/frame, progress percentage, estimated time remaining. If a node goes offline, the card animates to a "Reassigning..." state and a new card appears when the chunk lands on a replacement node. The customer watches the system healing itself in real time — this is the most powerful live demonstration of fault tolerance.

**Results:** When all chunks report complete and the assembler finishes, output files appear. For rendering: a preview video plays inline. For ML training: the model weights are available as a download alongside an auto-generated training curve chart (loss vs epoch, from the logs the container emitted to stdout, captured and stored by the agent). For data processing: the merged output file download.

---

## The Contributor Electron Application

System tray app. Four states visible from tray icon: offline (not running), standby (running but no jobs), contributing (job active), paused (job paused by user or by owner's machine load).

**Dashboard tab:** Current earnings session — jobs completed, GPU-hours contributed, gross earned, electricity cost, net earnings. This month total, lifetime total. Current rate (₹/hr) based on GPU model and dynamic pricing.

**Settings tab:** Max CPU% (slider), Max RAM (slider), Max GPU% (slider), GPU temperature safety cutoff (default 83°C), schedule (contribute only between set hours), minimum payout threshold before bank transfer, payment method (UPI ID, bank account).

**History tab:** Every job the node contributed to, with duration, GPU-hours, earnings per job. The contributor can see what types of workloads their machine ran (rendered frames, ML training shards, etc.) but not the contents of customer files.

**Leaderboard tab:** Campus rankings by compute contributed this month. The gamification layer.

---

## The Two Monetization Options for Contributors

### Option A — Real Money

Contributors earn real currency per GPU-hour served. Payouts via UPI or bank transfer when earnings cross ₹500 threshold. Transparent breakdown in app: gross earned → electricity deducted → net payout. Student with RTX 3060, 10 idle hours/day: ₹8,250/month net. This is the financial incentive that makes the supply side self-sustaining and word-of-mouth growth automatic.

Risks: payment infrastructure complexity, TDS/tax implications in India (platform must deduct TDS above ₹50,000/year), fraud prevention (fake nodes claiming earnings without running jobs — mitigated by output verification and certificate-based authentication), supply-side churn when job queue is thin.

### Option B — Gamification and Credits

No real money. Contributors earn compute credits redeemable for their own jobs — contribute 10 GPU-hours, get 10 GPU-hours of their own jobs at zero cost. Leaderboard shows campus rankings by compute contributed. Rank tiers: Node → Cluster → Datacenter → Supercomputer. Each tier unlocks tangible benefits: priority queue for your own jobs, access to highest-spec nodes, profile badges, a signed certificate of contribution (useful for CV/LinkedIn: "Contributed 2,400 GPU-hours to CampuGrid — equivalent to 3 months of A100 compute"). Streak system: contribute 7 consecutive days — streak badge, 30 days — featured on homepage. Duolingo proven that streak mechanics retain users because humans hate breaking streaks more than they love building them.

The platform shows contributors the real-world impact of their contributions: "Your GPU helped complete 47 student projects this semester. Your contributions saved the campus ₹1,20,000 in cloud costs." Framing idle hardware as meaningful campus infrastructure creates a sense of contribution that mirrors Wikipedia volunteer motivation.

No financial/legal complexity. No TDS. No fraud vectors via fake earnings. Easier to launch. Proven at massive scale (Folding@home ran on 700,000 volunteer machines with no financial incentive). Weaker supply-side growth than real money but sufficient for campus-scale where community motivation is strong.

**Combined approach (recommended):** Credits and leaderboard for campus users where community culture supports goodwill contribution, real money for external contributors joining purely for income. V1 launches with gamification only (simpler to build, demo, and legally operate), V2 adds real money payouts as the platform opens to the public.

---

## Technology Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Customer frontend | Next.js + TailwindCSS | SSR for fast initial load, WebSocket support, easy deployment |
| Contributor desktop | Electron + Python | Cross-platform (Win/Mac/Linux), system tray, wraps Python daemon |
| Backend API | FastAPI (Python) | Async, fast, excellent WebSocket support, Pydantic validation |
| Async task queue | Celery + Redis | AI pipeline and scheduler run as async workers, not blocking API |
| Job queue | Redis (list + pub/sub) | Sub-millisecond push latency, pub/sub for WebSocket events |
| Primary database | PostgreSQL | ACID transactions for billing and job state, reliable |
| Object storage | MinIO | S3-compatible, self-hosted, works on one dedicated server |
| Container runtime | Docker + Kaniko | Docker on workers, Kaniko for server-side image builds (rootless) |
| Private registry | Docker Registry v2 | Self-hosted container image storage |
| AI pipeline | Claude API (Anthropic) | Dockerfile generation for unknown code |
| ML distribution | PyTorch DDP / torchrun | Industry standard for data-parallel training |
| Render splitting | Blender CLI | Headless rendering with frame range arguments |
| Simulation splitting | OpenMPI + OpenFOAM | Domain decomposition for fluid/physics simulation |
| Monitoring | Prometheus + Grafana | Node health, GPU utilisation, job throughput dashboards |
| Resource monitoring | psutil + GPUtil | CPU/RAM/GPU stats on contributor machines |

---

## Build Order — What Gets Built When

**Week 1:** Node agent (heartbeat + docker run + resource monitoring), central WebSocket server, Redis job queue, MinIO setup, basic scheduler (no scoring, just FIFO matching). End state: manually submit a JSON job spec and watch it run on a contributor laptop.

**Week 2:** Magic bytes detection, AST Python scanner, catalog image lookup, job profile emission, customer web app (submit + monitor screens), PostgreSQL job tracking. End state: drag a `.blend` file onto the web UI, watch it split and render across two laptops.

**Week 3:** Claude API Dockerfile generation, Kaniko image builder, image caching by content hash, fault tolerance watchdog, checkpoint injection for ML containers. End state: submit an unknown Python ML script, AI generates its container, a node goes offline mid-training, job recovers from checkpoint automatically.

**Week 4:** Billing engine, earnings calculation, contributor Electron app with earnings dashboard, gamification layer (leaderboard, ranks, streaks), price comparison widget on submit screen. End state: full product from contributor earning screen to customer results download.

---

## Future Roadmap

**Peer-to-peer scheduler (V2):** Replace the central scheduler with a Distributed Hash Table (DHT) — the same evolution BitTorrent made from central trackers (Napster-style) to fully decentralised peer discovery. Any node, including the central server, can go down and the network continues routing jobs autonomously. Nodes collectively maintain the job registry and route directly to each other. No single point of failure. Genuinely unstoppable infrastructure and the credible "we cannot be vendor-locked" story for enterprise customers.

**Zero-knowledge proof of computation:** Contributors prove they correctly ran a job without the platform or other parties seeing the customer's actual data. Enables true privacy guarantees for regulated industries (healthcare, finance) that cannot send data to unknown machines.

**Model parallelism for large ML:** Layer-splitting across multiple GPUs using DeepSpeed or FSDP. Enables training of models that don't fit in any single node's VRAM. Requires InfiniBand-grade network interconnects for efficiency — campus Ethernet is adequate, WiFi is not. Requires a dedicated high-VRAM node cluster or very high-bandwidth node-to-node links.

**Business expansion:** Phase 1 — single campus MVP with institutional deal. Phase 2 — 10 campuses, each a dense contributor/user cluster, cross-campus job routing. Phase 3 — public API, enterprise customers (insurance actuarial, biotech protein folding, VFX overflow rendering), contributor network opens to any consumer GPU worldwide. Phase 4 — infrastructure layer: any application calls the CampuGrid API for burst GPU compute. Effectively AWS Spot Instances for the distributed consumer GPU world, at 50–70% lower cost.

---

## The One-Paragraph Investor/Judge Pitch

There are 500 million consumer GPUs worldwide sitting idle more than 70% of the time. Meanwhile, AI startups are on waitlists for cloud GPU access and paying $3–4 per hour for compute. We built CampuGrid — a two-sided marketplace where contributors earn passive income from hardware they already own, and customers get GPU compute at 50–70% below cloud prices, with zero infrastructure knowledge required. Our AI pipeline automatically detects what any uploaded file or script needs, splits the job across available nodes, handles faults invisibly, and returns results — no Docker, no cloud setup, no configuration. We start on campuses where supply and demand are both concentrated, prove the model with institutional deals, then open to the public. The GPU shortage is not going away. The idle compute is already there. We are the coordination layer between them.