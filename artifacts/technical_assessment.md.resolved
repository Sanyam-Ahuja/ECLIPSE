# CampuGrid — Critical Technical Assessment

> [!IMPORTANT]
> This document is a **pre-code review**. Every issue here must be resolved before we write line 1. I've organized by severity — the first issue is a fundamental design contradiction that breaks the system as described.

---

## 🔴 CRITICAL: The `--network none` Contradiction

This is the **single biggest problem** in the entire document and it goes unaddressed.

The context.md states:

1. Containers run with `--network none` — **zero network access** (line 105, 118)
2. Containers must write outputs to **MinIO** (line 111, 342-348)
3. ML training uses **DDP all-reduce** — nodes must communicate gradient tensors to each other (line 57)
4. Physics simulations use **MPI** — nodes must exchange boundary values with neighbours (line 51)
5. The FUSE mount "decrypts data on read" from MinIO (line 351)

**These are mutually exclusive.** You cannot have `--network none` AND access MinIO over the network AND do MPI/DDP communication.

The `-v` volume mount on line 106 suggests a **local filesystem bridge** — the daemon mounts a local directory into the container, and the daemon (outside the container) handles MinIO sync. But this is never explicitly stated, and it does NOT solve the MPI/DDP problem.

### My Question to You:

**Which of these models do we actually implement?**

| Model | Security | ML/Sim Support | Complexity |
|-------|----------|---------------|------------|
| **A) True `--network none`** + local volume bridge | ✅ Maximum isolation | ❌ No DDP, no MPI. Rendering & data processing ONLY. | Medium |
| **B) Restricted network** — container gets access to an internal overlay network (MinIO + peer nodes only, no internet) | ⚠️ Good isolation, not perfect | ✅ DDP, MPI, MinIO all work | High (need to manage Docker networks per job) |
| **C) Hybrid** — `--network none` for rendering/data jobs, restricted overlay for ML/simulation | ✅ Best of both | ✅ Full support | Highest |

> [!WARNING]
> If we go with Model A, **ML training and physics simulation are V2 features**, not V1. That's a massive scope cut but may be the right call for a 4-week timeline.

---

## 🔴 Server Architecture Concerns

### 1. The Scheduler is a Single Point of Failure

The scheduler runs as a **Celery Beat task every 5 seconds** (line 308). Problems:

- **Celery Beat is single-instance by design** — you cannot run two beat processes without duplicate task execution
- If the beat process dies, **no jobs get dispatched** until it's restarted
- 5-second polling = worst-case **5 seconds of latency** before a job gets matched to a node
- This is a polling loop over Redis + Postgres every 5 seconds — it doesn't scale

**My recommendation:** Replace with an **event-driven scheduler**. When a chunk is pushed to Redis, it fires a Celery task immediately (not on a timer). The task runs the matching logic once and dispatches. No polling, no beat process, sub-second dispatch latency.

### 2. Distributed State Consistency (Postgres + Redis)

The doc uses **Postgres for job/chunk state** AND **Redis for the job queue**. This creates a classic distributed state problem:

- Job gets dequeued from Redis → node starts working → Postgres update fails → **Redis says "dispatched" but Postgres says "queued"**
- Node completes → daemon reports success → Redis pub/sub fires "complete" → but Postgres write hasn't committed yet → **customer sees "complete" via WebSocket but the job record is stale**

**My recommendation:** Redis is the **fast path** (queue, pub/sub, heartbeats). Postgres is the **source of truth**. Every state transition writes to Postgres FIRST, then updates Redis. If Redis is lost, we can rebuild from Postgres. Never the reverse.

### 3. Redis High Availability

Redis is used for: job queue, heartbeat registry, pub/sub, Celery broker. **A single Redis instance is a cluster-wide SPOF.**

**Question:** Are we deploying Redis Sentinel (automatic failover) or Redis Cluster (sharding) from day 1? Or is single-instance acceptable for campus MVP?

### 4. MinIO Deployment

The doc says "self-hosted on a dedicated server" (line 342). For a campus MVP:

**Question:** Single server with local disk? Or do we need replication? If the MinIO server dies with customer data, what's the recovery story?

---

## 🟡 Client (Contributor) App — Weight & Dependency Concerns

### 1. Electron is Extremely Heavy

The doc describes it as a "lightweight background application" (line 69). **Electron apps are 200MB+ installed.** That's not lightweight. For a system tray app that shows a toggle and earnings:

| Option | Size | Cross-Platform | System Tray | Python Integration |
|--------|------|---------------|-------------|-------------------|
| **Electron** (current plan) | ~200MB | ✅ | ✅ | Awkward — spawns separate Python process |
| **Tauri** (Rust-based) | ~10-20MB | ✅ | ✅ | Spawns Python process (same as Electron) |
| **Python-only** (pystray + tkinter) | ~50MB with bundled Python | ✅ | ✅ | Native — no second runtime |
| **Go binary** + webview | ~15MB | ✅ | ✅ | Spawns Python process |

