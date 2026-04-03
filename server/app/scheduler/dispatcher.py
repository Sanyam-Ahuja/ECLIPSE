"""Delivers job specifications to node agents.

Handles dispatch for:
- Standard jobs: single chunk → single node
- DDP jobs: coordinated multi-node launch with torchrun env vars
- Local SGD jobs: independent nodes with peer discovery
- Simulation jobs: MPI-coordinated launch
"""

import logging

from app.api.v1.websocket import ws_manager
from app.models.chunk import Chunk
from app.scheduler.network_manager import network_manager

logger = logging.getLogger(__name__)


async def dispatch_to_node(node_id: str, chunk: Chunk):
    """Send a single chunk dispatch to a specific node."""
    message = {
        "type": "job_dispatch",
        "job_id": str(chunk.job_id),
        "chunk_id": str(chunk.id),
        "spec": chunk.spec,
    }
    await ws_manager.send_to_node(node_id, message)


async def dispatch_ddp_job(
    job_id: str,
    chunks: list[Chunk],
    node_ids: list[str],
):
    """Coordinate multi-node DDP launch.

    All nodes must start within ~60s of each other (torchrun timeout).
    Each node gets MASTER_ADDR, MASTER_PORT, WORLD_SIZE, RANK env vars.
    """
    world_size = len(chunks)

    # Setup overlay network
    chunk_node_pairs = [
        (str(chunks[i].id), node_ids[i]) for i in range(world_size)
    ]
    network_config = await network_manager.setup_overlay(job_id, chunk_node_pairs)

    for rank, (chunk, node_id) in enumerate(zip(chunks, node_ids)):
        # Get rank-specific env vars from network manager
        rank_env = await network_manager.get_env_for_rank(job_id, rank)

        # Merge DDP env into chunk spec
        ddp_env = {
            **rank_env,
            "CAMPUGRID_JOB_TYPE": "ml_training",
            "CAMPUGRID_SYNC_MODE": "ddp",
            "CAMPUGRID_JOB_ID": str(job_id),
            "CAMPUGRID_CHUNK_ID": str(chunk.id),
        }

        spec = chunk.spec.copy() if chunk.spec else {}
        spec_env = spec.get("env_vars", {})
        spec_env.update(ddp_env)
        spec["env_vars"] = spec_env
        spec["network_mode"] = "campugrid_overlay"

        # Override command with torchrun
        user_script = spec.get("command", "").split()[-1] if spec.get("command") else "train.py"
        spec["command"] = (
            f"torchrun --nproc_per_node=1 --nnodes={world_size} "
            f"--node_rank={rank} --master_addr={network_config.master_addr} "
            f"--master_port={network_config.master_port} {user_script}"
        )

        message = {
            "type": "job_dispatch",
            "job_id": str(job_id),
            "chunk_id": str(chunk.id),
            "spec": spec,
            "distributed": True,
            "sync_mode": "ddp",
            "world_size": world_size,
            "rank": rank,
        }

        success = await ws_manager.send_to_node(node_id, message)
        if success:
            logger.info(f"DDP dispatch: rank {rank} → node {node_id}")
        else:
            logger.error(f"DDP dispatch FAILED: rank {rank} → node {node_id}")

    logger.info(f"DDP job {job_id} dispatched to {world_size} nodes")


async def dispatch_local_sgd_job(
    job_id: str,
    chunks: list[Chunk],
    node_ids: list[str],
):
    """Dispatch Local SGD job — each node trains independently with periodic sync.

    Nodes get peer addresses so they can exchange weights every N steps.
    """
    world_size = len(chunks)

    # Setup overlay network for peer discovery
    chunk_node_pairs = [
        (str(chunks[i].id), node_ids[i]) for i in range(world_size)
    ]
    network_config = await network_manager.setup_overlay(job_id, chunk_node_pairs)

    for rank, (chunk, node_id) in enumerate(zip(chunks, node_ids)):
        rank_env = await network_manager.get_env_for_rank(job_id, rank)

        lsgd_env = {
            **rank_env,
            "CAMPUGRID_JOB_TYPE": "ml_training",
            "CAMPUGRID_SYNC_MODE": "local_sgd",
            "CAMPUGRID_SYNC_INTERVAL": "100",
            "CAMPUGRID_JOB_ID": str(job_id),
            "CAMPUGRID_CHUNK_ID": str(chunk.id),
        }

        spec = chunk.spec.copy() if chunk.spec else {}
        spec_env = spec.get("env_vars", {})
        spec_env.update(lsgd_env)
        spec["env_vars"] = spec_env
        spec["network_mode"] = "campugrid_overlay"

        message = {
            "type": "job_dispatch",
            "job_id": str(job_id),
            "chunk_id": str(chunk.id),
            "spec": spec,
            "distributed": True,
            "sync_mode": "local_sgd",
            "world_size": world_size,
            "rank": rank,
        }

        await ws_manager.send_to_node(node_id, message)
        logger.info(f"Local SGD dispatch: rank {rank} → node {node_id}")

    logger.info(f"Local SGD job {job_id} dispatched to {world_size} nodes")


async def dispatch_simulation_job(
    job_id: str,
    chunks: list[Chunk],
    node_ids: list[str],
    framework: str,
):
    """Dispatch MPI simulation job across multiple nodes."""
    world_size = len(chunks)

    chunk_node_pairs = [
        (str(chunks[i].id), node_ids[i]) for i in range(world_size)
    ]
    network_config = await network_manager.setup_overlay(job_id, chunk_node_pairs)

    for rank, (chunk, node_id) in enumerate(zip(chunks, node_ids)):
        rank_env = await network_manager.get_env_for_rank(job_id, rank)

        sim_env = {
            **rank_env,
            "CAMPUGRID_JOB_TYPE": "simulation",
            "CAMPUGRID_FRAMEWORK": framework,
            "CAMPUGRID_JOB_ID": str(job_id),
            "CAMPUGRID_CHUNK_ID": str(chunk.id),
        }

        spec = chunk.spec.copy() if chunk.spec else {}
        spec_env = spec.get("env_vars", {})
        spec_env.update(sim_env)
        spec["env_vars"] = spec_env
        spec["network_mode"] = "campugrid_overlay"

        message = {
            "type": "job_dispatch",
            "job_id": str(job_id),
            "chunk_id": str(chunk.id),
            "spec": spec,
            "distributed": True,
            "framework": framework,
        }

        await ws_manager.send_to_node(node_id, message)
        logger.info(f"Simulation dispatch ({framework}): rank {rank} → node {node_id}")
