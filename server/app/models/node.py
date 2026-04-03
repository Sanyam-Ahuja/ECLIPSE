"""Node model — contributor machines with specs, reliability, and earnings."""

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NodeStatus(str, enum.Enum):
    ONLINE = "online"
    BUSY = "busy"
    OFFLINE = "offline"
    SUSPENDED = "suspended"


class Node(Base):
    __tablename__ = "nodes"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)

    # Hardware specs
    cpu_cores: Mapped[int] = mapped_column(Integer, nullable=False)
    ram_gb: Mapped[float] = mapped_column(Float, nullable=False)
    gpu_model: Mapped[str] = mapped_column(String(100), nullable=False)
    gpu_vram_gb: Mapped[float] = mapped_column(Float, nullable=False)
    cuda_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    os: Mapped[str] = mapped_column(String(50), nullable=False)

    # Performance tracking
    reliability_score: Mapped[float] = mapped_column(Float, default=0.8, nullable=False)
    total_earned: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_gpu_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bandwidth_mbps: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Security
    cert_fingerprint: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # State
    status: Mapped[NodeStatus] = mapped_column(
        Enum(NodeStatus, name="node_status"),
        default=NodeStatus.OFFLINE,
        nullable=False,
    )
    resource_limits: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cached_images: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # Gamification
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_contribution_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="nodes")
    chunks = relationship("Chunk", back_populates="node", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Node {self.hostname} gpu={self.gpu_model} status={self.status.value}>"
