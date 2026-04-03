"""Step 6: Chunk computation based on specific workloads."""

import logging
from dataclasses import dataclass

from app.pipeline.analyzer import JobProfile, Resources

logger = logging.getLogger(__name__)


@dataclass
class ChunkSpec:
    chunk_index: int
    chunk_start: int | float
    chunk_end: int | float
    command: str
    env_vars: dict[str, str]
    resources: Resources
    network_mode: str = "none"
    requires_public_network: bool = False


def split_render(profile: JobProfile, available_nodes: int, catalog_entry) -> list[ChunkSpec]:
    """Frame-range parallelism for rendering workloads."""
    start = int(profile.split_params.get("frame_start", 1))
    end = int(profile.split_params.get("frame_end", 250))
    total_frames = max(1, end - start + 1)
    
    # Simple chunking logic
    num_chunks = min(available_nodes, total_frames) if available_nodes > 0 else 1
    # Fallback to defaults if we have very little chunks (e.g. less than 10)
    if num_chunks < 1 and total_frames > 20: 
        num_chunks = 4 

    frames_per_chunk = total_frames // num_chunks
    chunks = []

    for i in range(num_chunks):
        chunk_start = start + (i * frames_per_chunk)
        chunk_end = start + ((i + 1) * frames_per_chunk) - 1
        
        # Last chunk sweeps up remainder
        if i == num_chunks - 1:
            chunk_end = end
            
        cmd = catalog_entry.entrypoint_template.format(
            INPUT=profile.entry_file,
            CHUNK_START=chunk_start,
            CHUNK_END=chunk_end,
            OUTPUT_PATH="/output"
        )
        
        chunks.append(ChunkSpec(
            chunk_index=i+1,
            chunk_start=chunk_start,
            chunk_end=chunk_end,
            command=cmd,
            env_vars={
                "CHUNK_START": str(chunk_start),
                "CHUNK_END": str(chunk_end),
            },
            resources=profile.resources,
            network_mode="none",
            requires_public_network=getattr(profile, 'requires_public_network', False)
        ))
        
    return chunks


def split_ml(profile: JobProfile, available_nodes: int, catalog_entry) -> list[ChunkSpec]:
    """Data parallelism logic for ML. Every node gets same model script but separate data seeds."""
    num_chunks = min(available_nodes, 4) if available_nodes > 0 else 1
    
    chunks = []
    for i in range(num_chunks):
        cmd = catalog_entry.entrypoint_template.format(INPUT=profile.entry_file)
        # We assign an implicit worker ID via CHUNK_START mapped as rank
        chunks.append(ChunkSpec(
            chunk_index=i+1,
            chunk_start=i,
            chunk_end=i,
            command=cmd,
            env_vars={
                "WORLD_SIZE": str(num_chunks),
                "RANK": str(i),
            },
            resources=profile.resources,
            # If DDP is requested, we need network. Else local_sgd is basically 'none' but needs periodic sync?
            # Actually local_sgd means we just run individually and merge later via MinIO. 
            # We'll stick to 'campugrid_overlay' for standard ML if they need sync
            network_mode="campugrid_overlay",
            requires_public_network=getattr(profile, 'requires_public_network', False)
        ))
        
    return chunks


def split_data(profile: JobProfile, available_nodes: int, catalog_entry) -> list[ChunkSpec]:
    """Shard CSV/Parquet by byte ranges for map-reduce processing."""
    file_size = profile.split_params.get("file_size", 0)
    if file_size <= 0:
        return [ChunkSpec(
            chunk_index=1, chunk_start=0, chunk_end=0,
            command=catalog_entry.entrypoint_template.format(INPUT=profile.entry_file, CHUNK_START=0, CHUNK_END=0, OUTPUT_PATH="/output"),
            env_vars={"INPUT": profile.entry_file, "CHUNK_START": "0", "CHUNK_END": "0"},
            resources=profile.resources, network_mode="none"
        )]
        
    num_chunks = min(available_nodes, 8) if available_nodes > 0 else 1
    target_shard_size = file_size // num_chunks
    
    chunks = []
    for i in range(num_chunks):
        start_byte = i * target_shard_size
        end_byte = (i + 1) * target_shard_size if i < num_chunks - 1 else file_size
        
        cmd = catalog_entry.entrypoint_template.format(INPUT=profile.entry_file, CHUNK_START=start_byte, CHUNK_END=end_byte, OUTPUT_PATH="/output")
        chunks.append(ChunkSpec(
            chunk_index=i+1,
            chunk_start=start_byte,
            chunk_end=end_byte,
            command=cmd,
            env_vars={
                "INPUT": profile.entry_file,
                "CHUNK_START": str(start_byte),
                "CHUNK_END": str(end_byte),
            },
            resources=profile.resources,
            network_mode="none",
            requires_public_network=getattr(profile, 'requires_public_network', False)
        ))
        
    return chunks


