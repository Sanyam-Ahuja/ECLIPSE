# Phase 3 — Fault Tolerance + Data Processing: DETAILED EXECUTION PLAN

**Goal:** Node goes offline → job recovers automatically. CSV/Parquet data processing works end-to-end. Gemini fallback for unknown code.

---

## Fault Tolerance (`server/app/scheduler/`)

### 1. `scheduler/watchdog.py` — Fault Detection & Chunk Rescue

**Purpose:** Celery Beat task every 30 seconds. Detects nodes that missed 3+ heartbeats (90s), rescues their chunks.

**Key contents:**
```python
class JobWatchdog:
    HEARTBEAT_TIMEOUT = 90          # 3 missed heartbeats (30s each)
    CHUNK_TIMEOUT_MULTIPLIER = 3    # max 3x estimated time before timeout
    MAX_RETRIES = 3

    @celery.task(name="watchdog.check_running_chunks")
    async def check_running_chunks(self):
        """Celery Beat task — runs every 30s."""
        running_chunks = await db.get_chunks_by_status("running")
        for chunk in running_chunks:
            node = await db.get_node(chunk.node_id)
            time_since_heartbeat = now() - node.last_heartbeat
            
            if time_since_heartbeat > timedelta(seconds=self.HEARTBEAT_TIMEOUT):
                await self.rescue_chunk(chunk)
                await self.penalise_node(node)
            
            # Also check for stuck jobs (running way past estimate)
            elif chunk.started_at and (now() - chunk.started_at).seconds > chunk.estimated_seconds * self.CHUNK_TIMEOUT_MULTIPLIER:
                await self.rescue_chunk(chunk, reason="timeout")

    async def rescue_chunk(self, chunk, reason="node_offline"):
        """Re-queue a failed chunk with checkpoint recovery."""
        if chunk.retry_count >= self.MAX_RETRIES:
            await db.update_chunk(chunk.id, status="failed")
            await self.check_job_failed(chunk.job_id)
            return
        
        # Check for checkpoint in MinIO
        latest_checkpoint = await minio.get_latest_checkpoint(
            f"checkpoints/{chunk.job_id}/{chunk.chunk_id}/"
        )
        
        # Re-queue with high priority
        rescued_spec = {
            **chunk.spec,
            "resume_from_checkpoint": latest_checkpoint.path if latest_checkpoint else None,
            "chunk_start": latest_checkpoint.progress if latest_checkpoint else chunk.spec["chunk_start"],
            "priority": "high",
        }
        
        await db.update_chunk(chunk.id, 
            status="requeued", 
            node_id=None, 
            retry_count=chunk.retry_count + 1,
            spec=rescued_spec
        )
        
        # Push to front of Redis queue (high priority)
        await redis.push_chunk_priority(chunk.id)
        
        # Trigger scheduler
        dispatch_chunk.delay(chunk.id)
        
        # Notify customer
        await ws_manager.broadcast_to_job(chunk.job_id, {
            "event": "chunk_rescued",
            "chunk_id": str(chunk.id),
            "reason": reason,
            "retry": chunk.retry_count + 1,
            "checkpoint": latest_checkpoint is not None,
        })

    async def penalise_node(self, node):
        """Degrade reliability score."""
        new_score = max(0.0, node.reliability_score - 0.1)
        await db.update_node(node.id, reliability_score=new_score, status="offline")

    async def check_job_failed(self, job_id):
        """If all retries exhausted for any chunk, fail the entire job."""
        failed_chunks = await db.count_chunks(job_id, status="failed")
        if failed_chunks > 0:
            await db.update_job(job_id, status="failed")
            await ws_manager.broadcast_to_job(job_id, {
                "event": "job_failed",
                "reason": f"{failed_chunks} chunk(s) failed after {self.MAX_RETRIES} retries"
            })
```

**Celery Beat registration:**
```python
# in celery config
beat_schedule = {
    "watchdog-check": {
        "task": "watchdog.check_running_chunks",
        "schedule": 30.0,  # every 30 seconds
    }
}
```

---

### 2. Reliability Scoring (in `models/node.py` + `scheduler/matcher.py`)

**Updates to existing files:**
- `matcher.py` score function already uses `reliability * 30` weight
- Add `recover_reliability()` called when a node successfully completes a chunk:
```python
async def on_chunk_success(node_id: str):
    """Recover reliability score after successful completion."""
    node = await db.get_node(node_id)
    new_score = min(1.0, node.reliability_score + 0.02)  # slow recovery
    await db.update_node(node_id, reliability_score=new_score)
```

---

## Data Processing Pipeline

### 3. Data Processing Splitter (additions to `pipeline/splitter.py`)

