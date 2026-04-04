"""Event-Driven Node Matching engine with LAN detection."""

import json
import logging
from collections import defaultdict

import redis.asyncio as aioredis
from asgiref.sync import async_to_sync
from sqlalchemy import func, select

from app.celery_worker import celery_app as celery
from app.core.config import get_settings
from app.core.database import make_celery_session
from app.core.redis import RedisService
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job, JobStatus
from app.models.node import Node

logger = logging.getLogger(__name__)
settings = get_settings()


def score_node(resources: dict, chunk_spec: dict) -> float:
    """Higher score = better match."""
    # VRAM match ensures they don't crash
    if resources.get("gpu_vram_gb", 0) < chunk_spec.get("vram_gb", 0):
        return -1.0

    if resources.get("ram_gb", 0) < chunk_spec.get("ram_gb", 0):
        return -1.0

    score = 100.0

    # Priority given to massive bandwidth
    score += min(resources.get("bandwidth_mbps", 10) / 100, 50.0)

    # Priority for highly reliable nodes
    score += (resources.get("reliability_score", 0.8) * 40.0)

    return score


def is_lan_peer(ip_a: str, ip_b: str) -> bool:
    """Check if two nodes are on the same LAN (same /24 subnet)."""
    if not ip_a or not ip_b:
        return False
    subnet_a = ".".join(ip_a.split(".")[:3])
    subnet_b = ".".join(ip_b.split(".")[:3])
    return subnet_a == subnet_b


def find_lan_cluster(
    nodes: list[tuple[str, str, str]],  # [(node_id, ip_address, resources_json), ...]
    min_size: int,
) -> list[str] | None:
    """Find a group of min_size nodes all on the same LAN.
    Returns list of node_ids or None if no cluster found.
    """
    subnets: dict[str, list[str]] = defaultdict(list)
    for node_id, ip, _ in nodes:
        if ip:
            subnet = ".".join(ip.split(".")[:3])
            subnets[subnet].append(node_id)

    for subnet in sorted(subnets, key=lambda s: len(subnets[s]), reverse=True):
        if len(subnets[subnet]) >= min_size:
            return subnets[subnet][:min_size]
    return None


async def find_best_match(chunk: Chunk, available_nodes: list[tuple[str, str]]) -> str | None:
    best_node = None
    best_score = 0.0

    for node_id, resources_json in available_nodes:
        if not resources_json:
            continue
        try:
            res = json.loads(resources_json)
        except json.JSONDecodeError:
            continue

        score = score_node(res, chunk.spec)
        if score > best_score:
            best_score = score
            best_node = node_id

    return best_node


async def process_chunk_success_async(chunk_id: str, node_id: str):
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)

    async with make_celery_session() as session:
        # Update node reliability
        node_result = await session.execute(select(Node).where(Node.id == node_id))
        node = node_result.scalar_one_or_none()
        if node:
            # Slow recovery
            node.reliability_score = min(1.0, node.reliability_score + 0.02)

        # Update chunk status
        chunk_result = await session.execute(select(Chunk).where(Chunk.id == chunk_id))
        chunk = chunk_result.scalar_one_or_none()
        if chunk:
            chunk.status = ChunkStatus.COMPLETED

        # Check if job is complete
        job_id = chunk.job_id
        pending_chunks = await session.execute(
            select(func.count(Chunk.id)).where(Chunk.job_id == job_id, Chunk.status != ChunkStatus.COMPLETED)
        )
        remaining = pending_chunks.scalar() or 0

        if remaining == 0:
            job_result = await session.execute(select(Job).where(Job.id == job_id))
            job = job_result.scalar_one_or_none()
            if job:
                job_type = job.type if isinstance(job.type, str) else job.type.value
                if job_type == "data":
                    from app.assembler.data_assembler import assemble_data
                    assemble_data.delay(str(job_id))
                elif job_type == "ml_training":
                    from app.assembler.ml_assembler import assemble_ml
                    assemble_ml.delay(str(job_id))
                elif job_type == "simulation":
                    from app.assembler.sim_assembler import assemble_simulation
                    assemble_simulation.delay(str(job_id))
                else:
                else:
                    from app.services.minio_service import minio_service
                    from app.core.config import get_settings
                    settings = get_settings()

                    # For demo purposes, we will return the URL of the first output payload!
                    first_chunk_key = f"{job_id}/chunk_0.tar.gz"
                    job.presigned_url = minio_service.get_presigned_url(
                        settings.BUCKET_JOB_OUTPUTS, 
                        first_chunk_key, 
                        expiry_hours=24
                    )
                    job.status = JobStatus.COMPLETED

        await session.commit()
    await r.aclose()


