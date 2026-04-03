"""Mock Contributor Node Daemon for testing the server Pipeline and Scheduler."""

import asyncio
import argparse
import random
import logging
import json
import websockets
from websockets.frames import CloseCode

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CampuGrid-Mock-Daemon")

class MockAgent:
    def __init__(self, server_url: str, token: str, node_id: str):
        self.ws_url = f"{server_url}/api/v1/ws/node/{node_id}?token={token}"
        self.node_id = node_id
        self.is_busy = False
        self.ws = None
        self._running = True

    async def connect(self):
        """Connect to server with backoff."""
        while self._running:
            try:
                logger.info(f"Connecting to {self.ws_url[:80]}...")
                async with websockets.connect(self.ws_url) as ws:
                    self.ws = ws
                    logger.info("Connected successfully.")
                    
                    # Start heartbeat concurrently
                    heartbeat_task = asyncio.create_task(self.heartbeat_loop())
                    
                    try:
                        # Listen for incoming jobs
                        await self.listen()
                    finally:
                        heartbeat_task.cancel()
                    
            except websockets.exceptions.ConnectionClosed as e:
                logger.warning(f"Connection closed: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def listen(self):
        """Listen for incoming messages from the server."""
        async for message_raw in self.ws:
            if isinstance(message_raw, bytes):
                message_raw = message_raw.decode()
            logger.info(f"Received: {message_raw[:200]}")
            try:
                msg = json.loads(message_raw)
                if msg.get("type") == "job_dispatch":
                    asyncio.create_task(self.handle_job(msg))
            except json.JSONDecodeError:
                logger.error("Failed to decode message.")

    async def heartbeat_loop(self):
        """Send a heartbeat every 10 seconds advertising hardware."""
        try:
            while self._running:
                resources = {
                    "cpu_cores": 16,
                    "ram_gb": 32.0,
                    "gpu_vram_gb": 16.0,
                    "gpu_model": "RTX 4080",
                    "gpu_cuda_version": "12.1",
                    "bandwidth_mbps": 150.0,
                    "cached_images": [],
                    "reliability_score": 0.99,
                }
                
                message = {
                    "type": "heartbeat",
                    "node_id": self.node_id,
                    "available": not self.is_busy,
                    "resources": resources
                }
                logger.debug(f"Sending heartbeat: available={not self.is_busy}")
                try:
                    await self.ws.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    break
                    
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            pass

    async def handle_job(self, msg: dict):
        """Simulate processing a chunk."""
        self.is_busy = True
        chunk_id = msg.get("chunk_id")
        job_id = msg.get("job_id")
        spec = msg.get("spec", {})
        
        logger.info(f"🚀 ACCEPTED CHUNK {chunk_id} for JOB {job_id}")
        logger.info(f"   Spec: {spec}")
        
        # Simulate work
        logger.info("   Processing chunk...")
        await asyncio.sleep(random.randint(5, 10))
        
        logger.info("   Uploading results...")
        await asyncio.sleep(2)
        
        # Report completion
        complete_msg = {
            "type": "chunk_status",
            "chunk_id": chunk_id,
            "job_id": job_id,
            "status": "completed",
            "gpu_hours_used": round(random.uniform(0.01, 0.05), 4)
        }
        try:
            await self.ws.send(json.dumps(complete_msg))
            logger.info(f"✅ COMPLETED CHUNK {chunk_id}")
        except websockets.exceptions.ConnectionClosed:
            logger.error("Connection lost before reporting completion.")
        
        self.is_busy = False


async def run():
    parser = argparse.ArgumentParser(description="CampuGrid Mock Contributor Node")
    parser.add_argument("--url", default="ws://localhost:8000", help="FastAPI Server URL")
    parser.add_argument("--token", required=True, help="JWT Access Token")
    parser.add_argument("--node", required=True, help="Node UUID")
    
    args = parser.parse_args()
    
    agent = MockAgent(args.url, args.token, args.node)
    await agent.connect()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logger.info("Shutting down daemon.")
