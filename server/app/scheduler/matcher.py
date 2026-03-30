"""Event-Driven Node Matching engine."""

import logging
from celery import Celery
import redis.asyncio as aioredis
import json

from sqlalchemy import select

from app.core.database import async_sessionmaker
from app.core.config import get_settings
from app.core.redis import RedisService
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job
from app.models.node import Node

from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)
settings = get_settings()

celery = Celery(
    "campugrid_scheduler", 
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)


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


async def process_dispatch_chunk_async(chunk_id: str):
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)
    
    async with async_sessionmaker() as session:
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
            res_str = await r.hget(f"node_resources", nid)
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