def split_simulation(profile: JobProfile, available_nodes: int, catalog_entry) -> list[ChunkSpec]:
    """Domain decomposition for simulation workloads (OpenFOAM, LAMMPS, GROMACS).

    For OpenFOAM: maps to decomposePar processor directories.
    For LAMMPS: spatial decomposition via -partition flag.
    For GROMACS: domain decomposition via -dd flag.
    """
    # Simulations are typically limited to power-of-2 or factor-based decompositions
    num_chunks = min(available_nodes, 4) if available_nodes > 0 else 1

    # Prefer powers of 2 for MPI decomposition
    valid_decomps = [1, 2, 4, 8, 16]
    num_chunks = max(d for d in valid_decomps if d <= num_chunks)

    chunks = []
    for i in range(num_chunks):
        if profile.framework == "openfoam":
            cmd = f"cd /workspace/case && decomposePar -force && mpirun -np 1 simpleFoam -parallel -case /workspace/case"
            env_vars = {
                "MPI_RANK": str(i),
                "MPI_SIZE": str(num_chunks),
                "PROCESSOR_DIR": f"processor{i}",
            }
        elif profile.framework == "lammps":
            input_file = profile.split_params.get("input_file", "in.lammps")
            cmd = f"lmp -in /workspace/{input_file} -partition {num_chunks}x1"
            env_vars = {
                "MPI_RANK": str(i),
                "MPI_SIZE": str(num_chunks),
            }
        elif profile.framework == "gromacs":
            tpr_file = profile.split_params.get("tpr_file", "topol.tpr")
            cmd = f"gmx mdrun -s /workspace/{tpr_file} -dd {num_chunks} 1 1"
            env_vars = {
                "MPI_RANK": str(i),
                "MPI_SIZE": str(num_chunks),
            }
        else:
            cmd = catalog_entry.entrypoint_template.format(
                INPUT=profile.entry_file, CHUNK_START=i, CHUNK_END=i,
                OUTPUT_PATH="/output"
            )
            env_vars = {"MPI_RANK": str(i), "MPI_SIZE": str(num_chunks)}

        chunks.append(ChunkSpec(
            chunk_index=i + 1,
            chunk_start=i,
            chunk_end=i,
            command=cmd,
            env_vars=env_vars,
            resources=profile.resources,
            network_mode="campugrid_overlay",  # MPI needs inter-node comms
            requires_public_network=getattr(profile, 'requires_public_network', False)
        ))

    return chunks


def compute_chunks(profile: JobProfile, available_nodes: int, catalog_entry, requires_public_network: bool = False) -> list[ChunkSpec]:
    """Route to proper chunk splitting logic."""
    profile.requires_public_network = requires_public_network # Temporary attach
    if profile.type == 'render':
        return split_render(profile, available_nodes, catalog_entry)
    elif profile.type == 'ml_training':
        return split_ml(profile, available_nodes, catalog_entry)
    elif profile.type == 'data':
        return split_data(profile, available_nodes, catalog_entry)
    elif profile.type == 'simulation':
        return split_simulation(profile, available_nodes, catalog_entry)
        
    # Default generic
    return [ChunkSpec(
        chunk_index=1,
        chunk_start=0,
        chunk_end=1,
        command=catalog_entry.entrypoint_template.format(INPUT=profile.entry_file, CHUNK_START=0, CHUNK_END=1, OUTPUT_PATH="/output"),
        env_vars={},
        resources=profile.resources,
        network_mode="none",
        requires_public_network=requires_public_network
    )]
