"""Full AI Pipeline Orchestrator."""

import logging

import redis.asyncio as aioredis
from asgiref.sync import async_to_sync
from sqlalchemy import select

from app.celery_worker import celery_app as celery
from app.core.config import get_settings
from app.core.database import make_celery_session
from app.core.redis import RedisService, redis_pool
from app.models.chunk import Chunk, ChunkStatus
from app.models.job import Job, JobStatus, JobType
from app.pipeline.analyzer import analyze_files
from app.pipeline.catalog import CatalogEntry, lookup
from app.pipeline.detector import detect_file
from app.pipeline.generator import DockerfileGenerator
from app.pipeline.security import SecurityScanner, ThreatLevel
from app.pipeline.splitter import compute_chunks
from app.pipeline.verifier import DockerConfigVerifier
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_customer_update(job_id: str, step: str, detail: str):
    import json
    
    payload = json.dumps({
        "type": "detection_step",
        "job_id": job_id,
        "step": step,
        "detail": detail
    })
    
    try:
        client = aioredis.Redis(connection_pool=redis_pool)
        await client.publish("job_updates", payload)
    finally:
        pass # Client is reused from pool


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

    # 2.5. Security Scan (Tier 1)
    await send_customer_update(job_id, "security_scan", "Scanning for malicious patterns and crypto-miners...")
    scanner = SecurityScanner()
    try:
        findings = await scanner.scan_job(job_id, file_keys)

        # Block if any HIGH or CRITICAL threats are found
        high_threats = [f for f in findings if f.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]]
        if high_threats:
            msg = f"Security Violation: {high_threats[0].category} ({high_threats[0].message})"
            await send_customer_update(job_id, "failed", msg)

            # Update DB
            async with make_celery_session() as session:
                result = await session.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.FAILED
                    await session.commit()
            return

        if findings:
            await send_customer_update(job_id, "security_scan", f"Security: {len(findings)} low/medium warnings found (Execution permitted).")
        else:
            await send_customer_update(job_id, "security_scan", "Security verification passed.")

    except Exception as e:
        logger.error(f"Security scan failed for {job_id}: {e}")
        # We don't fail for internal scanner errors, but log them
        pass

    # 3. Lookup Catalog
    await send_customer_update(job_id, "catalog", "Looking for matching Pre-verified Docker Containers...")
    cat_entry = lookup(profile)

    if not cat_entry:
        # Check if user has explicitly asked for AI generation or provided a custom dockerfile resolution
        async with make_celery_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if not job or job.status != JobStatus.ANALYZING:
                # If they passed this block via the resume endpoint, we can generate AI
                pass
            else:
                job.status = JobStatus.NEEDS_DOCKERFILE
                await session.commit()
                await send_customer_update(job_id, "needs_dockerfile", "Pipeline paused. Could not find a catalog match. Please provide a Dockerfile or authorize AI generation.")
                return

        await send_customer_update(job_id, "catalog", "Authorized: Triggering Tier 3 Gemini Code Generator...")
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
            cat_entry.image = str(v_res.image_tag)
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

    # Fetch job again to get requirements
    async with make_celery_session() as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        requires_public_network = job.requires_public_network if job else False

    chunks_data = compute_chunks(profile, active_nodes, cat_entry, requires_public_network)

    await send_customer_update(job_id, "queued", f"Generated {len(chunks_data)} execution units for P2P dispatch.")

    # Write to database mapping job back to real schema
    async with make_celery_session() as session:
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
                        "network_mode": ch.network_mode,
                        "requires_public_network": ch.requires_public_network,
                        "vram_gb": profile.resources.vram_gb,
                        "ram_gb": profile.resources.ram_gb
                    },
                    estimated_seconds=3600
                )
                session.add(db_chunk)
                await session.flush()
                # Trigger Scheduler: Push to Redis + Notify Matcher
                await redis_svc.push_chunk(str(db_chunk.id))
                from app.scheduler.matcher import dispatch_chunk
                dispatch_chunk.delay(str(db_chunk.id))

            await session.commit()

        # Emit completion message to unblock the frontend and display the JobProfileCard
        import json
        import dataclasses
        completion_payload = json.dumps({
            "type": "pipeline_complete",
            "job_id": job_id,
            "profile": dataclasses.asdict(profile)
        })
        await r.publish("job_updates", completion_payload)

    await r.aclose()


@celery.task(name="pipeline.analyze_and_dispatch")
def analyze_and_dispatch(job_id: str, user_id: str):
    """Entry point from FastAPI triggering async workflow inside Celery worker."""
    async_to_sync(process_pipeline_async)(job_id, user_id)
