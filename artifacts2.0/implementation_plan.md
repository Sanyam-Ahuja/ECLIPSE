# Goal: Tier 1 Static Code Analysis (Pre-Execution)

This enhancement aims to prevent malicious code (malware, crypto-miners) from ever reaching the contributor nodes by scanning the user's uploaded code in the orchestrator before deployment.

## Proposed Changes

### 1. New Security Module [NEW] [security.py](file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/security.py)
We will create a specialized security scanner that performs two types of checks:
- **Signature Scanning**: Regex search across all uploaded files for known miner strings (e.g., `stratum+tcp`, `xmrig`, `nicehash`, `ethminer`).
- **AST Behavior Analysis**: For Python scripts, we use the `ast` module to flag dangerous syscalls often used in malware dropper scripts (e.g., `os.system`, `subprocess.Popen` with shells, `pickle.loads` of untrusted data, or obfuscated `base64` imports).

### 2. Orchestrator Integration [MODIFY] [orchestrator.py](file:///home/samito/Downloads/ECLIPSE/server/app/pipeline/orchestrator.py)
Update the `process_pipeline_async` flow:
- Immediately after file detection and analysis, the orchestrator will call `SecurityScanner.scan(job_id, file_keys)`.
- **Status Update**: Emit a `security_check` step via WebSocket to the user's dashboard.
- **Fail-Fast**: If the scanner flags a "High" importance threat, the job's status is set to `FAILED` with a `Security Violation` message, and the pipeline terminates before any chunks are created.

### 3. Dashboard UI Update [MODIFY] [Monitor Page](file:///home/samito/Downloads/ECLIPSE/web/src/app/(app)/monitor/[jobId]/page.tsx)
Update the monitor page to handle the `security_check` step and display a "Shield" icon or similar high-trust graphic while the scan is running.

## Open Questions

> [!IMPORTANT]
> 1. In the event of a "Medium" confidence flag (e.g., a legitimate use of `subprocess`), should we **auto-block** the job or just **warn** the user and the node? 
> 2. Do you want the scanner to check non-code files (like large `.dat` or `.bin` files) for hidden miner binaries via file headers?

## Verification Plan
1. Upload a "Harmless" script to ensure no false positives.
2. Upload a "Malicious" script containing `stratum+tcp://xmr-eu1.nanopool.org:14444` and verify the orchestrator blocks it.
3. Validate that the UI correctly displays the security scanning progress.