**New function:**
```python
async def split_data(profile: JobProfile, available_nodes: int) -> list[ChunkSpec]:
    """Shard CSV/Parquet by byte ranges with clean row boundaries."""
    file_size = profile.split_params["file_size"]
    target_shard_size = file_size // available_nodes
    
    # Read file to find clean row boundaries (newline positions)
    # For CSV: scan for \n near target byte offsets
    # For Parquet: use row-group boundaries (Parquet is columnar, natural split points)
    
    chunks = []
    for i in range(available_nodes):
        start_byte = find_row_boundary(i * target_shard_size)
        end_byte = find_row_boundary((i + 1) * target_shard_size)
        chunks.append(ChunkSpec(
            chunk_index=i,
            chunk_start=start_byte,
            chunk_end=end_byte,
            command=f"python /workspace/input/{profile.user_script}",
            env_vars={
                "CHUNK_START": str(start_byte),
                "CHUNK_END": str(end_byte),
                "INPUT_PATH": "/input/",
                "OUTPUT_PATH": "/output/",
                "SHARD_INDEX": str(i),
            },
            resources=profile.resources,
        ))
    return chunks
```

### 4. `assembler/data_assembler.py` — Merge Output Shards

**Purpose:** Combine output shards from all chunks into a single result file.

**Key contents:**
```python
@celery.task(name="assembler.assemble_data")
async def assemble_data(job_id: str):
    """Merge all output shards into single result file."""
    # 1. List all output shards from MinIO: job-outputs/{job_id}/output/shard_*.csv
    # 2. Download all shards to temp dir
    # 3. Determine merge strategy:
    #    a. If CSV: concatenate with header from first shard only
    #    b. If Parquet: pyarrow concat tables
    #    c. If JSON: merge arrays
    # 4. Upload merged result to MinIO
    # 5. Generate presigned URL
    # 6. Update job: status=completed, output_path, presigned_url
    # 7. Broadcast to customer

async def merge_csv(shard_paths: list[str], output_path: str):
    """Concatenate CSV shards — keep header from first shard only."""
    with open(output_path, 'w') as out:
        for i, shard in enumerate(sorted(shard_paths)):
            with open(shard) as f:
                if i > 0:
                    f.readline()  # skip header on shards 2+
                out.write(f.read())

async def merge_parquet(shard_paths: list[str], output_path: str):
    """Merge Parquet shards using pyarrow."""
    # pyarrow.parquet.read_table each shard → concat → write
```

---

## Gemini Docker Config Integration (`server/app/pipeline/`)

### 5. `pipeline/verifier.py` — Tier 2: Gemini Verify & Adapt

**Purpose:** When catalog entry exists but student code has extra dependencies, use Gemini to verify compatibility and generate a minimal pip install layer.

**Key contents:**
```python
import google.generativeai as genai

class DockerConfigVerifier:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")  # cheap + fast
    
    async def verify_and_adapt(
        self,
        catalog_entry: CatalogEntry,
        user_imports: set[str],
        requirements_txt: str | None
    ) -> AdaptationResult:
        """Check if catalog config works with user's code; adapt if needed."""
        
        # Step 1: Check if all user imports are already pre-installed
        preinstalled_names = {pkg.split("==")[0] for pkg in catalog_entry.preinstalled_packages}
        missing = user_imports - preinstalled_names
        
        if not missing:
            return AdaptationResult(needs_adaptation=False, image=catalog_entry.image)
        
        # Step 2: Ask Gemini to verify compatibility
        prompt = f"""You are a Docker dependency resolver.

Base image: {catalog_entry.image}
Pre-installed packages: {json.dumps(catalog_entry.preinstalled_packages)}

Student code requires these ADDITIONAL packages: {json.dumps(list(missing))}
Student's requirements.txt: {requirements_txt or 'Not provided'}

Tasks:
1. Check for version conflicts between pre-installed and requested packages
2. Map import names to pip package names (e.g., cv2 → opencv-python, sklearn → scikit-learn)
3. If compatible, output the pip install command with pinned versions
4. If incompatible, explain the conflict

Output ONLY valid JSON:
{{"compatible": true, "pip_install": "pip install pkg1==x.y pkg2==a.b", "conflicts": []}}
or
{{"compatible": false, "pip_install": null, "conflicts": ["conflict description"]}}"""

        response = await self.model.generate_content_async(prompt)
        result = json.loads(response.text)
        
        if result["compatible"]:
            # Build adapted Dockerfile
            dockerfile = f"FROM {catalog_entry.image}\nRUN {result['pip_install']}\n"
            content_hash = hashlib.sha256(dockerfile.encode()).hexdigest()[:16]
            
            # Check image cache
            cached = await self.registry.image_exists(f"campugrid/adapted/{content_hash}")
            if cached:
                return AdaptationResult(
                    needs_adaptation=True, 
                    image=f"campugrid/adapted/{content_hash}",
                    cached=True
                )
            
            # Trigger Kaniko build
            return AdaptationResult(
                needs_adaptation=True,
                dockerfile=dockerfile,
                image_tag=f"campugrid/adapted/{content_hash}",
                cached=False
            )
        else:
            return AdaptationResult(
                needs_adaptation=True,
                conflicts=result["conflicts"],
                compatible=False
            )

@dataclass
class AdaptationResult:
    needs_adaptation: bool
    image: str | None = None
    dockerfile: str | None = None
    image_tag: str | None = None
    cached: bool = False
    compatible: bool = True
    conflicts: list[str] | None = None
```

