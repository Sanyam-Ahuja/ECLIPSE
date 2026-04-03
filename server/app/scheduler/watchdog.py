"""Celery Beat Watchdog for Fault Tolerance."""

import logging

import redis.asyncio as aioredis
from asgiref.sync import async_to_sync
from sqlalchemy import select

from app.api.v1.websocket import ws_manager
from app.celery_worker import celery_app as celery
from app.core.config import get_settings
from app.core.database import async_session
from app.core.redis import RedisService
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job, JobStatus
from app.models.node import Node

logger = logging.getLogger(__name__)
settings = get_settings()


class JobWatchdog:
    HEARTBEAT_TIMEOUT = 90  # seconds (3 missed 30s heartbeats) - although mock triggers every 10s
    CHUNK_TIMEOUT_MULTIPLIER = 3
    MAX_RETRIES = 3




async def check_and_rescue_async():
    """Finds chunks assigned to offline nodes and rescues them."""
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)

    async with async_session() as session:
        # Get active nodes from Redis (nodes that have pulsed in the last HEARTBEAT_TIMEOUT)
        active_nodes = await redis_svc.get_active_nodes(JobWatchdog.HEARTBEAT_TIMEOUT)
        active_node_ids = set(active_nodes)

        # Get all chunks that are currently processing
        result = await session.execute(
            select(Chunk, Node).join(Node, Chunk.node_id == Node.id).where(
                Chunk.status.in_([ChunkStatus.ASSIGNED, ChunkStatus.RUNNING])
            )
        )

        for chunk, node in result.all():
            if str(node.id) not in active_node_ids:
                logger.warning(f"Watchdog: Node {node.id} went offline during Chunk {chunk.id}. Rescuing...")
                await rescue_chunk(session, redis_svc, chunk, node, "node_offline")

                # Penalize node
                new_score = max(0.0, node.reliability_score - 0.1)
                node.reliability_score = new_score

        await session.commit()
    await r.aclose()


async def rescue_chunk(session, redis_svc, chunk: Chunk, node: Node, reason: str):
    if chunk.retry_count >= JobWatchdog.MAX_RETRIES:
        chunk.status = ChunkStatus.FAILED
        logger.error(f"Chunk {chunk.id} exhausted retries. Failing job.")

        # Fail the job
        job_result = await session.execute(select(Job).where(Job.id == chunk.job_id))
        job = job_result.scalar_one()
        job.status = JobStatus.FAILED

        await ws_manager.broadcast_to_job(str(chunk.job_id), {
            "type": "job_complete",
            "job_id": str(chunk.job_id),
            "status": "failed",
            "message": f"Chunk failed after {JobWatchdog.MAX_RETRIES} retries."
        })
        return

    # Free the chunk back to pending pool
    chunk.status = ChunkStatus.PENDING
    chunk.node_id = None
    chunk.retry_count += 1

    # NOTE: Normally we'd check MinIO for checkpoints here and inject `chunk_start`.
    # For Phase 3 core completion we just re-queue from 0 for now unless checkpoint found.

    logger.info(f"Chunk {chunk.id} rescued and queued. (Retry {chunk.retry_count})")

    # Alert customer
    await ws_manager.broadcast_to_job(str(chunk.job_id), {
        "type": "detection_step",
        "job_id": str(chunk.job_id),
        "step": "rescued",
        "detail": f"Contributor disconnected. Chunk instantly re-routed. (Retry {chunk.retry_count})"
    })

    await redis_svc.push_chunk(str(chunk.id), priority=100) # High priority


@celery.task(name="scheduler.watchdog")
def run_watchdog():
    """Celery Beat task entry."""
    async_to_sync(check_and_rescue_async)()
