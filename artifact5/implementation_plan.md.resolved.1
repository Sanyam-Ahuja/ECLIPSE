# Versatile ZIP Analysis & Execution Pipeline

The current pipeline fails on ZIP uploads because the `analyzer` doesn't peek inside archives and the `catalog` lacks the logic to unzip payloads on contributor nodes. To ensure a "hackathon-proof" experience, we will implement both a robust auto-analyzer for ZIPs and verify the manual Dockerfile fallback.

## Proposed Changes

### 1. Robust ZIP Analysis
#### [MODIFY] [analyzer.py](file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/analyzer.py)
Update `analyze_files` to handle `zip_based` detections:
- Download the ZIP to `/tmp` and use the `zipfile` module to list contents.
- Heuristically identify the entrypoint (favoring `train.py` or `main.py`).
- Extract the imports from the identified entrypoint to detect the framework (PyTorch/TensorFlow).
- Wrap the result in a `JobProfile` that points to the ZIP file but specifies the internal entrypoint.

### 2. Automated Unzipping on Nodes
#### [MODIFY] [catalog.py](file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/catalog.py)
Update the `ml_training` (PyTorch/TensorFlow) entries:
- Update `entrypoint_template` to include `curl -L {INPUT_URL} -o /tmp/input.zip && unzip /tmp/input.zip -d /workspace`.
- Ensure standard `python` execution points to the newly unzipped workspace.

### 3. UI Fallback Verification
#### [VERIFY] [page.tsx](file:///home/samito/Downloads/ECLIPSE/web/src/app/(app)/monitor/[jobId]/page.tsx)
Confirm the "Manual Upload" Dockerfile UI is working as intended. If analysis fails, the user should be able to instantly upload a `Dockerfile` and resume.

## User Review Required

> [!IMPORTANT]
> Contributor nodes must have `unzip` installed in their host environment OR we must ensure it is available inside the base Docker images (e.g., `lscr.io/linuxserver/blender` or `nvidia/cuda`). I will assume standard Ubuntu-based images have `unzip` or I will add a fallback logic.

## Open Questions

- Should we support `.tar.gz` for source code as well, or just `.zip` for now? (I recommend starting with `.zip` as per your request).

## Verification Plan

### Automated Tests
- Upload the `pytorch-cifar-master.zip` via the API/Frontend.
- Monitor `analyze_and_dispatch` logs to verify it extracts the `main.py` entrypoint correctly.
- Verify the `docker run` command generated includes the `unzip` preamble.
