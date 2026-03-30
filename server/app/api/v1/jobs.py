"""Job submission and management endpoints."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, TokenPayload
from app.models.job import Job, JobStatus
from app.schemas.job import (
    JobListItem,
    JobStatusResponse,
    JobSubmitResponse,
    PaginatedJobs,
    PriceEstimate,
)
from app.services.minio_service import minio_service
from app.utils.gpu_benchmarks import customer_price_per_hour, dynamic_multiplier, get_price_comparison
from app.core.config import get_settings
from app.pipeline.orchestrator import analyze_and_dispatch

settings = get_settings()
router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/", response_model=JobSubmitResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_job(
    files: list[UploadFile] = File(...),
    ml_sync_mode: str | None = None,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a job — upload files, create job record, kick AI pipeline."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required",
        )

    job_id = uuid4()
    input_path = f"{job_id}"

    # Upload files to MinIO
    for file in files:
        content = await file.read()
        key = f"{job_id}/{file.filename}"
        minio_service.upload_bytes(
            bucket=settings.BUCKET_JOB_INPUTS,
            key=key,
            data=content,
            content_type=file.content_type or "application/octet-stream",
        )

    # Create job record
    job = Job(
        id=job_id,
        user_id=current_user.user_id,
        status=JobStatus.ANALYZING,
        input_path=input_path,
        ml_sync_mode=ml_sync_mode,
    )
    db.add(job)
    await db.flush()
    await db.commit()

    # Kick off AI pipeline as Celery task
    analyze_and_dispatch.delay(str(job_id), str(current_user.user_id))

    return JobSubmitResponse(
        job_id=job_id,
        status="analyzing",
        message="Job submitted. AI pipeline is analyzing your files.",
    )


@router.get("/", response_model=PaginatedJobs)
async def list_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's jobs (paginated)."""
    # Count
    count_result = await db.execute(
        select(func.count(Job.id)).where(Job.user_id == current_user.user_id)
    )
    total = count_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * limit
    result = await db.execute(
        select(Job)
        .where(Job.user_id == current_user.user_id)
        .order_by(desc(Job.created_at))
        .offset(offset)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return PaginatedJobs(
        jobs=[JobListItem.model_validate(j) for j in jobs],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed job status with chunks."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.user_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobStatusResponse.model_validate(job)


@router.post("/{job_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_job(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running or queued job."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.user_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status.value}",
        )

    job.status = JobStatus.CANCELLED
    # TODO Phase 2: Cancel running chunks on nodes via WebSocket
    await db.flush()

    return {"job_id": str(job_id), "status": "cancelled"}


@router.get("/estimate/price", response_model=PriceEstimate)
async def get_price_estimate(
    gpu_tier: str = Query(..., examples=["RTX 4060"]),
    estimated_hours: float = Query(..., ge=0.1, examples=[4.0]),
    sync_mode: str = Query(default="local_sgd", pattern="^(local_sgd|ddp)$"),
):
    """Public endpoint: price estimate with competitor comparison."""
    base_price = customer_price_per_hour(gpu_tier)

    # For now, use static multiplier (no live supply/demand data yet)
    dyn_mult = 1.0
    sync_mult = 1.5 if sync_mode == "ddp" else 1.0

    total = round(base_price * estimated_hours * dyn_mult * sync_mult, 2)
    comparison = get_price_comparison(gpu_tier, estimated_hours)

    return PriceEstimate(
        gpu_tier=gpu_tier,
        estimated_hours=estimated_hours,
        base_price_per_hour=base_price,
        dynamic_multiplier=dyn_mult * sync_mult,
        total_estimate=total,
        comparison=comparison,
    )
