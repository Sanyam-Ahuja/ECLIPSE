"""Step 3: Tier 1 Docker Config Matcher."""

from dataclasses import dataclass
from app.pipeline.analyzer import JobProfile


@dataclass
class CatalogEntry:
    image: str
    entrypoint_template: str
    env_vars: list[str]
    gpu_required: bool
    preinstalled_packages: list[str]
    tested: bool


# The hardcoded standard images
CATALOG: dict[tuple, CatalogEntry] = {
    ("render", "blender", True): CatalogEntry(
        image="campugrid/blender:4.1-cycles",
        entrypoint_template="blender -b /input/{INPUT} -s {CHUNK_START} -e {CHUNK_END} -o {OUTPUT_PATH}/frame_####.png -a",
        env_vars=["INPUT", "CHUNK_START", "CHUNK_END", "OUTPUT_PATH"],
        gpu_required=True,
        preinstalled_packages=[],
        tested=True,
    ),
    ("ml_training", "pytorch", True): CatalogEntry(
        image="campugrid/pytorch:2.2-cuda12",
        entrypoint_template="python /campugrid/entrypoint_wrapper.sh /input/{INPUT}",
        env_vars=["INPUT", "OUTPUT_PATH", "SYNC_MODE", "CHECKPOINT_INTERVAL", "JOB_ID", "CHUNK_ID"],
        gpu_required=True,
        preinstalled_packages=[
            "torch==2.2.0", "torchvision==0.17.0", "numpy==1.26.4", 
            "pandas==2.2.0"
        ],
        tested=True,
    ),
    ("data", "python-data", False): CatalogEntry(
        image="campugrid/python-data:3.11",
        entrypoint_template="python /input/{INPUT}",
        env_vars=["INPUT", "OUTPUT_PATH", "CHUNK_START", "CHUNK_END"],
        gpu_required=False,
        preinstalled_packages=[
            "pandas==2.2.0", "numpy==1.26.4", "scipy==1.12.0"
        ],
        tested=True,
    ),
}


def lookup(profile: JobProfile) -> CatalogEntry | None:
    """Return an exact matching CatalogEntry or None if verification is needed."""
    key = (profile.type, profile.framework, profile.gpu_required)
    
    # Standard lookup
    if key in CATALOG:
        return CATALOG[key]
        
    # Provide fallback options for ml_training CPU variants if GPU is not needed but we only have GPU containers
    fallback_key = (profile.type, profile.framework, True)
    if not profile.gpu_required and fallback_key in CATALOG:
        # Give them the GPU image but without passing --gpus device
        return CATALOG[fallback_key]

    return None
