# Implementation Plan - Fix Stale Data & Heartbeats

The system is currently reporting 7 nodes, but 5 of them are "TestNode" mocks from the database, and **none** of them are currently heartbeating to Redis. This is why the job is stuck in the queue.

## User Review Required

> [!IMPORTANT]
> This plan will delete the "TestNode" mock entries from your database. If you rely on them for testing, please let me know. 

## Proposed Changes

### Node Identity & Dispatch

#### [MODIFY] [websocket.py](file:///home/samito/Downloads/ECLIPSE/server/app/api/v1/websocket.py)
- Replace the hardcoded `redis://localhost:6379/0` with `settings.REDIS_URL`.
- Ensure heartbeats are correctly reaching the instance the scheduler is watching.

#### [MODIFY] [orchestrator.py](file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/orchestrator.py)
- Inject resource requirements (`vram_gb`, `ram_gb`) into the `Chunk.spec`.
- This ensures the `matcher` score function has the data it needs to filter nodes correctly.

---

### Database Cleanup

#### [REMOVE] Stale Mock Nodes
- I will run a script to remove all nodes with the hostname `TestNode` from your database.
- This will clear the "fake data" from your Admin Panel.

## Verification Plan

### Automated Tests
- I'll run a diagnostic script to verify that `redis-cli` sees heartbeats in the `heartbeat:nodes` set after restarting the services.
- Verify `lsof -i :8000` is active.

### Manual Verification
- After I finish, please restart your services.
- The Admin Panel should now only show your real nodes (Fedora/Laptop).
- The job should transition from `QUEUED` to `RUNNING` immediately.
