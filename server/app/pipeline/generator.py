"""Tier 3 AI Pipeline - Gemini Custom Raw Generation."""

import hashlib
import logging
from dataclasses import dataclass

import google.generativeai as genai

from app.core.config import get_settings
from app.pipeline.analyzer import JobProfile

logger = logging.getLogger(__name__)
settings = get_settings()

@dataclass
class GenerationResult:
    dockerfile: str
    image_tag: str
    cached: bool
    content_hash: str

class DockerfileGenerator:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    async def generate(
        self,
        source_code: str,
        requirements_txt: str | None,
        profile: JobProfile,
    ) -> GenerationResult:
        """Generate a complete Dockerfile for unknown codebase bounds using Gemini."""

        prompt = f"""You are a Dockerfile generator for a distributed GPU compute platform.
Generate a minimal, working Dockerfile for the code below.

STRICT RULES:
- Base: nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04 if GPU needed, else python:3.11-slim
- Install pip via apt if needed.
- Pin ALL package versions explicitly from requirements.txt or infer versions dynamically.
- For OpenCV if detected: apt-get update && apt-get install -y libgl1 libglib2.0-0
- Include WORKDIR /workspace
- Important: We inject entrypoint separately during launch! You do NOT need ENTRYPOINT or CMD. 

GPU required: {profile.gpu_required}
Framework detected: {profile.framework}

requirements.txt provided:
{requirements_txt or 'None — infer from imports inside source code'}

source code summary (first 3000 chars):
{source_code[:3000]}

OUTPUT ONLY RAW DOCKERFILE TEXT. No markdown formatting ticks. No explanation."""

        logger.info(f"Triggering Gemini AI Generation for raw unsupported frame {profile.framework}")

        try:
            response = await self.model.generate_content_async(prompt)
            dockerfile = response.text.replace('```dockerfile', '').replace('```', '').strip()

            content_hash = hashlib.sha256(dockerfile.encode()).hexdigest()[:16]
            image_tag = f"campugrid/generated/{content_hash}"

            # TODO Phase 3: We mock out Kaniko building
            logger.info(f"[MOCK BUILD] Generated Dockerfile, skipping Kaniko Build. Tag: {image_tag}")

            return GenerationResult(
                dockerfile=dockerfile,
                image_tag=image_tag,
                cached=True, # Bypassing kaniko
                content_hash=content_hash
            )

        except Exception as e:
            logger.error(f"Gemini API failure during raw generation: {e}")
            raise ValueError("Failed to ask Gemini to generate Docker payload")
