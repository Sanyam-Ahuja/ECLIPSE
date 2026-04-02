# CampuGrid — Phase 3: Fault Tolerance & Gemini Integration

This document covers the implementation plan for Phase 3. Now that we have successfully routed stable jobs in Phase 2, we need to handle network volatility inherent to P2P systems, and handle edge-case workloads with AI.

## Goal Description

The objective of Phase 3 is:
1. **Fault Tolerance (Watchdog):** A Celery Beat task that checks for disconnected nodes (no heartbeats in 90s) every 30 seconds and automatically rescues their chunks, penalizing their node reliability score.
2. **Data Pipeline:** Expanding the pipeline to handle CSV/Parquet data jobs by splitting files across bite ranges and using an Assembler to stitch the output shards back together.
3. **Gemini AI Docker Integrator:** Implementing Tier 2 (Verifier) and Tier 3 (Generator) of our AI Pipeline using the Google Gemini API to dynamically adapt or write Dockerfiles on the fly for scripts that do not match our standard pre-defined images.

## User Review Required

> [!WARNING]
> **Celery Beat Requirement**
> I will need to set up a `celery beat` process alongside our existing `celery worker` process to schedule the Watchdog. Background periodic polling is necessary because we are checking for the *absence* of an event (missing heartbeats).
>
> **Gemini Verification Workflow**
> When Gemini generates a Dockerfile or a pip install layer, we need to build it securely on the server before dispatching it to nodes. Setting up Kaniko locally might be complex for this test environment, so I propose we simulate the Docker Build step for now, returning dummy image names (e.g. `campugrid/adapted/hash`) to prove the AI layer works, and defer Kaniko integration until we deploy to GCP.

## Proposed Changes

---

### Fault Tolerance & Scheduling (`server/app/scheduler/`)

#### [NEW] `server/app/scheduler/watchdog.py`
A polling service utilizing `celery.beat` to run `check_running_chunks` every 30 seconds. Checks Redis/Postgres for chunks in `running` status assigned to nodes that haven't pulsed a heartbeat. Re-queues failed chunks with hoisted priorities.

#### [MODIFY] `server/app/scheduler/matcher.py` (file:///home/samito/Downloads/ECLIPSE/server/app/scheduler/matcher.py)
Update scoring functions to penalize nodes that recently failed jobs, and add a mechanism to recover reliability scores after successful completions.

---

### Data Processing Expansion (`server/app/pipeline/` & `assembler/`)

#### [MODIFY] `server/app/pipeline/splitter.py` (file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/splitter.py)
Add `split_data` to specifically handle CSV array parsing by cleanly identifying newline `\n` boundaries within exact byte thresholds.

#### [NEW] `server/app/assembler/data_assembler.py`
A task that runs when all chunks in a Job finish. Downloads partitioned outputs from MinIO, concatenates them locally while preserving CSV headers properly, and uploads the final master artifact to MinIO.

---

### Gemini AI Integrations (`server/app/pipeline/`)

#### [NEW] `server/app/pipeline/verifier.py`
Utilizes the `google-generativeai` package using the API key in `.env`. Takes the user's script imports alongside the closest matched `catalog.py` entry and asks Gemini if they overlap. Generates isolated `pip install` dockerfile layers.

#### [NEW] `server/app/pipeline/generator.py`
The "Tier 3" fallback. Instructs Gemini `2.0-flash` to generate an entirely standalone Dockerfile obeying CampuGrid standard boundaries (like `--network none` rules).

#### [MODIFY] `server/app/pipeline/orchestrator.py` (file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/orchestrator.py)
Wire the `lookup()` failure path to trigger the `Verifier.verify_and_adapt` and `Generator.generate` functions dynamically, awaiting their AI generation and cached image hashes before resuming chunk splitting operations.

## Open Questions

1. **Kaniko Build System:** Are you okay with mocking out the actual `docker build` phase for now (just yielding the dynamically generated tag) so we can focus on proving the Gemini AI integration and P2P fault tolerance?

## Verification Plan

### Automated Tests
1. I will augment the mock environment to trigger the new Celery tasks.

### Manual Verification
1. I will start the Celery Beat Watchdog and intentionally kill the mock client daemon to ensure the Watchdog catches the disconnected node and rescues the chunk seamlessly.
2. I will modify `test_phase2.py` to submit a PyTorch script containing an obscure package (`import wandb`) to guarantee a Tier 2 Gemini Verify trigger and trace its API request down to the generation of an adapted Dockerfile.
