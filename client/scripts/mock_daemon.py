"""Mock Contributor Node Daemon for testing the server Pipeline and Scheduler."""

import asyncio
import argparse
import random
import logging
import json
import websockets
from websockets.exceptions import ConnectionClosed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CampuGrid-Mock-Daemon")

class MockAgent:
    def __init__(self, server_url: str, token: str, node_id: str):
        self.ws_url = f"{server_url}/api/v1/ws/node/{node_id}"
        self.token = token
        self.node_id = node_id
        self.is_busy = False
        self.ws = None

    async def connect(self):
        """Connect to server with backoff."""
        while True:
            try:
                logger.info(f"Connecting to {self.ws_url}...")
                # Connect with JWT token
                extra_headers = {"Authorization": f"Bearer {self.token}"}
                async with websockets.connect(self.ws_url, extra_headers=extra_headers) as ws:
                    self.ws = ws
                    logger.info("Connected successfully.")
                    
                    # Start heartbeat concurrently
                    asyncio.create_task(self.heartbeat_loop())
                    
                    # Listen for incoming jobs
                    await self.listen()
                    
            except ConnectionClosed as e:
                logger.warning(f"Connection closed: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def listen(self):
        """Listen for incoming messages from the server."""
        async for message_raw in self.ws:
            logger.info(f"Received raw message: {message_raw}")
            try:
                msg = json.loads(message_raw)
                if msg.get("type") == "job_dispatch":
                    asyncio.create_task(self.handle_job(msg))
            except json.JSONDecodeError:
                logger.error("Failed to decode message.")

    async def heartbeat_loop(self):
        """Send a heartbeat every 10 seconds advertising hardware."""
        while self.ws and self.ws.open:
            resources = {
                "cpu_cores": 16,
                "ram_gb": 32.0,
                "gpu_vram_gb": 16.0,
                "gpu_model": "RTX 4080",
                "gpu_cuda_version": "12.1",
                "bandwidth_mbps": 150.0,
                "cached_images": ["campugrid/blender:4.1-cycles"],
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
            except ConnectionClosed:
                break
                
            await asyncio.sleep(10)

    async def handle_job(self, msg: dict):
        """Simulate processing a chunk."""
        self.is_busy = True
        chunk_id = msg.get("chunk_id")
        job_id = msg.get("job_id")
        spec = msg.get("spec", {})
        
        logger.info(f"🚀 ACCEPTED CHUNK {chunk_id} for JOB {job_id}")
        logger.info(f"   Spec: {spec}")
        
        # Simulate work delays
        logger.info("   [Mock] Extracting container... running...")
        await asyncio.sleep(random.randint(5, 10))
        
        logger.info("   [Mock] Uploading results to MinIO...")
        await asyncio.sleep(2)
        
        # Report completion
        complete_msg = {
            "type": "chunk_status",
            "chunk_id": chunk_id,
            "status": "completed",
            "gpu_hours_used": round(random.uniform(0.01, 0.05), 4)
        }
        await self.ws.send(json.dumps(complete_msg))
        logger.info(f"✅ COMPLETED CHUNK {chunk_id}")
        
        self.is_busy = False


async def run():
    parser = argparse.ArgumentParser(description="Mock CampuGrid Contributor Node")
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
        logger.info("Shutting down mock daemon.")
