"""Full AI Pipeline Orchestrator."""

import logging
from celery import Celery

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, async_session
from app.core.redis import RedisService
import redis.asyncio as aioredis
from app.core.config import get_settings
from app.api.v1.websocket import ws_manager
from sqlalchemy import select

from app.models.job import Job, JobStatus, JobType
from app.models.chunk import Chunk, ChunkStatus
from app.services.minio_service import minio_service

from app.pipeline.detector import detect_file
from app.pipeline.analyzer import analyze_files
from app.pipeline.catalog import lookup, CatalogEntry
from app.pipeline.splitter import compute_chunks
from app.pipeline.verifier import DockerConfigVerifier
from app.pipeline.generator import DockerfileGenerator

from asgiref.sync import async_to_sync

from app.celery_worker import celery_app as celery
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_customer_update(job_id: str, step: str, detail: str):
    await ws_manager.broadcast_to_job(job_id, {
        "type": "detection_step",
        "job_id": job_id,
        "step": step,
        "detail": detail
    })


async def process_pipeline_async(job_id: str, user_id: str):
    # Retrieve MinIO object keys
    prefix = f"{job_id}/"
    file_keys = minio_service.list_objects(settings.BUCKET_JOB_INPUTS, prefix=prefix)
    
    if not file_keys:
        logger.error(f"No files found for job {job_id}")
        return

    await send_customer_update(job_id, "detecting", "Reading file formats safely via MinIO...")
    
    # 1. Detect
    detections = []
    for key in file_keys:
        filename = key.split("/")[-1]
        det = detect_file(job_id, key, filename)
        detections.append(det)
        
    # 2. Analyze
    await send_customer_update(job_id, "analyzing", "Deep context analysis running...")
    
    try:
        profile = analyze_files(job_id, file_keys, detections)
    except Exception as e:
        await send_customer_update(job_id, "failed", f"Analysis error: {str(e)}")
        # update db status to FAILED
        return

    await send_customer_update(job_id, "analyzing", f"Detected profile: {profile.type} ({profile.framework})")
    
    # 3. Lookup Catalog
    await send_customer_update(job_id, "catalog", "Looking for matching Pre-verified Docker Containers...")
    cat_entry = lookup(profile)
    
    if not cat_entry:
        await send_customer_update(job_id, "catalog", "No strict tier 1 match. Triggering Tier 3 Gemini Code Generator...")
        try:
            generator = DockerfileGenerator()
            # Fetch script code for context
            src_bytes = minio_service.download_bytes(settings.BUCKET_JOB_INPUTS, profile.entry_file)
            src_str = src_bytes.decode('utf-8')
            
            gen_result = await generator.generate(src_str, None, profile)
            cat_entry = CatalogEntry(
                image=gen_result.image_tag,
                entrypoint_template="python /workspace/{INPUT}",
                env_vars=["INPUT", "OUTPUT_PATH", "CHUNK_START", "CHUNK_END", "JOB_ID"],
                gpu_required=profile.gpu_required,
                preinstalled_packages=[],
                tested=False
            )
            await send_customer_update(job_id, "catalog", f"Generated AI Image Tag: {gen_result.image_tag}")
        except Exception as e:
            await send_customer_update(job_id, "failed", f"Analysis error generating AI payload: {e}")
            return
            
    else:
        # Tier 2: Check imports overlap using Verifier
        await send_customer_update(job_id, "catalog", f"Found Base Match {cat_entry.image}. Running AI Import Verifier...")
        verifier = DockerConfigVerifier()
        v_res = await verifier.verify_and_adapt(cat_entry, profile.imports, None)
        
        if v_res.compatible and v_res.needs_adaptation:
            cat_entry.image = v_res.image_tag
            cat_entry.tested = False
            await send_customer_update(job_id, "catalog", f"Adapter configured overlay pipeline requirements. Tag: {v_res.image_tag}")
        elif not v_res.compatible:
            await send_customer_update(job_id, "failed", f"AI verified incompatible container configs: {v_res.conflicts}")
            return
        else:
            await send_customer_update(job_id, "catalog", f"Match fully verified: {cat_entry.image}")
    
    # 4. Split Chunks
    await send_customer_update(job_id, "splitting", "Calculating optimal chunk parallelism boundaries...")
    
    # Query redis to see how many nodes we have active to help splitter
    r = aioredis.Redis.from_url(settings.REDIS_URL)
    redis_svc = RedisService(r)
    active_nodes = len(await redis_svc.get_active_nodes())
    
    chunks_data = compute_chunks(profile, active_nodes, cat_entry)
    
    await send_customer_update(job_id, "queued", f"Generated {len(chunks_data)} execution units for P2P dispatch.")
    
    # Write to database mapping job back to real schema
    async with async_session() as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.type = JobType(profile.type)
            job.status = JobStatus.QUEUED
            job.container_image = cat_entry.image
            job.profile = {
                "framework": profile.framework,
                "gpu": profile.gpu_required,
                "vram": profile.resources.vram_gb,
                "split_keys": profile.split_params
            }
            job.total_chunks = len(chunks_data)
            
            # persist chunks
            for ch in chunks_data:
                db_chunk = Chunk(
                    job_id=job.id,
                    chunk_index=ch.chunk_index,
                    status=ChunkStatus.PENDING,
                    spec={
                        "chunk_start": ch.chunk_start,
                        "chunk_end": ch.chunk_end,
                        "command": ch.command,
                        "env_vars": ch.env_vars,
                        "network_mode": ch.network_mode
                    },
                    estimated_seconds=3600
                )
                session.add(db_chunk)
                await session.flush()
                # Push id to Redis Queue after DB confirm
                await redis_svc.push_chunk(str(db_chunk.id))
            
            await session.commit()
    
    await r.aclose()


@celery.task(name="pipeline.analyze_and_dispatch")
def analyze_and_dispatch(job_id: str, user_id: str):
    """Entry point from FastAPI triggering async workflow inside Celery worker."""
    async_to_sync(process_pipeline_async)(job_id, user_id)
