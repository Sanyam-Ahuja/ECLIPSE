"""Admin API — cluster overview, user management, and system health."""

import logging
from datetime import datetime, UTC, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenPayload, require_admin
from app.models.billing import BillingRecord
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job, JobStatus
from app.models.node import Node
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
async def get_overview(
    admin: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Full cluster overview — users, nodes, jobs, revenue."""

    # User counts
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    contributors = (await db.execute(
        select(func.count(User.id)).where(User.role.in_(["contributor", "both", "admin"]))
    )).scalar() or 0
    customers = (await db.execute(
        select(func.count(User.id)).where(User.role.in_(["customer", "both", "admin"]))
    )).scalar() or 0

    # Node counts
    total_nodes = (await db.execute(select(func.count(Node.id)))).scalar() or 0
    online_nodes = (await db.execute(
        select(func.count(Node.id)).where(Node.status == "online")
    )).scalar() or 0

    # Job counts
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar() or 0
    active_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.status.in_(["analyzing", "queued", "running", "assembling"]))
    )).scalar() or 0
    completed_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.status == "completed")
    )).scalar() or 0
    failed_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.status == "failed")
    )).scalar() or 0

    # Revenue
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Job.actual_cost), 0.0))
    )).scalar() or 0.0

    # GPU hours
    total_gpu_hours = (await db.execute(
        select(func.coalesce(func.sum(Node.total_gpu_hours), 0.0))
    )).scalar() or 0.0

    # Chunk counts
    total_chunks = (await db.execute(select(func.count(Chunk.id)))).scalar() or 0
    running_chunks = (await db.execute(
        select(func.count(Chunk.id)).where(Chunk.status == ChunkStatus.RUNNING)
    )).scalar() or 0

    return {
        "users": {
            "total": total_users,
            "contributors": contributors,
            "customers": customers,
        },
        "nodes": {
            "total": total_nodes,
            "online": online_nodes,
            "offline": total_nodes - online_nodes,
        },
        "jobs": {
            "total": total_jobs,
            "active": active_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
        },
        "chunks": {
            "total": total_chunks,
            "running": running_chunks,
        },
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_gpu_hours": round(total_gpu_hours, 2),
        },
    }


@router.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination."""
    offset = (page - 1) * limit

    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "role": u.role.value,
                "credit_balance": u.credit_balance,
                "nodes_count": len(u.nodes) if u.nodes else 0,
                "jobs_count": len(u.jobs) if u.jobs else 0,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str = Query(..., pattern="^(customer|contributor|both|admin)$"),
    admin: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = UserRole(role)
    await db.commit()

    return {"message": f"User {user.email} role updated to {role}"}


@router.get("/nodes")
async def list_all_nodes(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    admin: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all nodes across all users."""
    offset = (page - 1) * limit
    total = (await db.execute(select(func.count(Node.id)))).scalar() or 0
    result = await db.execute(
        select(Node).order_by(Node.created_at.desc()).offset(offset).limit(limit)
    )
    nodes = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "nodes": [
            {
                "id": str(n.id),
                "user_id": str(n.user_id),
                "hostname": n.hostname,
                "gpu_model": n.gpu_model,
                "gpu_vram_gb": n.gpu_vram_gb,
                "cpu_cores": n.cpu_cores,
                "ram_gb": n.ram_gb,
                "status": n.status,
                "reliability_score": n.reliability_score,
                "total_earned": n.total_earned,
                "total_gpu_hours": n.total_gpu_hours,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in nodes
        ],
    }


@router.get("/jobs")
async def list_all_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str = Query(default=None),
    admin: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs across all users."""
    offset = (page - 1) * limit
    query = select(Job)
    count_query = select(func.count(Job.id))

    if status:
        query = query.where(Job.status == status)
        count_query = count_query.where(Job.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(Job.created_at.desc()).offset(offset).limit(limit)
    )
    jobs = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "jobs": [
            {
                "id": str(j.id),
                "user_id": str(j.user_id),
                "type": j.type.value if j.type else None,
                "status": j.status.value,
                "actual_cost": j.actual_cost,
                "total_chunks": j.total_chunks,
                "completed_chunks": j.completed_chunks,
                "input_path": j.input_path,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
    }
