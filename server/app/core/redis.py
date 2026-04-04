"""Redis connection pool and helper operations."""

import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()

redis_pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    max_connections=50,
    decode_responses=True,
)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """Dependency: yields a Redis connection from the pool."""
    client = aioredis.Redis(connection_pool=redis_pool)
    try:
        yield client
    finally:
        await client.aclose()


class RedisService:
    """High-level Redis operations for CampuGrid."""

    def __init__(self, redis: aioredis.Redis):
        self.redis = redis

    # ── Heartbeat Registry ──────────────────────────────────────
    # Sorted set: key=node_id, score=timestamp (epoch seconds)

    async def update_heartbeat(self, node_id: str, resources: dict) -> None:
        """Update node heartbeat in sorted set + store resource snapshot."""
        now = datetime.now(UTC).timestamp()
        pipe = self.redis.pipeline()
        pipe.zadd("heartbeat:nodes", {node_id: now})
        pipe.set(f"node:resources:{node_id}", json.dumps(resources), ex=60)
        await pipe.execute()

    async def get_active_nodes(self, timeout_seconds: int = 30) -> list[dict]:
        """Get all nodes with heartbeat within timeout."""
        cutoff = datetime.now(UTC).timestamp() - timeout_seconds
        node_ids = await self.redis.zrangebyscore("heartbeat:nodes", cutoff, "+inf")

        nodes = []
        for node_id in node_ids:
            resources_raw = await self.redis.get(f"node:resources:{node_id}")
            if resources_raw:
                resources = json.loads(resources_raw)
                resources["node_id"] = node_id
                nodes.append(resources)
        return nodes

    async def remove_node(self, node_id: str) -> None:
        """Remove node from heartbeat registry."""
        pipe = self.redis.pipeline()
        pipe.zrem("heartbeat:nodes", node_id)
        pipe.delete(f"node:resources:{node_id}")
        await pipe.execute()

    # ── Node Status ─────────────────────────────────────────────

    async def mark_node_busy(self, node_id: str) -> None:
        await self.redis.set(f"node:status:{node_id}", "busy", ex=3600)

    async def claim_node(self, node_id: str) -> bool:
        """Atomically claim a node for a workload. Returns True if successful."""
        # Use SET with NX (set if not exists) to prevent race conditions
        # where multiple workers try to claim the same node.
        # We check both the heartbeat status and a specific 'busy' lock.
        success = await self.redis.set(f"node:status:{node_id}", "busy", ex=3600, nx=True)
        return bool(success)

    async def mark_node_available(self, node_id: str) -> None:
        await self.redis.delete(f"node:status:{node_id}")

    async def get_node_status(self, node_id: str) -> str:
        status = await self.redis.get(f"node:status:{node_id}")
        return status or "available"

    # ── Job Queue ───────────────────────────────────────────────
    # Two queues: priority (rescued chunks) and normal

    async def push_chunk(self, chunk_id: str, priority: str = "normal") -> None:
        """Push chunk to job queue."""
        if priority == "high":
            await self.redis.lpush("queue:chunks:priority", chunk_id)
        else:
            await self.redis.rpush("queue:chunks:normal", chunk_id)

    async def pop_chunk(self) -> str | None:
        """Pop next chunk — priority queue first."""
        chunk_id = await self.redis.lpop("queue:chunks:priority")
        if chunk_id:
            return chunk_id
        return await self.redis.lpop("queue:chunks:normal")

    async def get_queue_depth(self) -> int:
        """Total pending chunks across both queues."""
        priority = await self.redis.llen("queue:chunks:priority")
        normal = await self.redis.llen("queue:chunks:normal")
        return priority + normal

    # ── Pub/Sub ─────────────────────────────────────────────────

    async def publish(self, channel: str, message: dict) -> None:
        """Publish event for WebSocket broadcasting."""
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe(self, *channels: str):
        """Subscribe to channels. Returns async pubsub object."""
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(*channels)
        return pubsub
