# Tier 1 Security: Static Guardrail Implementation

We have implemented a robust pre-execution security layer that protects our contributor network from malicious workloads before they are ever dispatched.

## 1. Security Scanner (`app/pipeline/security.py`)
A new dedicated security module that performs deep analysis of uploaded code:
- **Crypto-Mining Detection**: Uses highly optimized regex patterns to flag stratum protocols and known mining pool domains (e.g., `nanopool`, `nicehash`, `xmrig`).
- **Python AST Behavioral Analysis**: For Python workloads, we parse the code into an Abstract Syntax Tree (AST) to identify dangerous syscalls like `os.system` or `subprocess.Popen` with `shell=True`, which are common markers for malware droppers.

## 2. Automated Blocking in Orchestrator
Integrated directly into the `process_pipeline_async` lifecycle:
- **Fail-Fast Policy**: If a `HIGH` or `CRITICAL` threat is detected (like a hardcoded mining pool URL), the job is immediately transition to the `FAILED` state.
- **Immediate Alert**: The scan results are broadcast to the user via WebSockets, providing instant feedback on security violations.

## 3. High-Visibility Dashboard Status
- **Security Shield**: The submission and monitor pages now feature a dedicated "Shield" icon that appears during the security verification phase.
- **Real-Time Feedback**: Users see a clear "Scanning for malicious patterns" step, reinforcing trust in the platform's safety.

---

### Verification
- [x] **Signature Match**: Verified that strings like `stratum+tcp` are caught across all code files.
- [x] **Behavior Match**: Verified that `subprocess.run(..., shell=True)` triggers a High-level security alert.
- [x] **State Persistence**: Authenticated that blocked jobs stay in the `FAILED` state in the Postgres database.
