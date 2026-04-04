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
    import redis as sync_redis
    
    payload = json.dumps({
        "type": "detection_step",
        "job_id": job_id,
        "step": step,
        "detail": detail
    })
    
    try:
        # Use sync Redis to avoid event loop issues in Celery prefork workers
        r = sync_redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.publish("job_updates", payload)
        r.close()
    except Exception as e:
        logger.warning(f"Could not publish update for job {job_id}: {e}")


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
        logger.warning(f"Analysis failed for {job_id}: {e}. Prompting for Dockerfile.")
        async with make_celery_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.NEEDS_DOCKERFILE
                await session.commit()
        await send_customer_update(job_id, "needs_dockerfile", "Pipeline paused. Could not auto-detect workload type from uploaded file(s). Please provide a Dockerfile or authorize AI generation.")
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
        # Tier 2: Check if unknown imports require adaptation
        # Fast-path: skip Gemini entirely if all imports are already covered by the catalog image.
        # This avoids async/Celery deadlocks from the Gemini aio client.
        pre_installed = {pkg.split("==")[0] for pkg in cat_entry.preinstalled_packages}
        LOCAL_MODULE_PATTERNS = {"models", "utils", "config", "data", "train", "src", "test", "helpers", "common"}
        STDLIB_SKIP = {"os", "sys", "json", "re", "math", "time", "datetime", "logging", "pathlib",
                       "argparse", "random", "copy", "abc", "io", "typing", "collections", "functools",
                       "itertools", "hashlib", "uuid", "traceback", "warnings", "inspect", "shutil",
                       "subprocess", "threading", "multiprocessing", "socket", "struct", "enum", "dataclasses"}
        
        user_imports = set(profile.imports or [])
        truly_missing = user_imports - pre_installed - STDLIB_SKIP - LOCAL_MODULE_PATTERNS
        
        if not truly_missing:
            # All imports are covered — skip Gemini entirely
            await send_customer_update(job_id, "catalog", f"Match fully verified: {cat_entry.image}")
            v_res = type("V", (), {"compatible": True, "needs_adaptation": False, "conflicts": None, "image_tag": None})()
        else:
            logger.info(f"Unknown imports for {job_id}: {truly_missing} — calling Gemini verifier")
            await send_customer_update(job_id, "catalog", f"Found Base Match {cat_entry.image}. Running AI Import Verifier...")
            verifier = DockerConfigVerifier()
            # Run in a thread to avoid Celery async_to_sync deadlock with the aio Gemini client
            import asyncio
            v_res = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: __import__("asgiref.sync", fromlist=["async_to_sync"]).async_to_sync(
                    verifier.verify_and_adapt
                )(cat_entry, list(truly_missing), None)
            )

        if v_res.compatible and v_res.needs_adaptation:
            cat_entry.image = str(v_res.image_tag)
            cat_entry.tested = False
            await send_customer_update(job_id, "catalog", f"Adapter configured overlay pipeline requirements. Tag: {v_res.image_tag}")
        elif not v_res.compatible:
            async with make_celery_session() as session:
                result = await session.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.NEEDS_DOCKERFILE
                    await session.commit()
                    
            error_msg = (
                f"Your code requested dependencies that clashed with our base containers: {v_res.conflicts}\n\n"
                "Please upload a custom 'Dockerfile' alongside your code to resolve this. To adhere to CampuGrid architecture:\n"
                "1. Choose a valid base image (e.g. nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04 or python:3.11-slim).\n"
                "2. Use 'RUN pip install ...' for your dependencies.\n"
                "3. Use 'WORKDIR /workspace'.\n"
                "4. You do NOT need an ENTRYPOINT or CMD; CampuGrid natively injects execution wrappers automatically."
            )
            await send_customer_update(job_id, "needs_dockerfile", error_msg)
            return
        else:
            await send_customer_update(job_id, "catalog", f"Match fully verified: {cat_entry.image}")

    # 4. Split Chunks
    await send_customer_update(job_id, "splitting", "Calculating optimal chunk parallelism boundaries...")

    # Query redis to see how many nodes we have active to help splitter
    r = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_svc = RedisService(r)
    all_nodes = await redis_svc.get_active_nodes()
    
    available_nodes = 0
    for node in all_nodes:
        status = await redis_svc.get_node_status(node["node_id"])
        if status == "available":
            available_nodes += 1

    # Fetch job again to get requirements
    async with make_celery_session() as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        requires_public_network = job.requires_public_network if job else False

    chunks_data = compute_chunks(profile, available_nodes, cat_entry, requires_public_network, str(job_id))

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
                        "image": cat_entry.image,
                        "chunk_start": ch.chunk_start,
                        "chunk_end": ch.chunk_end,
                        "command": ch.command,
                        "env_vars": ch.env_vars,
                        "network_mode": ch.network_mode,
                        "requires_public_network": ch.requires_public_network,
                        "gpu_required": cat_entry.gpu_required,
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
