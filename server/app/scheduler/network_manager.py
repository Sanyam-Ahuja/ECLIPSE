"""Overlay Network Manager for inter-node communication.

Handles Docker overlay networks for ML training (DDP/Local SGD) and
simulation (MPI) workloads where containers must communicate with peers.

MVP: Direct IP on campus LAN. SSH tunnels for cross-subnet. Full Docker
Swarm overlay deferred to V2.
"""

import logging
import json
from dataclasses import dataclass
from collections import defaultdict

import redis.asyncio as aioredis
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import async_session
from app.core.redis import RedisService
from app.models.node import Node
from app.models.chunk import Chunk, ChunkStatus

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class PeerInfo:
    node_id: str
    ip_address: str
    rank: int
    port: int  # Base port for comms (29500 + rank)


@dataclass
class NetworkConfig:
    """Network configuration broadcast to each node in a distributed job."""
    job_id: str
    network_mode: str  # "campugrid_overlay" | "none"
    world_size: int
    peers: list[PeerInfo]
    master_addr: str
    master_port: int
    minio_endpoint: str


class NetworkManager:
    """Manages overlay network setup for distributed jobs.

    For campus LAN (same subnet), containers communicate directly via IP.
    For cross-subnet, SSH tunnels would forward ports (V2).
    """

    def __init__(self):
        self.active_networks: dict[str, NetworkConfig] = {}

    async def setup_overlay(
        self,
        job_id: str,
        chunk_node_pairs: list[tuple[str, str]],  # [(chunk_id, node_id), ...]
    ) -> NetworkConfig:
        """Create network config for a distributed job.

        Args:
            job_id: The job requiring inter-node comms
            chunk_node_pairs: List of (chunk_id, node_id) tuples, ordered by rank
        """
        async with async_session() as session:
            peers = []
            for rank, (chunk_id, node_id) in enumerate(chunk_node_pairs):
                node_result = await session.execute(
                    select(Node).where(Node.id == node_id)
                )
                node = node_result.scalar_one_or_none()
                if not node:
                    raise ValueError(f"Node {node_id} not found")

                ip = node.ip_address or "127.0.0.1"
                peers.append(PeerInfo(
                    node_id=str(node.id),
                    ip_address=ip,
                    rank=rank,
                    port=29500 + rank,
                ))

            master = peers[0] if peers else None
            config = NetworkConfig(
                job_id=job_id,
                network_mode="campugrid_overlay",
                world_size=len(peers),
                peers=peers,
                master_addr=master.ip_address if master else "127.0.0.1",
                master_port=master.port if master else 29500,
                minio_endpoint=settings.MINIO_ENDPOINT,
            )

            self.active_networks[job_id] = config

            # Store in Redis so nodes can discover peers
            r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            await r.setex(
                f"network:{job_id}",
                3600,  # 1hr TTL
                json.dumps({
                    "world_size": config.world_size,
                    "master_addr": config.master_addr,
                    "master_port": config.master_port,
                    "peers": [
                        {
                            "node_id": p.node_id,
                            "ip": p.ip_address,
                            "rank": p.rank,
                            "port": p.port,
                        }
                        for p in config.peers
                    ],
                }),
            )
            await r.aclose()

            logger.info(
                f"Network overlay configured for job {job_id}: "
                f"{len(peers)} peers, master={config.master_addr}:{config.master_port}"
            )
            return config

    async def get_peer_addresses(self, job_id: str) -> dict[str, str]:
        """Get IP:port mapping for all nodes in this job."""
        config = self.active_networks.get(job_id)
        if not config:
            # Try Redis
            r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            data = await r.get(f"network:{job_id}")
            await r.aclose()
            if data:
                parsed = json.loads(data)
                return {
                    f"rank_{p['rank']}": f"{p['ip']}:{p['port']}"
                    for p in parsed["peers"]
                }
            return {}

        return {
            f"rank_{p.rank}": f"{p.ip_address}:{p.port}"
            for p in config.peers
        }

    async def get_env_for_rank(self, job_id: str, rank: int) -> dict[str, str]:
        """Build environment variables for a specific rank in a distributed job."""
        config = self.active_networks.get(job_id)
        if not config:
            return {}

        peers_json = json.dumps([
            f"{p.ip_address}:{p.port}" for p in config.peers
        ])

        return {
            "MASTER_ADDR": config.master_addr,
            "MASTER_PORT": str(config.master_port),
            "WORLD_SIZE": str(config.world_size),
            "RANK": str(rank),
            "LOCAL_RANK": "0",  # 1 GPU per node for MVP
            "CAMPUGRID_PEERS": peers_json,
            "CAMPUGRID_RANK": str(rank),
            "CAMPUGRID_WORLD_SIZE": str(config.world_size),
        }

    async def teardown(self, job_id: str) -> None:
        """Clean up network after job completes."""
        self.active_networks.pop(job_id, None)

        r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.delete(f"network:{job_id}")
        await r.aclose()

        logger.info(f"Network overlay torn down for job {job_id}")

    @staticmethod
    def is_lan_peer(ip_a: str, ip_b: str) -> bool:
        """Check if two nodes are on the same LAN (same /24 subnet)."""
        if not ip_a or not ip_b:
            return False
        subnet_a = ".".join(ip_a.split(".")[:3])
        subnet_b = ".".join(ip_b.split(".")[:3])
        return subnet_a == subnet_b

    @staticmethod
    def find_lan_cluster(
        nodes: list[tuple[str, str]],  # [(node_id, ip_address), ...]
        min_size: int,
    ) -> list[str] | None:
        """Find a group of min_size nodes all on the same LAN.

        Returns list of node_ids or None if no cluster found.
        """
        subnets: dict[str, list[str]] = defaultdict(list)
        for node_id, ip in nodes:
            if ip:
                subnet = ".".join(ip.split(".")[:3])
                subnets[subnet].append(node_id)

        # Return the largest qualifying cluster
        for subnet in sorted(subnets, key=lambda s: len(subnets[s]), reverse=True):
            if len(subnets[subnet]) >= min_size:
                return subnets[subnet][:min_size]

        return None


# Global singleton
network_manager = NetworkManager()
