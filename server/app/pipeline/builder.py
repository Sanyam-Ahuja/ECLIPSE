"""Tier 4 — Kaniko Image Builder (Mocked for MVP).

In production, this triggers a rootless Kaniko container to build
Docker images from AI-generated Dockerfiles. For the MVP, we mock
the build process and return the pre-computed image tag directly.
"""

import hashlib
import logging
from dataclasses import dataclass

from app.core.config import get_settings
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class BuildResult:
    image_tag: str
    status: str  # "ready" | "building" | "failed"
    cached: bool
    registry_path: str | None = None


class KanikoBuilder:
    """Manages Docker image builds via Kaniko (rootless, daemonless).

    MVP: All builds are mocked — we return the tag as-is and skip
    the actual container build. The Gemini verifier/generator already
    produce deterministic content-hashed tags, so caching is implicit.
    """

    def __init__(self):
        self.registry_url = f"localhost:{settings.REGISTRY_PORT}" if hasattr(settings, "REGISTRY_PORT") else "localhost:5000"

    async def build(
        self,
        dockerfile: str,
        tag: str,
        build_context_files: dict[str, bytes] | None = None,
    ) -> BuildResult:
        """Trigger a Kaniko build (mocked for MVP).

        In production this would:
        1. Upload Dockerfile + context to MinIO build-contexts/{hash}/
        2. Launch a Kaniko executor container:
           docker run --rm \
             -v /minio-data/build-contexts/{hash}:/workspace \
             gcr.io/kaniko-project/executor:latest \
             --context /workspace \
             --destination {registry_url}/{tag} \
             --cache=true --cache-ttl=168h
        3. Track build status in container_images table
        4. Return when build completes
        """
        content_hash = hashlib.sha256(dockerfile.encode()).hexdigest()[:16]
        full_tag = f"{self.registry_url}/{tag}"

        logger.info(
            f"[MOCK KANIKO] Would build image {full_tag} from Dockerfile "
            f"({len(dockerfile)} bytes). Returning mock 'ready' status."
        )

        # In production: upload to MinIO, start Kaniko, poll for completion
        # For MVP: instant "ready"
        return BuildResult(
            image_tag=tag,
            status="ready",
            cached=True,
            registry_path=full_tag,
        )

    async def get_build_status(self, image_tag: str) -> str:
        """Check if a Kaniko build is still running.

        In production: query container_images table for build_status.
        MVP: always "ready".
        """
        return "ready"

    async def image_exists(self, image_tag: str) -> bool:
        """Check if image already exists in private registry.

        In production: HTTP GET to registry /v2/{name}/manifests/{tag}.
        MVP: always False (forces "build" path for testing).
        """
        logger.debug(f"[MOCK REGISTRY] Checking if {image_tag} exists → False (mock)")
        return False
