"""Assembles data chunks into a single final output."""

import logging
import os

from asgiref.sync import async_to_sync
from sqlalchemy import select

from app.api.v1.websocket import ws_manager
from app.celery_worker import celery_app as celery
from app.core.config import get_settings
from app.core.database import make_celery_session
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job, JobStatus
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)
settings = get_settings()


async def process_data_assembly_async(job_id: str):
    """Downloads all output chunks, concatenates them locally, and uploads the merged result."""
    # Ensure job actually completed all chunks
    async with make_celery_session() as session:
        job_result = await session.execute(select(Job).where(Job.id == job_id))
        job = job_result.scalar_one_or_none()
        if not job:
            return

        chunks_res = await session.execute(select(Chunk).where(Chunk.job_id == job_id))
        chunks = chunks_res.scalars().all()

        if any(c.status != ChunkStatus.COMPLETED for c in chunks):
            logger.warning(f"Job {job_id} assembler called but chunks not all complete.")
            return

        job.status = JobStatus.ASSEMBLING
        await session.commit()

        await ws_manager.broadcast_to_job(job_id, {
            "type": "detection_step",
            "job_id": str(job_id),
            "step": "assembling",
            "detail": "Merging map-reduce arrays locally..."
        })

    # We download all output shards locally into a temp folder
    temp_dir = f"/tmp/campugrid_assemble_{job_id}"
    os.makedirs(temp_dir, exist_ok=True)

    # Identify objects in Minio mapping to this job outputs
    prefix = f"{job_id}/"
    output_keys = minio_service.list_objects(settings.BUCKET_JOB_OUTPUTS, prefix=prefix)

    # Download them sequentially
    local_files = []
    for key in sorted(output_keys):
        local_path = os.path.join(temp_dir, key.replace("/", "_"))
        # In a real system, minio_service would have download_file, here we use download_bytes and write
        try:
            bts = minio_service.download_bytes(settings.BUCKET_JOB_OUTPUTS, key)
            with open(local_path, "wb") as f:
                f.write(bts)
            local_files.append(local_path)
        except Exception as e:
            logger.error(f"Failed to fetch {key}: {e}")

    # Merge strategy: CSV concat
    merged_path = os.path.join(temp_dir, "merged.csv")
    if local_files:
        with open(merged_path, 'w') as out:
            for i, shard in enumerate(sorted(local_files)):
                with open(shard) as f:
                    if i > 0:
                        f.readline()  # Skip headers for shards > 0
                    out.write(f.read())

        # Upload final back to minio
        final_key = f"{job_id}/final_merged.csv"
        with open(merged_path, "rb") as final_f:
            minio_service.upload_bytes(
                settings.BUCKET_JOB_OUTPUTS,
                final_key,
                final_f.read(),
                content_type="text/csv"
            )

        presigned = minio_service.get_presigned_url(settings.BUCKET_JOB_OUTPUTS, final_key)
    else:
        presigned = None

    # Final DB Update
    async with make_celery_session() as session:
        job_result = await session.execute(select(Job).where(Job.id == job_id))
        job = job_result.scalar_one()
        job.status = JobStatus.COMPLETED
        job.output_path = final_key if local_files else None
        job.presigned_url = presigned
        await session.commit()

        await ws_manager.broadcast_to_job(job_id, {
            "type": "job_complete",
            "job_id": str(job_id),
            "status": "completed",
            "download_url": presigned
        })


@celery.task(name="assembler.assemble_data")
def assemble_data(job_id: str):
    async_to_sync(process_data_assembly_async)(job_id)