**My recommendation:** Since the heavy lifting is done by the Python daemon anyway, consider:
- **V1:** Python-only with `pystray` for system tray. Ship as a PyInstaller bundle. ~50MB. No Node.js runtime needed.
- **V2:** If we need a richer UI, migrate to Tauri.

**Question:** How important is the contributor app UI? Is it dashboard-heavy (charts, history, leaderboard) or is it basically a toggle + number?

### 2. Docker is a Hard Dependency

Every contributor needs **Docker installed and running**. On a student's machine:

- **Windows:** Requires WSL2 or Hyper-V. Many student laptops have Hyper-V disabled in BIOS. Docker Desktop is 2GB+.
- **Mac:** Docker Desktop is 2GB+, requires admin privileges, runs a Linux VM in the background consuming resources.
- **Linux:** Native Docker is fine, but students need to be in the `docker` group.

Plus: **NVIDIA Container Toolkit** must be installed for GPU passthrough. This is a non-trivial setup on Windows.

**Question:** Is the onboarding flow "download app → it installs Docker + NVIDIA toolkit automatically"? Or do we expect contributors to have Docker pre-installed? This massively affects contributor conversion rates.

**Alternative to consider:** [Podman](https://podman.io/) — rootless, daemonless, Docker-compatible. Easier to bundle. But GPU support is less mature.

---

## 🟡 ML Training Over Campus WiFi — Feasibility Reality Check

The doc acknowledges WiFi latency for simulations (line 51) but **ignores the same problem for ML training**, which is worse:

### The Math

- ResNet-50: ~25M parameters = **~100MB of gradients** per all-reduce step
- With 4 nodes on DDP, each step requires **~300MB of network transfer** (ring all-reduce)
- Campus WiFi: realistically **50-100 Mbps** per student (shared bandwidth)
- Transfer time per step: **3-6 seconds**
- A single-GPU training step on ResNet-50: **~200ms**

**Result:** Training is **15-30x slower** than single-GPU because it's entirely communication-bound. The student would be better off training on their own laptop.

### When Distributed ML Training Actually Works

| Scenario | Network Needed | Campus WiFi? |
|----------|---------------|-------------|
| Small models (< 5M params), large datasets | Low gradient traffic | ✅ Viable |
| Large models, small batch sizes | High gradient traffic per step | ❌ Too slow |
| Large models, very large batch sizes | Gradient traffic amortized | ⚠️ Marginal |
| Federated-style (local SGD, infrequent sync) | Very low | ✅ Viable |

**My recommendation:** For V1, support **Local SGD** (nodes train independently for N steps, then sync) instead of step-synchronized DDP. This reduces communication by 10-100x and actually makes distributed ML viable over WiFi.

**Question:** Is step-synchronized DDP actually required? Can we ship with Local SGD (less mathematically optimal but actually works on WiFi)?

---

## 🟡 Security Model Gaps

### 1. GPU Verification

A node claims `"gpu_model": "RTX 4090"` in its heartbeat. **How do we verify this?**

A malicious contributor could:
- Report a 4090 when they have a 3060 → get assigned high-paying jobs → jobs fail or run slowly
- Run a VM that reports fake GPU specs

**Options:**
- **Benchmark on registration:** Run a standardized CUDA kernel, measure TFLOPS, compare against known GPU benchmarks
- **Runtime verification:** Expected frame render time for a standard scene vs actual time
- Trust + penalize (reliability score degrades if jobs consistently run slower than expected)

### 2. Checkpoint Injection Requires Code Modification

The doc says students call `from campus_compute import checkpoint` (line 59). This **contradicts the zero-config promise**. The student must modify their training script.

**Better approach:** Auto-inject checkpointing by wrapping the student's script:

```python
# wrapper.py (runs inside the container, wraps student's script)
import sys
import torch
# Monkey-patch torch to auto-checkpoint every N steps
original_backward = torch.Tensor.backward
step_count = 0

def patched_backward(self, *args, **kwargs):
    global step_count
    result = original_backward(self, *args, **kwargs)
    step_count += 1
    if step_count % CHECKPOINT_INTERVAL == 0:
        save_all_model_states()  # introspect torch.nn.Module instances
    return result

torch.Tensor.backward = patched_backward
exec(open(sys.argv[1]).read())
```

This is invasive but maintains the zero-config promise. **Question:** Do we require code modification or do we auto-inject?

---

## 🟠 Missing Infrastructure Components

The document doesn't mention any of these. We need decisions:

| Component | Options | My Recommendation |
|-----------|---------|-------------------|
| **Logging / Log Aggregation** | ELK Stack, Loki + Grafana, CloudWatch | **Loki + Grafana** (we already have Grafana for monitoring) |
| **CI/CD Pipeline** | GitHub Actions, GitLab CI, Jenkins | **GitHub Actions** (simplest for a small team) |
| **Database Migrations** | Alembic (Python), raw SQL | **Alembic** (FastAPI ecosystem) |
| **API Versioning** | URL path (`/v1/`), header-based | **URL path** (`/api/v1/`) |
| **Load Balancer** (API Gateway) | Nginx, Traefik, Caddy | **Caddy** (auto-TLS, simple config) or **Nginx** |
| **Secrets Management** | Vault, .env, cloud KMS | **Vault** for prod, **.env** for dev |
| **Backup/DR** | pg_dump cron, MinIO replication | **pg_dump daily** + MinIO versioning for V1 |
| **Error Tracking** | Sentry, Bugsnag | **Sentry** (free tier, Python-native) |

---

## 🟢 Framework & Language Decisions — The 4 Deliverables

Here's what I'm proposing. Push back on anything:

### 1. Server (The Core — Main Focus)

```
Language:       Python 3.11+
Framework:      FastAPI (async, WebSocket native, Pydantic v2)
Task Queue:     Celery 5.x + Redis 7.x
Database:       PostgreSQL 16 + SQLAlchemy 2.0 + Alembic
Object Storage: MinIO (S3-compatible)
Container:      Docker Engine + Kaniko (for builds)
Registry:       Docker Registry v2 (self-hosted)
AI Pipeline:    Anthropic Claude API (Dockerfile gen)
Monitoring:     Prometheus + Grafana + Loki
Reverse Proxy:  Caddy (auto-TLS) or Nginx
```

**Question:** The doc uses Claude for Dockerfile generation. Should we also consider a **local LLM** (Ollama + CodeLlama) to avoid external API dependency and reduce cost? Or is Claude's quality worth the dependency?

### 2. Client (Contributor Desktop App)

```
Core Daemon:    Python 3.11+ (psutil, GPUtil, docker-py, websockets)
System Tray:    pystray (V1) → Tauri (V2 if richer UI needed)
Packaging:      PyInstaller (single executable)
Auto-updater:   Custom (check server version endpoint on startup)
```

**Question:** Do we ship Docker bundled inside the installer, or require pre-installation?

### 3. Consumer Web App

```
Framework:      Next.js 14+ (App Router)
Styling:        TailwindCSS (as per your doc)
State:          Zustand or React Context (lightweight)
Real-time:      Native WebSocket (useEffect hook)
Charts:         Recharts (training curves)
File Upload:    react-dropzone
Auth:           NextAuth.js (Google OAuth for campus SSO)
```

**Question:** Does next.js app need to serve the product/marketing website too (SSR pages + app pages), or is the marketing site completely separate?

### 4. Product Website (Marketing/Landing)

```
Framework:      Next.js (same repo as consumer app, separate /marketing routes)
                OR Astro (if fully separate, better for static content)
Styling:        TailwindCSS
Animations:     Framer Motion
```

---

## 🔵 Scope & V1 Definition Questions

These are the **strategic decisions** that determine what we actually build:

1. **V1 Workload Types:** The doc lists 4 (Rendering, Data Processing, ML Training, Physics Simulation). For a realistic V1:
   - Do we ship all 4, or start with **Rendering + Data Processing** only (embarrassingly parallel, no inter-node communication, much simpler)?
   
2. **V1 Monetization:** The doc recommends "credits + gamification first, real money later." **Do we agree?** This affects whether we need Stripe/payment integration in V1.

3. **V1 Deployment Target:** 
   - Single campus with a dedicated server (MinIO + Postgres + Redis + API all on one beefy machine)?
   - Or cloud-hosted (DigitalOcean/Hetzner) with campus nodes connecting over the internet?

4. **V1 Contributor OS Support:**
   - Linux only? (Simplest — Docker + NVIDIA toolkit work best)
   - Linux + Windows? (WSL2 Docker adds complexity)
   - All three? (Mac GPU support is basically nonexistent for CUDA)

5. **The "4-week" timeline** in the doc — is that our actual timeline? Because honestly, even the Week 1 goals (node agent + WebSocket server + Redis queue + MinIO + scheduler) are 2-3 weeks of solid work for proper implementation with tests.

---

## Summary of Blocking Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Network model: `--network none` vs restricted overlay vs hybrid? | **Determines which workloads are possible in V1** |
| 2 | V1 workload scope: All 4 types or rendering + data only? | **Determines server complexity by 3-5x** |
| 3 | ML distribution: Step-synced DDP or Local SGD? | **Determines if ML training is viable over WiFi** |
| 4 | Contributor app: Electron vs Python-only vs Tauri? | **Determines contributor install size and DX** |
| 5 | Docker bundling: Ship with installer or require pre-install? | **Determines contributor onboarding friction** |
| 6 | Redis HA: Single instance or Sentinel? | **Determines reliability posture** |
| 7 | Checkpoint: Require code changes or auto-inject? | **Determines "zero-config" promise** |
| 8 | V1 deployment: On-prem or cloud-hosted? | **Determines infra provisioning** |
| 9 | V1 OS support: Linux-only or cross-platform? | **Determines client development effort** |
| 10 | Claude vs local LLM for Dockerfile gen? | **Determines external dependency and cost** |
| 11 | Consumer app + marketing site: Same Next.js app or separate? | **Determines repo structure** |
| 12 | Actual timeline: 4 weeks or realistic estimate? | **Determines scope cuts needed** |
