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
            network_mode="none"
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
            network_mode="campugrid_overlay"
        ))
        
    return chunks


def compute_chunks(profile: JobProfile, available_nodes: int, catalog_entry) -> list[ChunkSpec]:
    """Route to proper chunk splitting logic."""
    if profile.type == 'render':
        return split_render(profile, available_nodes, catalog_entry)
    elif profile.type == 'ml_training':
        return split_ml(profile, available_nodes, catalog_entry)
        
    # Default generic
    return [ChunkSpec(
        chunk_index=1,
        chunk_start=0,
        chunk_end=1,
        command=catalog_entry.entrypoint_template.format(INPUT=profile.entry_file, CHUNK_START=0, CHUNK_END=1, OUTPUT_PATH="/output"),
        env_vars={},
        resources=profile.resources,
        network_mode="none"
    )]
