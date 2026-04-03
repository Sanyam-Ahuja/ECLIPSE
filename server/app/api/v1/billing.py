"""Billing and earnings endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_user
from app.models.billing import BillingRecord
from app.models.node import Node
from app.utils.gpu_benchmarks import contributor_net_per_hour

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/earnings")
async def get_earnings(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get contributor earnings summary."""
    # Get user's nodes
    nodes_result = await db.execute(
        select(Node).where(Node.user_id == current_user.user_id)
    )
    nodes = nodes_result.scalars().all()

    if not nodes:
        return {
            "total_earned": 0.0,
            "total_gpu_hours": 0.0,
            "current_rate_per_hour": 0.0,
            "nodes": [],
        }

    node_earnings = []
    for node in nodes:
        rate = contributor_net_per_hour(node.gpu_model)
        node_earnings.append({
            "node_id": str(node.id),
            "hostname": node.hostname,
            "gpu_model": node.gpu_model,
            "total_earned": node.total_earned,
            "total_gpu_hours": node.total_gpu_hours,
            "current_rate_per_hour_usd": rate,
            "current_rate_per_hour_inr": round(rate * 83, 2),  # Approx USD→INR
            "reliability_score": node.reliability_score,
            "current_streak": node.current_streak,
        })

    return {
        "total_earned": sum(n.total_earned for n in nodes),
        "total_gpu_hours": sum(n.total_gpu_hours for n in nodes),
        "current_rate_per_hour": contributor_net_per_hour(nodes[0].gpu_model) if nodes else 0,
        "nodes": node_earnings,
    }


@router.get("/history")
async def get_billing_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get billing records — works for both customers and contributors."""
    offset = (page - 1) * limit

    # Check records where user is customer OR contributor
    result = await db.execute(
        select(BillingRecord)
        .where(
            (BillingRecord.customer_id == current_user.user_id)
            | (BillingRecord.contributor_id == current_user.user_id)
        )
        .order_by(BillingRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    records = result.scalars().all()

    count_result = await db.execute(
        select(func.count(BillingRecord.id)).where(
            (BillingRecord.customer_id == current_user.user_id)
            | (BillingRecord.contributor_id == current_user.user_id)
        )
    )
    total = count_result.scalar() or 0

    return {
        "records": [
            {
                "id": str(r.id),
                "job_id": str(r.job_id),
                "gpu_hours": r.gpu_hours,
                "customer_charge": r.customer_charge,
                "contributor_credit": r.contributor_credit,
                "platform_fee": r.platform_fee,
                "dynamic_multiplier": r.dynamic_multiplier,
                "created_at": r.created_at.isoformat(),
                "role": "customer" if r.customer_id == current_user.user_id else "contributor",
            }
            for r in records
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
