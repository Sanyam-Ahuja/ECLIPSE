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


CATALOG: dict[tuple, CatalogEntry] = {
    ("render", "blender", True): CatalogEntry(
        image="lscr.io/linuxserver/blender:latest",
        entrypoint_template=(
            "export PATH=\"/usr/bin:/usr/local/bin:$PATH\" "
            "&& curl -sL '{INPUT_URL}' -o /tmp/input.blend "
            "&& blender -b --enable-autoexec /tmp/input.blend "
            "--python-expr \"import base64; exec(base64.b64decode(b'aW1wb3J0IGJweQpicHkub3BzLnByZWZlcmVuY2VzLmFkZG9uX2VuYWJsZShtb2R1bGU9J2N5Y2xlcycpCmJweS5jb250ZXh0LnNjZW5lLnJlbmRlci5lbmdpbmUgPSAnQ1lDTEVTJwpwcmVmcyA9IGJweS5jb250ZXh0LnByZWZlcmVuY2VzLmFkZG9uc1snY3ljbGVzJ10ucHJlZmVyZW5jZXMKcHJlZnMuZ2V0X2RldmljZXMoKQpmb3IgdCBpbiAoJ09QVElYJywgJ0NVREEnLCAnTUVUQUwnLCAnSElQJywgJ09ORUFQSScsICdOT05FJyk6CiAgICB0cnk6CiAgICAgICAgcHJlZnMuY29tcHV0ZV9kZXZpY2VfdHlwZSA9IHQKICAgICAgICBicmVhawogICAgZXhjZXB0OgogICAgICAgIHBhc3MKZm9yIGQgaW4gcHJlZnMuZGV2aWNlczoKICAgIGQudXNlID0gKGQudHlwZSA9PSBwcmVmcy5jb21wdXRlX2RldmljZV90eXBlKQpicHkuY29udGV4dC5zY2VuZS5jeWNsZXMuZGV2aWNlID0gJ0dQVScK').decode('utf-8'))\" "
            "-o /tmp/frame_#### -s {CHUNK_START} -e {CHUNK_END} -a "
            "&& tar -czf /tmp/output.tar.gz /tmp/frame_* "
            "&& curl -T /tmp/output.tar.gz '{UPLOAD_URL}'"
        ),
        env_vars=["INPUT", "CHUNK_START", "CHUNK_END", "OUTPUT_PATH"],
        gpu_required=True,
        preinstalled_packages=[],
        tested=True,
    ),
    ("ml_training", "pytorch", True): CatalogEntry(
        image="pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime",
        entrypoint_template=(
            "apt-get install -y unzip curl -qq 2>/dev/null || true "
            "&& curl -sL '{INPUT_URL}' -o /tmp/input_archive "
            "&& mkdir -p /input "
            "&& (unzip -o /tmp/input_archive -d /input 2>/dev/null || cp /tmp/input_archive /input/{INPUT}) "
            "&& mkdir -p /output/checkpoints "
            "&& cd /input && python {INPUT} "
            "&& tar -czf /tmp/output.tar.gz -C /output . "
            "&& curl -T /tmp/output.tar.gz '{UPLOAD_URL}'"
        ),
        env_vars=["INPUT", "OUTPUT_PATH", "SYNC_MODE", "CHECKPOINT_INTERVAL", "JOB_ID", "CHUNK_ID"],
        gpu_required=True,
        preinstalled_packages=[
            "torch==2.2.0", "torchvision==0.17.0", "numpy==1.26.4",
            "pandas==2.2.0"
        ],
        tested=True,
    ),
    ("ml_training", "tensorflow", True): CatalogEntry(
        image="tensorflow/tensorflow:2.16.1-gpu",
        entrypoint_template=(
            "apt-get install -y unzip curl -qq 2>/dev/null || true "
            "&& curl -sL '{INPUT_URL}' -o /tmp/input_archive "
            "&& mkdir -p /input "
            "&& (unzip -o /tmp/input_archive -d /input 2>/dev/null || cp /tmp/input_archive /input/{INPUT}) "
            "&& mkdir -p /output/checkpoints "
            "&& cd /input && python {INPUT} "
            "&& tar -czf /tmp/output.tar.gz -C /output . "
            "&& curl -T /tmp/output.tar.gz '{UPLOAD_URL}'"
        ),
        env_vars=["INPUT", "OUTPUT_PATH", "SYNC_MODE", "JOB_ID"],
        gpu_required=True,
        preinstalled_packages=[
            "tensorflow==2.16.1", "numpy==1.26.4", "pandas==2.2.0",
            "keras==3.0.0",
        ],
        tested=False,
    ),
    ("ml_training", "jax", True): CatalogEntry(
        image="google-deepmind/jax:latest",
        entrypoint_template=(
            "apt-get install -y unzip curl -qq 2>/dev/null || true "
            "&& curl -sL '{INPUT_URL}' -o /tmp/input_archive "
            "&& mkdir -p /input "
            "&& (unzip -o /tmp/input_archive -d /input 2>/dev/null || cp /tmp/input_archive /input/{INPUT}) "
            "&& mkdir -p /output/checkpoints "
            "&& cd /input && python {INPUT} "
            "&& tar -czf /tmp/output.tar.gz -C /output . "
            "&& curl -T /tmp/output.tar.gz '{UPLOAD_URL}'"
        ),
        env_vars=["INPUT", "OUTPUT_PATH", "JOB_ID"],
        gpu_required=True,
        preinstalled_packages=[
            "jax==0.4.25", "jaxlib==0.4.25", "flax==0.8.1",
            "optax==0.1.9", "numpy==1.26.4",
        ],
        tested=False,
    ),
    ("data", "python-data", False): CatalogEntry(
        image="python:3.11-slim",
        entrypoint_template=(
            "apt-get install -y unzip curl -qq 2>/dev/null || true "
            "&& curl -sL '{INPUT_URL}' -o /tmp/input_archive "
            "&& mkdir -p /input "
            "&& (unzip -o /tmp/input_archive -d /input 2>/dev/null || cp /tmp/input_archive /input/{INPUT}) "
            "&& mkdir -p /output "
            "&& pip install pandas numpy scipy -q "
            "&& cd /input && python {INPUT} "
            "&& tar -czf /tmp/output.tar.gz -C /output . "
            "&& curl -T /tmp/output.tar.gz '{UPLOAD_URL}'"
        ),
        env_vars=["INPUT", "OUTPUT_PATH", "CHUNK_START", "CHUNK_END"],
        gpu_required=False,
        preinstalled_packages=[
            "pandas==2.2.0", "numpy==1.26.4", "scipy==1.12.0"
        ],
        tested=True,
    ),
    # ── Simulation Images ──────────────────────────────────────
    ("simulation", "openfoam", False): CatalogEntry(
        image="campugrid/openfoam:2312",
        entrypoint_template="cd /workspace/case && decomposePar -force && mpirun -np 1 simpleFoam -parallel",
        env_vars=["MPI_RANK", "MPI_SIZE", "PROCESSOR_DIR"],
        gpu_required=False,
        preinstalled_packages=["openfoam-2312", "openmpi"],
        tested=False,
    ),
    ("simulation", "lammps", True): CatalogEntry(
        image="campugrid/lammps:gpu",
        entrypoint_template="lmp -in /workspace/{INPUT} -partition {CHUNK_END}x1",
        env_vars=["INPUT", "MPI_RANK", "MPI_SIZE"],
        gpu_required=True,
        preinstalled_packages=["lammps", "openmpi"],
        tested=False,
    ),
    ("simulation", "gromacs", False): CatalogEntry(
        image="campugrid/gromacs:2024",
        entrypoint_template="gmx mdrun -s /workspace/{INPUT} -dd {CHUNK_END} 1 1",
        env_vars=["INPUT", "MPI_RANK", "MPI_SIZE"],
        gpu_required=False,
        preinstalled_packages=["gromacs", "openmpi"],
        tested=False,
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
