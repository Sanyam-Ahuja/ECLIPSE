"""BillingRecord model — per-chunk financial record."""

from uuid import UUID

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BillingRecord(Base):
    __tablename__ = "billing_records"

    job_id: Mapped[UUID] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    chunk_id: Mapped[UUID] = mapped_column(ForeignKey("chunks.id"), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    contributor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Financial breakdown
    gpu_hours: Mapped[float] = mapped_column(Float, nullable=False)
    customer_charge: Mapped[float] = mapped_column(Float, nullable=False)
    contributor_credit: Mapped[float] = mapped_column(Float, nullable=False)
    platform_fee: Mapped[float] = mapped_column(Float, nullable=False)
    dynamic_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="billing_records")
    chunk = relationship("Chunk", back_populates="billing_record")

    def __repr__(self) -> str:
        return f"<BillingRecord job={self.job_id} charge=${self.customer_charge:.2f}>"
