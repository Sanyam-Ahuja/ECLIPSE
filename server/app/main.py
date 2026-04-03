"""CampuGrid Server — FastAPI entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import init_db
from app.core.redis import redis_pool
from app.services.minio_service import minio_service
from app.api.v1.websocket import ws_manager
import asyncio
import json
import redis.asyncio as aioredis

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # ── Startup ──
    logger.info("🚀 CampuGrid server starting...")

    # Create database tables (dev only — use Alembic in prod)
    logger.info("📦 Initializing database tables...")
    await init_db()

    # Ensure MinIO buckets exist
    logger.info("🪣 Ensuring MinIO buckets...")
    try:
        minio_service.ensure_buckets()
        logger.info("✅ MinIO buckets ready")
    except Exception as e:
        logger.warning(f"⚠️ MinIO not available: {e}. Start infra with 'docker compose up'")

    # Sentry init
    # ── Redis PubSub Listener ──
    async def listen_to_redis_events():
        try:
            client = aioredis.Redis(connection_pool=redis_pool)
            pubsub = client.pubsub()
            await pubsub.subscribe("job_updates")
            logger.info("📡 Listening to Redis channel: job_updates")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    job_id = data.get("job_id")
                    if job_id:
                        await ws_manager.broadcast_to_job(job_id, data)
        except Exception as e:
            logger.warning(f"Redis PubSub Error: {e}")

    redis_task = asyncio.create_task(listen_to_redis_events())

    logger.info("✅ CampuGrid server ready!")
    yield

    # ── Shutdown ──
    redis_task.cancel()
    logger.info("👋 CampuGrid server shutting down...")


# ── Create App ──────────────────────────────────────────────────

app = FastAPI(
    title="CampuGrid API",
    description="Distributed P2P GPU Compute Platform — Server API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
except ImportError:
    logger.info("prometheus-fastapi-instrumentator not installed, skipping metrics")

# Include API routes
app.include_router(api_router)


# ── Health Endpoint ─────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    """Health check — verifies DB, Redis, and MinIO connectivity."""
    health = {"status": "ok", "services": {}}

    # Database
    try:
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health["services"]["database"] = "connected"
    except Exception as e:
        health["services"]["database"] = f"error: {e}"
        health["status"] = "degraded"

    # Redis
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        health["services"]["redis"] = "connected"
    except Exception as e:
        health["services"]["redis"] = f"error: {e}"
        health["status"] = "degraded"

    # MinIO
    try:
        minio_service.client.list_buckets()
        health["services"]["minio"] = "connected"
    except Exception as e:
        health["services"]["minio"] = f"error: {e}"
        health["status"] = "degraded"

    return health


# Need this import for the health check SQL
from sqlalchemy import text
