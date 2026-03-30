"""Step 2: Deep Context Analysis."""

import ast
import json
import logging
from dataclasses import dataclass
from typing import Any

from app.services.minio_service import minio_service
from app.core.config import get_settings
from app.pipeline.detector import FileDetection

logger = logging.getLogger(__name__)


@dataclass
class Resources:
    vram_gb: float
    ram_gb: float
    cpu_cores: int


@dataclass
class JobProfile:
    type: str               # 'render', 'data', 'ml_training', 'simulation'
    framework: str | None   # 'pytorch', 'blender', 'openfoam', etc.
    gpu_required: bool
    resources: Resources
    split_params: dict      # e.g. {frame_start, frame_end}
    confidence: float
    entry_file: str


# ── Analyzers ──────────────────────────────────────────────────

def analyze_blend(job_id: str, file_keys: list[str]) -> JobProfile:
    """Analyze a Blender project without external readers like blend-file-reader."""
    # Since we can't reliably parse .blend binary in Python natively without a huge custom module, 
    # we'll assume standard parameters: Frames 1-250, CYCLES, GPU required.
    # We are returning a strong confidence profile so the splitter can handle it.
    blend_file = next(k for k in file_keys if k.endswith('.blend'))
    
    return JobProfile(
        type="render",
        framework="blender",
        gpu_required=True,
        resources=Resources(vram_gb=4.0, ram_gb=8.0, cpu_cores=4),
        split_params={"frame_start": 1, "frame_end": 250}, # Mock defaults until binary parsing
        confidence=0.8,
        entry_file=blend_file,
    )


def analyze_python(job_id: str, file_keys: list[str]) -> JobProfile:
    """Analyze Python scripts using AST to extract imports safely."""
    # Find the main entry point
    py_files = [k for k in file_keys if k.endswith('.py')]
    entry_file = None
    if "train.py" in py_files:
        entry_file = "train.py"
    elif "main.py" in py_files:
        entry_file = "main.py"
    elif py_files:
        entry_file = py_files[0]
    
    if not entry_file:
        raise ValueError("No entry_file found for Python workload")
    
    # Download the script from MinIO to read AST
    settings = get_settings()
    script_content = minio_service.download_bytes(settings.BUCKET_JOB_INPUTS, entry_file)
    
    try:
        tree = ast.parse(script_content)
    except SyntaxError:
        raise ValueError("Invalid Python syntax in entry_file")

    # Extract all imports
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names:
                imports.add(n.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split('.')[0])
                
    # Detect framework based on imports
    framework = None
    gpu_required = False
    
    if "torch" in imports:
        framework = "pytorch"
        # Deep inspect if `.cuda()` is called
        if b".cuda()" in script_content or b".to('cuda" in script_content or b"device='cuda" in script_content:
            gpu_required = True
    elif "tensorflow" in imports:
        framework = "tensorflow"
        gpu_required = True # Usually tensorflow implies GPU if asked for grid compute
    elif "jax" in imports:
        framework = "jax"
        gpu_required = True
    elif "pandas" in imports or "polars" in imports:
        framework = "python-data"
        
    return JobProfile(
        type="ml_training" if framework in ["pytorch", "tensorflow", "jax"] else "data",
        framework=framework,
        gpu_required=gpu_required,
        resources=Resources(vram_gb=8.0 if gpu_required else 0.0, ram_gb=16.0, cpu_cores=8),
        split_params={}, # By default ml_training local_sgd doesn't need split ranges here
        confidence=0.9,
        entry_file=entry_file,
    )


# ── Dispatcher ─────────────────────────────────────────────────

def analyze_files(job_id: str, file_keys: list[str], detections: list[FileDetection]) -> JobProfile:
    """Determine the primary workload type based on detection results and call detailed analyzer."""
    primary_type = "unknown"
    confidence = 0.0
    
    for det in detections:
        if det.file_type == "blender" and det.confidence > 0.7:
            return analyze_blend(job_id, file_keys)
            
        elif det.file_type == "python_script" and det.confidence > 0.8:
            return analyze_python(job_id, file_keys)
            
    # Default fallback
    raise ValueError("Could not determine a valid JobProfile from uploaded files")
