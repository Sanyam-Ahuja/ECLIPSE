"""Event-Driven Node Matching engine with LAN detection."""

import json
import logging
from collections import defaultdict

import redis.asyncio as aioredis
from asgiref.sync import async_to_sync
from sqlalchemy import func, select

from app.celery_worker import celery_app as celery
from app.core.config import get_settings
from app.core.database import async_session
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

    async with async_session() as session:
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
                    job.status = JobStatus.COMPLETED

        await session.commit()
    await r.aclose()


@celery.task(name="scheduler.chunk_success")
def chunk_success(chunk_id: str, node_id: str):
    async_to_sync(process_chunk_success_async)(chunk_id, node_id)


async def process_dispatch_chunk_async(chunk_id: str):
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)

    async with async_session() as session:
        # Load Chunk
        chunk_info = await session.get(Chunk, chunk_id)
        if not chunk_info or chunk_info.status != ChunkStatus.PENDING:
            return

        # Get active nodes
        active_nodes_ids = await redis_svc.get_active_nodes(30)

        # Load resources for active nodes from redis (heartbeats keep this hot)
        nodes_with_res = []
        for nid in active_nodes_ids:
            # We assume node resources are stored as json when heartbeat pulses
            res_str = await r.hget("node_resources", nid)
            if res_str:
                nodes_with_res.append((nid, res_str))

        # Find match
        best_match_id = await find_best_match(chunk_info, nodes_with_res)

        if not best_match_id:
            # Requeue if no node found
            await redis_svc.push_chunk(chunk_id, priority=0)
            return

        # We got a node! Claim it.
        await redis_svc.mark_node_busy(best_match_id)

        # Update PG Database
        chunk_info.node_id = best_match_id
        chunk_info.status = ChunkStatus.ASSIGNED
        await session.commit()

        # Broadcast via Dispatcher task
        from app.scheduler.dispatcher import dispatch_to_node
        await dispatch_to_node(best_match_id, chunk_info)

    await r.aclose()


@celery.task(name="scheduler.dispatch_chunk")
def dispatch_chunk(chunk_id: str):
    """Triggered by Queue arrival or when node becomes free."""
    async_to_sync(process_dispatch_chunk_async)(chunk_id)
