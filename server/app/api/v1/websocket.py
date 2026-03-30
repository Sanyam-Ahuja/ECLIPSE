"""WebSocket connection manager and route handlers."""

import json
import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from starlette.websockets import WebSocketState

from app.core.redis import RedisService, get_redis
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages WebSocket connections for nodes and customers."""

    def __init__(self):
        # node_id → WebSocket
        self.node_connections: dict[str, WebSocket] = {}
        # job_id → [WebSocket clients]
        self.customer_connections: dict[str, list[WebSocket]] = {}

    # ── Node Connections ────────────────────────────────────────

    async def connect_node(self, node_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.node_connections[node_id] = websocket
        logger.info(f"Node {node_id} connected. Total nodes: {len(self.node_connections)}")

    def disconnect_node(self, node_id: str) -> None:
        self.node_connections.pop(node_id, None)
        logger.info(f"Node {node_id} disconnected. Total nodes: {len(self.node_connections)}")

    async def send_to_node(self, node_id: str, data: dict) -> bool:
        """Send a message to a specific node. Returns success."""
        ws = self.node_connections.get(node_id)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            try:
                await ws.send_json(data)
                return True
            except Exception as e:
                logger.error(f"Failed to send to node {node_id}: {e}")
                self.disconnect_node(node_id)
        return False

    # ── Customer Connections ────────────────────────────────────

    async def connect_customer(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if job_id not in self.customer_connections:
            self.customer_connections[job_id] = []
        self.customer_connections[job_id].append(websocket)
        logger.info(f"Customer connected to job {job_id}. Watchers: {len(self.customer_connections[job_id])}")

    def disconnect_customer(self, job_id: str, websocket: WebSocket) -> None:
        if job_id in self.customer_connections:
            self.customer_connections[job_id] = [
                ws for ws in self.customer_connections[job_id] if ws != websocket
            ]
            if not self.customer_connections[job_id]:
                del self.customer_connections[job_id]

    async def broadcast_to_job(self, job_id: str, data: dict) -> None:
        """Broadcast a message to all customers watching a job."""
        watchers = self.customer_connections.get(job_id, [])
        disconnected = []
        for ws in watchers:
            if ws.client_state == WebSocketState.CONNECTED:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.append(ws)
            else:
                disconnected.append(ws)
        # Clean up disconnected
        for ws in disconnected:
            self.disconnect_customer(job_id, ws)

    async def broadcast_to_user(self, user_id: str, data: dict) -> None:
        """Broadcast to all job watchers for a given user (future: user-level channel)."""
        # For now, this is a no-op — we'd need a user→job mapping
        pass


# Global singleton
ws_manager = ConnectionManager()


# ── WebSocket Routes ────────────────────────────────────────────

@router.websocket("/ws/node/{node_id}")
async def ws_node_connection(
    websocket: WebSocket,
    node_id: str,
    token: str = Query(...),
):
    """Persistent WebSocket for contributor node agents."""
    # TODO: validate token before accepting
    await ws_manager.connect_node(node_id, websocket)

    redis_client = aioredis.Redis.from_url("redis://localhost:6379/0", decode_responses=True)
    redis_svc = RedisService(redis_client)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "heartbeat":
                # Update heartbeat in Redis
                await redis_svc.update_heartbeat(
                    node_id=node_id,
                    resources=data.get("resources", {}),
                )
                # If node is available, check for pending chunks
                if data.get("available", False):
                    await redis_svc.mark_node_available(node_id)
                    # TODO Phase 2: trigger scheduler.on_node_available
                else:
                    await redis_svc.mark_node_busy(node_id)

            elif msg_type == "chunk_ack":
                logger.info(f"Node {node_id} ACKed chunk {data.get('chunk_id')}")
                # TODO Phase 2: update chunk status to 'running'

            elif msg_type == "chunk_progress":
                # Forward progress to customer
                job_id = data.get("job_id")
                if job_id:
                    await ws_manager.broadcast_to_job(job_id, data)

            elif msg_type == "chunk_complete":
                job_id = data.get("job_id")
                logger.info(f"Node {node_id} completed chunk {data.get('chunk_id')}")
                # TODO Phase 2: update chunk status, check if job complete, trigger assembler
                if job_id:
                    await ws_manager.broadcast_to_job(job_id, data)

            elif msg_type == "chunk_failed":
                job_id = data.get("job_id")
                logger.warning(f"Node {node_id} failed chunk {data.get('chunk_id')}: {data.get('error')}")
                # TODO Phase 3: trigger watchdog rescue
                if job_id:
                    await ws_manager.broadcast_to_job(job_id, data)

    except WebSocketDisconnect:
        ws_manager.disconnect_node(node_id)
        await redis_svc.remove_node(node_id)
    except Exception as e:
        logger.error(f"Node WS error for {node_id}: {e}")
        ws_manager.disconnect_node(node_id)
    finally:
        await redis_client.aclose()


@router.websocket("/ws/job/{job_id}")
async def ws_job_monitor(
    websocket: WebSocket,
    job_id: str,
    token: str = Query(default=""),
):
    """WebSocket for customer to monitor a job in real-time."""
    # TODO: validate token and verify user owns this job
    await ws_manager.connect_customer(job_id, websocket)
    try:
        while True:
            # Keep connection alive — customer doesn't send much
            data = await websocket.receive_text()
            # Could handle ping/pong or client-side events here
    except WebSocketDisconnect:
        ws_manager.disconnect_customer(job_id, websocket)
    except Exception as e:
        logger.error(f"Job WS error for {job_id}: {e}")
        ws_manager.disconnect_customer(job_id, websocket)
