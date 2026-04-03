"""BillingService — calculates chunk costs, records billing, aggregates earnings."""

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import BillingRecord
from app.models.chunk import Chunk
from app.models.job import Job
from app.models.node import Node
from app.utils.gpu_benchmarks import (
    CONTRIBUTOR_SHARE,
    ELECTRICITY_COST_PER_KWH,
    GPU_BENCHMARKS,
    ML_SYNC_MULTIPLIER,
    PLATFORM_CUT,
    customer_price_per_hour,
    dynamic_multiplier,
)

logger = logging.getLogger(__name__)


class BillingBreakdown:
    """Result of a chunk cost calculation."""

    def __init__(
        self,
        gpu_hours: float,
        customer_charge: float,
        contributor_gross: float,
        contributor_net: float,
        electricity_cost: float,
        platform_fee: float,
        dyn_multiplier: float,
    ):
        self.gpu_hours = gpu_hours
        self.customer_charge = customer_charge
        self.contributor_gross = contributor_gross
        self.contributor_net = contributor_net
        self.electricity_cost = electricity_cost
        self.platform_fee = platform_fee
        self.dynamic_multiplier = dyn_multiplier


class BillingService:
    """Handles all billing calculations and record keeping."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def calculate_chunk_cost(
        self,
        gpu_model: str,
        gpu_hours: float,
        sync_mode: str = "local_sgd",
        available_count: int = 10,
        total_count: int = 20,
        queue_depth: int = 5,
    ) -> BillingBreakdown:
        """Calculate cost breakdown for a completed chunk."""
        base_rate = customer_price_per_hour(gpu_model)
        sync_mult = ML_SYNC_MULTIPLIER.get(sync_mode, 1.0)
        dyn_mult = dynamic_multiplier(gpu_model, available_count, total_count, queue_depth)

        customer_charge = round(base_rate * gpu_hours * sync_mult * dyn_mult, 4)
        contributor_gross = round(customer_charge * CONTRIBUTOR_SHARE, 4)
        platform_fee = round(customer_charge * PLATFORM_CUT, 4)

        # Electricity deduction
        power_watts = GPU_BENCHMARKS.get(gpu_model, (0, 0, 200))[2]
        electricity_cost = round((power_watts / 1000) * ELECTRICITY_COST_PER_KWH * gpu_hours, 4)
        contributor_net = round(contributor_gross - electricity_cost, 4)

        return BillingBreakdown(
            gpu_hours=gpu_hours,
            customer_charge=customer_charge,
            contributor_gross=contributor_gross,
            contributor_net=contributor_net,
            electricity_cost=electricity_cost,
            platform_fee=platform_fee,
            dyn_multiplier=dyn_mult,
        )

    async def record_chunk_billing(
        self,
        chunk: Chunk,
        node: Node,
        job: Job,
        breakdown: BillingBreakdown,
    ) -> BillingRecord:
        """Write billing record to DB and update balances."""
        record = BillingRecord(
            job_id=chunk.job_id,
            chunk_id=chunk.id,
            customer_id=job.user_id,
            contributor_id=node.user_id,
            gpu_hours=breakdown.gpu_hours,
            customer_charge=breakdown.customer_charge,
            contributor_credit=breakdown.contributor_net,
            platform_fee=breakdown.platform_fee,
            dynamic_multiplier=breakdown.dynamic_multiplier,
        )
        self.db.add(record)

        # Update node earnings
        node.total_earned += breakdown.contributor_net
        node.total_gpu_hours += breakdown.gpu_hours

        # Update chunk cost
        chunk.cost = breakdown.customer_charge
        chunk.gpu_hours = breakdown.gpu_hours

        # Update job actual_cost
        if job.actual_cost is None:
            job.actual_cost = 0.0
        job.actual_cost += breakdown.customer_charge

        await self.db.flush()
        logger.info(
            f"Billing recorded: chunk={chunk.id} charge=${breakdown.customer_charge:.4f} "
            f"contributor_net=${breakdown.contributor_net:.4f}"
        )
        return record

    async def get_user_total_gpu_hours(self, user_id: str) -> float:
        """Aggregate total GPU hours for a user (as customer)."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(BillingRecord.gpu_hours), 0.0)).where(
                BillingRecord.customer_id == user_id
            )
        )
        return float(result.scalar() or 0.0)

    async def get_user_total_spent(self, user_id: str) -> float:
        """Aggregate total spent by a customer."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(BillingRecord.customer_charge), 0.0)).where(
                BillingRecord.customer_id == user_id
            )
        )
        return float(result.scalar() or 0.0)

    async def get_total_gpu_hours_today(self) -> float:
        """Get total GPU hours consumed today across the platform."""
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.coalesce(func.sum(BillingRecord.gpu_hours), 0.0)).where(
                BillingRecord.created_at >= today_start
            )
        )
        return float(result.scalar() or 0.0)
