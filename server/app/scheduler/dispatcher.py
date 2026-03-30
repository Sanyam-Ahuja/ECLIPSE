"""Delivers job specifications to node agents."""

import json
from app.api.v1.websocket import ws_manager
from app.models.chunk import Chunk

async def dispatch_to_node(node_id: str, chunk: Chunk):
    """Formats dispatch message and streams it down the node's individual WebSocket tunnel."""
    # Assuming connection manager maps correctly
    
    message = {
        "type": "job_dispatch",
        "job_id": str(chunk.job_id),
        "chunk_id": str(chunk.id),
        "spec": chunk.spec,
    }
    
    # Send directly over active socket
    await ws_manager.send_to_node(node_id, message)
