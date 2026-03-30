"""Node registration and management endpoints."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_contributor, TokenPayload
from app.core.redis import RedisService, get_redis
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobStatus
from app.schemas.node import NodeRegister, NodeResponse, NodeSettingsUpdate, ClusterStats

import redis.asyncio as aioredis

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.post("/register", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def register_node(
    data: NodeRegister,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a contributor machine."""
    node = Node(
        user_id=current_user.user_id,
        hostname=data.hostname,
        cpu_cores=data.cpu_cores,
        ram_gb=data.ram_gb,
        gpu_model=data.gpu_model,
        gpu_vram_gb=data.gpu_vram_gb,
        cuda_version=data.cuda_version,
        os=data.os,
        bandwidth_mbps=data.bandwidth_mbps,
        ip_address=data.ip_address,
        status=NodeStatus.ONLINE,
        last_heartbeat=datetime.now(timezone.utc),
    )
    db.add(node)
    await db.flush()
    await db.refresh(node)

    return NodeResponse.model_validate(node)


@router.get("/me", response_model=list[NodeResponse])
async def get_my_nodes(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all nodes belonging to the current user."""
    result = await db.execute(
        select(Node).where(Node.user_id == current_user.user_id)
    )
    nodes = result.scalars().all()
    return [NodeResponse.model_validate(n) for n in nodes]


@router.patch("/me/{node_id}/settings", response_model=NodeResponse)
async def update_node_settings(
    node_id: str,
    data: NodeSettingsUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update contributor node settings (resource limits, schedule)."""
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.user_id == current_user.user_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    if data.resource_limits is not None:
        node.resource_limits = data.resource_limits

    await db.flush()
    await db.refresh(node)
    return NodeResponse.model_validate(node)


@router.get("/stats", response_model=ClusterStats)
async def get_cluster_stats(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Public endpoint: cluster-wide statistics."""
    redis_svc = RedisService(redis)

    # Total nodes
    total_result = await db.execute(select(func.count(Node.id)))
    total_nodes = total_result.scalar() or 0

    # Active nodes (heartbeat within 30s)
    active_nodes_list = await redis_svc.get_active_nodes(timeout_seconds=30)
    active_nodes = len(active_nodes_list)

    # Jobs completed today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    jobs_today_result = await db.execute(
        select(func.count(Job.id)).where(
            Job.status == JobStatus.COMPLETED,
            Job.completed_at >= today_start,
        )
    )
    jobs_completed_today = jobs_today_result.scalar() or 0

    # GPU models available
    gpu_result = await db.execute(
        select(Node.gpu_model).distinct().where(Node.status != NodeStatus.SUSPENDED)
    )
    gpu_models = [row[0] for row in gpu_result.all()]

    return ClusterStats(
        total_nodes=total_nodes,
        active_nodes=active_nodes,
        total_gpu_hours_today=0.0,  # TODO: aggregate from billing records
        jobs_completed_today=jobs_completed_today,
        available_gpu_models=gpu_models,
    )