---

### 6. `pipeline/generator.py` — Tier 3: Gemini Full Dockerfile Generation

**Purpose:** Last resort — code doesn't match any catalog entry. Generate full Dockerfile from scratch.

**Key contents:**
```python
class DockerfileGenerator:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")
    
    async def generate(
        self,
        source_code: str,
        requirements_txt: str | None,
        profile: JobProfile,
    ) -> GenerationResult:
        """Generate a complete Dockerfile for unknown code."""
        
        prompt = f"""You are a Dockerfile generator for a distributed GPU compute platform.
Generate a minimal, working Dockerfile for the code below.

STRICT RULES:
- Base: nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04 if GPU needed, else python:3.11-slim
- Pin ALL package versions from requirements.txt
- For OpenCV: apt-get install -y libgl1 libglib2.0-0
- Include WORKDIR /workspace
- Entrypoint must accept env vars: CHUNK_START, CHUNK_END, JOB_ID, OUTPUT_PATH
- Output ONLY the Dockerfile. No explanation. No markdown fences.

GPU required: {profile.gpu_required}
Framework detected: {profile.framework}

requirements.txt:
{requirements_txt or 'Not provided — infer from imports'}

source code (first 3000 chars):
{source_code[:3000]}"""

        response = await self.model.generate_content_async(prompt)
        dockerfile = response.text.strip()
        
        content_hash = hashlib.sha256(dockerfile.encode()).hexdigest()[:16]
        
        # Check cache
        cached = await self.registry.image_exists(f"campugrid/generated/{content_hash}")
        
        return GenerationResult(
            dockerfile=dockerfile,
            image_tag=f"campugrid/generated/{content_hash}",
            cached=cached,
            content_hash=content_hash
        )
```

---

### 7. `pipeline/builder.py` — Kaniko Image Builder

**Purpose:** Build Docker images from Dockerfiles without Docker daemon (rootless, secure).

**Key contents:**
```python
class KanikoBuilder:
    async def build(self, dockerfile: str, tag: str, build_context_files: dict[str, bytes] | None = None):
        """Trigger Kaniko build."""
        # 1. Upload Dockerfile to MinIO: build-contexts/{hash}/Dockerfile
        # 2. Upload any additional build context files
        # 3. Run Kaniko as a Docker container (the ONE exception to rootless — Kaniko itself runs in Docker):
        #    docker run --rm
        #      -v /minio-data/build-contexts/{hash}:/workspace
        #      gcr.io/kaniko-project/executor:latest
        #      --context /workspace
        #      --destination {registry_url}/{tag}
        #      --cache=true --cache-ttl=168h
        #      --compressed-caching
        # 4. Track build status in DB (container_images table)
        # 5. Return when build complete
    
    async def get_build_status(self, image_tag: str) -> str:
        """Check if a Kaniko build is still running."""
        # Query container_images table for build_status
```

---

## Docker Images

### 8. `server/docker/images/python-data/Dockerfile`

```dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir \
    pandas==2.2.0 \
    numpy==1.26.4 \
    scipy==1.12.0 \
    polars==0.20.7 \
    pyarrow==15.0.0 \
    dask[complete]==2024.1.0 \
    scikit-learn==1.4.0 \
    matplotlib==3.8.3
WORKDIR /workspace
```

---

## Phase 3 Completion Test

**End-to-end test scenario:**
1. Submit a CSV (10MB) + transform.py script
2. Pipeline detects CSV + Python → data processing workload
3. Catalog hit → python-data image
4. CSV split into 2 shards by byte range
5. Both chunks processed on contributor node
6. Output shards merged into single result CSV
7. **Fault test:** Start job, kill contributor daemon mid-processing
8. Watchdog detects missed heartbeats (90s)
9. Chunk rescued → re-queued with high priority
10. Restart daemon → chunk dispatched again → completes
11. **Gemini test:** Submit Python script with `import transformers` (not in catalog)
12. Tier 2: Gemini verifies PyTorch base + adapts with `pip install transformers`
13. Kaniko builds adapted image → pushed to registry → job runs