@celery.task(name="scheduler.chunk_success")
def chunk_success(chunk_id: str, node_id: str):
    async_to_sync(process_chunk_success_async)(chunk_id, node_id)


async def process_chunk_failed_async(chunk_id: str, node_id: str):
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    async with make_celery_session() as session:
        # Penalize node
        node_result = await session.execute(select(Node).where(Node.id == node_id))
        node = node_result.scalar_one_or_none()
        if node:
            node.reliability_score = max(0.0, node.reliability_score - 0.1)

        chunk_result = await session.execute(select(Chunk).where(Chunk.id == chunk_id))
        chunk = chunk_result.scalar_one_or_none()
        if chunk:
            chunk.status = ChunkStatus.FAILED
            
            job_result = await session.execute(select(Job).where(Job.id == chunk.job_id))
            job = job_result.scalar_one_or_none()
            if job:
                job.status = JobStatus.FAILED

        await session.commit()
    await r.aclose()


@celery.task(name="scheduler.chunk_failed")
def chunk_failed(chunk_id: str, node_id: str):
    async_to_sync(process_chunk_failed_async)(chunk_id, node_id)


async def process_dispatch_chunk_async(chunk_id: str):
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)

    async with make_celery_session() as session:
        # Load Chunk
        chunk_info = await session.get(Chunk, chunk_id)
        if not chunk_info or chunk_info.status != ChunkStatus.PENDING:
            await r.aclose()
            return

        # get_active_nodes() returns list[dict] with a "node_id" key injected.
        # Build the (node_id, resources_json_str) tuples that find_best_match needs.
        active_node_dicts = await redis_svc.get_active_nodes(30)

        nodes_with_res: list[tuple[str, str]] = []
        for node_dict in active_node_dicts:
            nid = node_dict.get("node_id")
            if not nid:
                continue
            # Check the node isn't currently busy
            status = await r.get(f"node:status:{nid}")
            if status == "busy":
                continue
            nodes_with_res.append((nid, json.dumps(node_dict)))

        logger.info(f"Dispatching chunk {chunk_id}: {len(nodes_with_res)} available nodes")

        # Find best node
        best_match_id = await find_best_match(chunk_info, nodes_with_res)

        if not best_match_id:
            # No node available right now — put back in queue (as normal priority)
            await redis_svc.push_chunk(chunk_id, priority="normal")
            logger.info(f"No node for chunk {chunk_id}, requeued")
            await r.aclose()
            return

        # Claim the node
        await redis_svc.mark_node_busy(best_match_id)

        # Update Postgres
        chunk_info.node_id = best_match_id
        chunk_info.status = ChunkStatus.ASSIGNED
        await session.commit()

        # CRITICAL FIX: dispatch_to_node() calls ws_manager.send_to_node() which
        # lives in the FastAPI (uvicorn) process.  Celery workers run in a DIFFERENT
        # process and have an empty ws_manager with no connections.
        # Fix: publish a Redis message so the FastAPI lifespan listener can forward it.
        import json as _json
        dispatch_payload = _json.dumps({
            "type": "chunk_dispatch",
            "target_node_id": best_match_id,
            "job_id": str(chunk_info.job_id),
            "chunk_id": str(chunk_info.id),
            "spec": chunk_info.spec,
        })
        await r.publish("node_dispatches", dispatch_payload)
        logger.info(f"Published chunk {chunk_id} dispatch to node {best_match_id} via Redis")

    await r.aclose()


@celery.task(name="scheduler.dispatch_chunk")
def dispatch_chunk(chunk_id: str):
    """Triggered by Queue arrival or when node becomes free."""
    async_to_sync(process_dispatch_chunk_async)(chunk_id)


async def process_dispatch_next_chunk_async():
    """Pops the next chunk from the queue and tries to match it."""
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)
    
    chunk_id = await redis_svc.pop_chunk()
    if chunk_id:
        logger.info(f"Dispatching next chunk from queue: {chunk_id}")
        await process_dispatch_chunk_async(chunk_id)
    
    await r.aclose()


@celery.task(name="scheduler.dispatch_next_chunk")
def dispatch_next_chunk():
    """Triggered when a node becomes available to handle the next queued item."""
    async_to_sync(process_dispatch_next_chunk_async)()
