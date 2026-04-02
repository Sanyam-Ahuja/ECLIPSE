# CampuGrid — Task Tracker

## Phase 1 — Foundation: DETAILED EXECUTION PLAN

Every file listed below with exact purpose, key contents, and status.

### 1. Infrastructure (Docker Compose + Config)

- [x] **`server/pyproject.toml`** — Project deps (FastAPI, SQLAlchemy, Redis, Celery, MinIO, Gemini, Prometheus, Sentry)
- [x] **`infra/docker-compose.yml`** — All services for local dev:
  - `postgres:16-alpine` → port 5432, db=campugrid
  - `redis:7-alpine` → port 6379, maxmem 512MB
  - `minio/minio:latest` → port 9000 (S3 API) + 9001 (console)
  - `registry:2` → port 5000 (private Docker registry)
  - `prom/prometheus:latest` → port 9090
  - `grafana/grafana:latest` → port 3001
  - `grafana/loki:latest` → port 3100
  - Named volumes: pgdata, miniodata, registrydata
- [x] **`infra/.env.example`** — Template for all env vars (PG, Redis, MinIO, JWT, Gemini API key, etc.)
- [x] **`infra/prometheus/prometheus.yml`** — Scrape config targeting FastAPI metrics endpoint + node agents
- [x] **`infra/caddy/Caddyfile`** — Reverse proxy: `/api/*` → FastAPI:8000, `/ws/*` → FastAPI WS, `/*` → Next.js:3000

### 2. Server Core (`server/app/core/`)

