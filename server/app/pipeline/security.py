"""Step 1.5: Static Security Analysis (Tier 1).

Scans uploaded code for common malware signatures (crypto miners) and dangerous behavior patterns
before building or dispatching to edge nodes.
"""

import ast
import logging
import re
from dataclasses import dataclass
from enum import Enum

from app.core.config import get_settings
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)


class ThreatLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityFinding:
    file: str
    threat_level: ThreatLevel
    category: str
    message: str
    line: int | None = None


class SecurityScanner:
    """Performs static analysis on uploaded jobs via MinIO."""

    # ── Signatures ───────────────────────────────────────────────
    # Common miner protocols, tools, and pool domains
    SUSPICIOUS_STRINGS = [
        # Protocols & Pools
        r"stratum\+tcp://",
        r"stratum\+ssl://",
        r"nanopool\.org",
        r"ethpool\.org",
        r"ethermine\.org",
        r"nicehash\.com",
        r"minergate\.com",
        r"supportxmr\.com",
        # Tooling
        r"xmrig",
        r"cpuminer",
        r"ethminer",
        r"ccminer",
        r"claymore",
        r"teamredminer",
        # Execution helpers often used in miners
        r"nohup.*&",
        r"127\.0\.0\.1:4444",
    ]

    DANGEROUS_SYSCALLS = {
        "os": ["system", "popen", "spawn"],
        "subprocess": ["Popen", "call", "run", "check_call", "check_output"],
        "eval": [None],
        "exec": [None],
        "pickle": ["loads", "load"],
        "marshal": ["loads"],
        "shelve": ["open"],
    }

    def __init__(self):
        self.settings = get_settings()

    async def scan_job(self, job_id: str, file_keys: list[str]) -> list[SecurityFinding]:
        """Main entry point: downloads and scans code files for threats."""
        findings = []

        # We only scan text-based code files for Tier 1
        code_extensions = {".py", ".sh", ".js", ".c", ".cpp", ".rs", ".go"}

        for key in file_keys:
            filename = key.split("/")[-1]
            ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

            if ext in code_extensions or filename == "Dockerfile":
                try:
                    content = minio_service.download_bytes(self.settings.BUCKET_JOB_INPUTS, key)

                    # 1. Signature Scan (All code files)
                    findings.extend(self._scan_signatures(filename, content))

                    # 2. AST Behavior Analysis (Python only)
                    if ext == ".py":
                        findings.extend(self._scan_python_ast(filename, content))

                except Exception as e:
                    logger.error(f"Failed to scan file {key}: {e}")

        return findings

    def _scan_signatures(self, filename: str, content: bytes) -> list[SecurityFinding]:
        findings = []
        text = content.decode("utf-8", errors="ignore")

        for pattern in self.SUSPICIOUS_STRINGS:
            if re.search(pattern, text, re.IGNORECASE):
                findings.append(SecurityFinding(
                    file=filename,
                    threat_level=ThreatLevel.HIGH,
                    category="Crypto-mining Signature",
                    message=f"Found suspicious mining string matching pattern: {pattern}"
                ))
        return findings

    def _scan_python_ast(self, filename: str, content: bytes) -> list[SecurityFinding]:
        findings = []
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return findings # Let analyzer.py handle syntax errors

        for node in ast.walk(tree):
            # Check for suspicious function calls
            if isinstance(node, ast.Call):
                func_name = None
                module_name = None

                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                    if isinstance(node.func.value, ast.Name):
                        module_name = node.func.value.id

                # Flag dangerous syscalls
                if func_name in self.DANGEROUS_SYSCALLS:
                    # Generic builtin check (eval/exec)
                    if module_name is None and None in self.DANGEROUS_SYSCALLS[func_name]:
                        findings.append(SecurityFinding(
                            file=filename,
                            threat_level=ThreatLevel.MEDIUM,
                            category="Suspicious Behavior",
                            message=f"Dangerous builtin function detected: {func_name}()",
                            line=node.lineno
                        ))

                    # Module-specific checks (e.g., os.system)
                    elif module_name in self.DANGEROUS_SYSCALLS and func_name in self.DANGEROUS_SYSCALLS[module_name]:
                        # Extra check for shell=True in subprocess
                        is_shell = False
                        if module_name == "subprocess":
                            for kw in node.keywords:
                                if kw.arg == "shell" and isinstance(kw.value, (ast.Constant, ast.Name)):
                                    if getattr(kw.value, "value", None) == True or getattr(kw.value, "id", None) == "True":
                                        is_shell = True

                        findings.append(SecurityFinding(
                            file=filename,
                            threat_level=(ThreatLevel.HIGH if is_shell else ThreatLevel.MEDIUM),
                            category="Dangerous Syscall",
                            message=f"Potential command injection via {module_name}.{func_name}() {'with shell=True' if is_shell else ''}",
                            line=node.lineno
                        ))

            # Check for obfuscated imports / base64 execution
            if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                # We can add more logic here to check if they import base64 then call b64decode
                pass

        return findings
