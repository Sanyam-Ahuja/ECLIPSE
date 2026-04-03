"""Pydantic schemas for Node endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

# ── Request Schemas ─────────────────────────────────────────────

class NodeRegister(BaseModel):
    """Register a contributor machine."""
    hostname: str = Field(..., max_length=255, examples=["samito-laptop"])
    cpu_cores: int = Field(..., ge=1, examples=[8])
    ram_gb: float = Field(..., ge=1, examples=[24.0])
    gpu_model: str = Field(..., max_length=100, examples=["RTX 4060"])
    gpu_vram_gb: float = Field(..., ge=0, examples=[8.0])
    cuda_version: str | None = Field(None, examples=["12.1"])
    os: str = Field(..., max_length=50, examples=["linux"])
    bandwidth_mbps: float = Field(default=0.0, examples=[94.2])
    ip_address: str | None = Field(None, examples=["192.168.1.50"])


class NodeHeartbeat(BaseModel):
    """Heartbeat payload sent every 10 seconds."""
    node_id: str
    available: bool = True
    resources: dict = Field(
        ...,
        examples=[{
            "cpu_cores": 6,
            "ram_gb": 11.2,
            "gpu_vram_gb": 7.4,
            "gpu_model": "RTX 4060",
            "gpu_cuda_version": "12.1",
            "bandwidth_mbps": 94.2,
            "cached_images": ["campugrid/pytorch:2.2-cuda12"],
            "gpu_temp_celsius": 42,
            "reliability_score": 0.94,
        }],
    )


class NodeSettingsUpdate(BaseModel):
    """Contributor settings update."""
    resource_limits: dict | None = Field(None, examples=[{
        "max_cpu_percent": 80,
        "max_ram_gb": 16,
        "max_gpu_percent": 100,
        "temp_cutoff_celsius": 83,
        "schedule": {"start": "22:00", "end": "08:00", "days": ["mon", "tue", "wed", "thu", "fri"]},
    }])


# ── Response Schemas ────────────────────────────────────────────

class NodeResponse(BaseModel):
    id: UUID
    hostname: str
    cpu_cores: int
    ram_gb: float
    gpu_model: str
    gpu_vram_gb: float
    cuda_version: str | None
    os: str
    reliability_score: float
    total_earned: float
    total_gpu_hours: float
    status: str
    current_streak: int
    longest_streak: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ClusterStats(BaseModel):
    """Public cluster statistics."""
    total_nodes: int
    active_nodes: int
    total_gpu_hours_today: float
    jobs_completed_today: int
    available_gpu_models: list[str]
