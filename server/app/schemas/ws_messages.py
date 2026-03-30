"""Typed WebSocket message schemas."""

from pydantic import BaseModel
from typing import Literal


# ── Node → Server Messages ──────────────────────────────────────

class WSHeartbeat(BaseModel):
    type: Literal["heartbeat"] = "heartbeat"
    node_id: str
    available: bool
    resources: dict


class WSChunkAck(BaseModel):
    """Node acknowledges receipt of a chunk dispatch."""
    type: Literal["chunk_ack"] = "chunk_ack"
    chunk_id: str
    node_id: str


class WSChunkProgress(BaseModel):
    """Node reports chunk progress."""
    type: Literal["chunk_progress"] = "chunk_progress"
    chunk_id: str
    job_id: str
    progress_percent: float
    current_step: str  # e.g., "frame 42/75" or "epoch 3/10"
    gpu_utilization: float
    gpu_temp_celsius: float
    gpu_vram_used_gb: float


class WSChunkComplete(BaseModel):
    """Node reports chunk completion."""
    type: Literal["chunk_complete"] = "chunk_complete"
    chunk_id: str
    job_id: str
    node_id: str
    exit_code: int
    output_keys: list[str]  # MinIO keys for output files
    gpu_hours: float
    logs: str = ""  # Last 1000 chars of stdout


class WSChunkFailed(BaseModel):
    """Node reports chunk failure."""
    type: Literal["chunk_failed"] = "chunk_failed"
    chunk_id: str
    job_id: str
    node_id: str
    exit_code: int
    error: str
    logs: str = ""


# ── Server → Node Messages ──────────────────────────────────────

class WSJobDispatch(BaseModel):
    """Server dispatches a chunk to a node."""
    type: Literal["job_dispatch"] = "job_dispatch"
    job_id: str
    chunk_id: str
    image: str
    command: str
    env_vars: dict
    input_keys: list[str]
    output_prefix: str
    resource_limits: dict
    network_mode: str  # "none" or "campugrid_overlay"
    checkpoint_config: dict | None = None
    timeout_seconds: int = 3600


class WSJobCancel(BaseModel):
    type: Literal["job_cancel"] = "job_cancel"
    chunk_id: str


# ── Server → Customer Messages ──────────────────────────────────

class WSDetectionStep(BaseModel):
    """Pipeline detection progress streamed to customer."""
    type: Literal["detection_step"] = "detection_step"
    job_id: str
    step: str  # "detecting", "analyzing", "catalog", "splitting", "estimating"
    detail: str
    completed: bool = False


class WSJobQueued(BaseModel):
    type: Literal["job_queued"] = "job_queued"
    job_id: str
    chunks: int
    estimated_minutes: float
    cost_estimate: float


class WSChunkUpdate(BaseModel):
    """Real-time chunk status update for customer monitoring."""
    type: Literal["chunk_update"] = "chunk_update"
    job_id: str
    chunk_id: str
    chunk_index: int
    status: str
    node_info: dict | None = None  # {gpu_model, location, anonymized_id}
    progress_percent: float = 0.0
    current_step: str = ""
    gpu_utilization: float = 0.0


class WSChunkRescued(BaseModel):
    type: Literal["chunk_rescued"] = "chunk_rescued"
    job_id: str
    chunk_id: str
    reason: str
    retry: int
    has_checkpoint: bool


class WSJobComplete(BaseModel):
    type: Literal["job_complete"] = "job_complete"
    job_id: str
    download_url: str
    total_cost: float
    total_gpu_hours: float


class WSJobFailed(BaseModel):
    type: Literal["job_failed"] = "job_failed"
    job_id: str
    reason: str
