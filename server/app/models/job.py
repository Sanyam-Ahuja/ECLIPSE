"""Job model — tracks complete lifecycle of a submitted workload."""

import enum
from uuid import UUID

from sqlalchemy import Enum, Float, ForeignKey, Integer, JSON, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.core.database import Base


class JobType(str, enum.Enum):
    RENDER = "render"
    DATA = "data"
    ML_TRAINING = "ml_training"
    SIMULATION = "simulation"


class JobStatus(str, enum.Enum):
    ANALYZING = "analyzing"
    QUEUED = "queued"
    RUNNING = "running"
    ASSEMBLING = "assembling"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MLSyncMode(str, enum.Enum):
    DDP = "ddp"
    LOCAL_SGD = "local_sgd"


class Job(Base):
    __tablename__ = "jobs"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Job classification
    type: Mapped[JobType | None] = mapped_column(
        Enum(JobType, name="job_type"),
        nullable=True,  # Set after pipeline analysis
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"),
        default=JobStatus.ANALYZING,
        nullable=False,
    )
    ml_sync_mode: Mapped[MLSyncMode | None] = mapped_column(
        Enum(MLSyncMode, name="ml_sync_mode"),
        nullable=True,
    )

    # Container image
    container_image: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # AI pipeline results
    profile: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cost_estimate: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    actual_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Chunk tracking
    total_chunks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_chunks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Storage
    input_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    presigned_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Timestamps
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="jobs")
    chunks = relationship("Chunk", back_populates="job", lazy="selectin", cascade="all, delete-orphan")
    billing_records = relationship("BillingRecord", back_populates="job", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Job {self.id} type={self.type} status={self.status.value}>"