- [x] **`server/app/core/config.py`** — Pydantic Settings class loading from `.env`:
  - `DATABASE_URL` (async postgres), `REDIS_URL`, `MINIO_*` (endpoint, access key, secret, bucket names)
  - `JWT_SECRET_KEY`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=1440`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (OAuth)
  - `GEMINI_API_KEY`
  - `SENTRY_DSN` (optional)
  - Singleton pattern via `@lru_cache`
- [x] **`server/app/core/database.py`** — SQLAlchemy async setup:
  - `create_async_engine` with pool settings
  - `async_sessionmaker` → `AsyncSession`
  - `get_db()` async generator dependency
  - `Base = DeclarativeBase` with automatic `created_at`, `updated_at` mixins
- [x] **`server/app/core/redis.py`** — Redis connection:
  - `redis.asyncio.Redis` connection pool
  - `get_redis()` dependency
  - Helper methods: `heartbeat_update()`, `heartbeat_get_active()`, `queue_push()`, `queue_pop()`
- [x] **`server/app/core/security.py`** — Auth utilities:
  - `create_access_token(user_id, role)` → JWT with 24hr expiry
  - `verify_token(token)` → user payload or raise 401
  - `get_current_user` FastAPI dependency (extracts token from header)
  - `hash_password()`, `verify_password()` via passlib bcrypt
  - Google OAuth helper: exchange auth code → user info

### 3. SQLAlchemy Models (`server/app/models/`)

- [x] **`server/app/models/base.py`** — Base class with:
  - `id: UUID` primary key (default uuid4)
  - `created_at: datetime` (server_default=now)
  - `updated_at: datetime` (onupdate=now)
- [x] **`server/app/models/user.py`** — `User` table:
  - `email` (unique), `name`, `hashed_password` (nullable for OAuth users)
  - `role` enum: `customer | contributor | both`
  - `oauth_provider`, `oauth_id` (for Google SSO)
  - `credit_balance` (float, default 0.0)
- [x] **`server/app/models/node.py`** — `Node` table:
  - `user_id` FK → users
  - `hostname`, `cpu_cores`, `ram_gb`, `gpu_model`, `gpu_vram_gb`, `cuda_version`, `os`
  - `reliability_score` (float 0-1, default 0.8)
  - `total_earned`, `total_gpu_hours` (floats)
  - `cert_fingerprint` (string)
  - `status` enum: `online | busy | offline | suspended`
  - `resource_limits` (JSON: max_cpu%, max_ram%, max_gpu%, schedule)
  - `last_heartbeat` (datetime)
  - `bandwidth_mbps` (float)
  - `cached_images` (JSON array of image names)
- [x] **`server/app/models/job.py`** — `Job` table:
  - `user_id` FK → users
  - `type` enum: `render | data | ml_training | simulation`
  - `status` enum: `analyzing | queued | running | assembling | completed | failed | cancelled`
  - `ml_sync_mode` enum: `ddp | local_sgd` (nullable)
  - `container_image` (string → links to container_images)
  - `profile` (JSON: detected file type, framework, resources)
  - `cost_estimate` (JSON: estimated_hours, price_per_hour, total)
  - `actual_cost` (float)
  - `total_chunks`, `completed_chunks` (ints)
  - `input_path`, `output_path` (MinIO keys)
  - `presigned_url` (temp download link)
  - `completed_at` (datetime nullable)
- [x] **`server/app/models/chunk.py`** — `Chunk` table:
  - `job_id` FK → jobs
  - `node_id` FK → nodes (nullable)
  - `chunk_index` (int)
  - `status` enum: `pending | assigned | running | completed | failed | requeued`
  - `spec` (JSON: chunk_start, chunk_end, command, env vars)
  - `checkpoint_path` (string nullable)
  - `retry_count` (int, default 0, max 3)
  - `gpu_hours`, `cost` (floats)
  - `assigned_at`, `started_at`, `completed_at` (datetimes nullable)
- [x] **`server/app/models/billing.py`** — `BillingRecord` table:
  - `job_id`, `chunk_id`, `customer_id`, `contributor_id` FKs
  - `gpu_hours`, `customer_charge`, `contributor_credit`, `platform_fee` (floats)
  - `dynamic_multiplier` (float)
- [x] **`server/app/models/image.py`** — `ContainerImage` table:
  - `name`, `tag`, `registry_path`
  - `content_hash` (SHA-256)
  - `source` enum: `catalog | adapted | generated`
  - `build_status` enum: `ready | building | failed`
  - `metadata` (JSON: base_image, frameworks, gpu_support, preinstalled_packages)

### 4. Pydantic Schemas (`server/app/schemas/`)

- [x] **`server/app/schemas/user.py`** — `UserCreate`, `UserLogin`, `UserResponse`, `TokenResponse`
- [x] **`server/app/schemas/node.py`** — `NodeRegister`, `NodeHeartbeat`, `NodeResponse`
- [x] **`server/app/schemas/job.py`** — `JobSubmitResponse`, `JobStatusResponse`, `JobProfile`
- [x] **`server/app/schemas/ws_messages.py`** — Typed WS messages:
  - `HeartbeatMessage`, `JobDispatchMessage`, `ChunkStatusMessage`
  - `DetectionStepMessage` (for live pipeline streaming to customer)
  - `ChunkRescuedMessage`, `JobCompleteMessage`

### 5. Services (`server/app/services/`)

- [x] **`server/app/services/minio_service.py`** — MinIO operations:
  - `upload(bucket, key, data/file_path)` — upload file or bytes
  - `download(bucket, key)` → bytes
  - `get_presigned_url(bucket, key, expiry=4hrs)` → URL string
  - `list_objects(bucket, prefix)` → list
  - `ensure_buckets()` — create `job-inputs`, `job-outputs`, `checkpoints`, `build-contexts` on startup
  - `get_size(bucket, key)` → int bytes
- [x] **`server/app/services/redis_service.py`** — Redis operations:
  - `update_heartbeat(node_id, resources_json)` — ZADD to sorted set by timestamp
  - `get_active_nodes(timeout_seconds=30)` → list of active nodes
  - `mark_node_busy(node_id)` / `mark_node_available(node_id)`
  - `push_chunk(chunk_json, priority="normal")` — LPUSH/RPUSH to job queue
  - `pop_chunk()` — RPOP from job queue
  - `publish(channel, message)` — pub/sub for WebSocket broadcasting
  - `subscribe(channel)` — async generator for pub/sub
- [x] **`server/app/services/notification_service.py`** — WebSocket broadcasting:
  - (Omitted logic mapped to ConnectionManager)

### 6. WebSocket Manager (`server/app/api/v1/websocket.py`)

- [x] **`server/app/api/v1/websocket.py`** — Connection manager:
  - `ConnectionManager` class
  - WS route `/api/v1/ws/node/{node_id}`
  - WS route `/api/v1/ws/job/{job_id}`

### 7. API Endpoints (`server/app/api/v1/`)

- [x] **`server/app/api/v1/router.py`** — Aggregated router including all sub-routers
- [x] **`server/app/api/v1/users.py`** — Auth endpoints:
- [x] **`server/app/api/v1/nodes.py`** — Node endpoints:
- [x] **`server/app/api/v1/jobs.py`** — Job endpoints:
- [x] **`server/app/api/v1/billing.py`** — Billing endpoints:

### 8. FastAPI Main App (`server/app/main.py`)

- [x] **`server/app/main.py`** — Entry point:

### 9. Alembic Setup

- [x] **`server/alembic.ini`** — Alembic config pointing to migrations/
- [x] **`server/migrations/env.py`** — Alembic env with async engine support
- [x] **`server/migrations/script.py.mako`** — Migration template
- [x] Initial migration → creates all 6 tables

### 10. GPU Benchmarks Utility

- [x] **`server/app/utils/gpu_benchmarks.py`** — GPU performance table:
  - `GPU_BENCHMARKS` dict: gpu_model → (fp32_tflops, vram_gb, power_watts)
  - `customer_price_per_hour(gpu_model)` → USD
  - `contributor_net_per_hour(gpu_model)` → USD
  - `dynamic_multiplier(gpu_model, available_count, queue_depth)` → float

---

## FILES CREATED SO FAR

| # | File | Status |
|---|------|--------|
| 1 | `server/pyproject.toml` | ✅ Done |
| 2 | Directory structure + `__init__.py` files | ✅ Done |
| 3-30+ | All files listed above | ⏳ Pending |

---

## Phase 2 — AI Pipeline + Rendering (Week 3–4)

- [x] Magic bytes detector (`pipeline/detector.py`)
- [x] Blend file analyzer (`pipeline/analyzer.py`)
- [x] Python AST analyzer (in `pipeline/analyzer.py`)
- [x] Image catalog Tier 1 (`pipeline/catalog.py`)
- [x] Chunk splitter (`pipeline/splitter.py`)
- [x] Pipeline orchestrator (`pipeline/orchestrator.py`)
- [x] Event-driven scheduler (`scheduler/matcher.py`)
- [x] Contributor mock Python daemon (`client/scripts/mock_daemon.py`)
- [x] Storage bridge dispatcher mock (`scheduler/dispatcher.py`)

## Phase 3 — Fault Tolerance + Data Processing (Week 5–6)

- [ ] Watchdog (`scheduler/watchdog.py`)
- [ ] Reliability scoring
- [ ] Data processing splitter
- [ ] Data assembler
- [ ] Gemini Dockerfile verifier (`pipeline/verifier.py`)
- [ ] Gemini Dockerfile generator (`pipeline/generator.py`)
- [ ] Kaniko builder (`pipeline/builder.py`)
- [ ] Build python-data Docker image

## Phase 4 — ML Training + Simulation (Week 7–8)

- [ ] Docker overlay network manager
- [ ] Auto-checkpoint injection
- [ ] Local SGD implementation
- [ ] DDP orchestration
- [ ] ML splitter + assembler
- [ ] Simulation splitter + assembler
- [ ] Build PyTorch + OpenFOAM images
- [ ] ML sync mode selection + pricing

## Phase 5 — Consumer Web App (Week 8–9)

- [ ] Next.js project setup
- [ ] Auth flow (Google OAuth)
- [ ] Submit page (drag-drop + live detection)
- [ ] Price comparison widget
- [ ] Monitor page (live chunk cards)
- [ ] Results page
- [ ] WebSocket integration

## Phase 6 — Contributor Tauri App (Week 9–10)

- [ ] Tauri project setup (Svelte)
- [ ] Docker installer integration
- [ ] NVIDIA detection
- [ ] Registration flow
- [ ] Dashboard, Settings, History, Leaderboard views
- [ ] Billing engine + gamification
- [ ] PyInstaller daemon bundle

## Phase 7 — Marketing Site + Polish (Week 10–11)

- [ ] Landing page
- [ ] Pricing page
- [ ] About page
- [ ] Animations
- [ ] E2E + performance testing
- [ ] Documentation
- [ ] Sentry integration
