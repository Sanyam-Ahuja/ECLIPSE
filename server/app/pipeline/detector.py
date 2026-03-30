"""Step 1: File type detection via Magic Bytes (Zero Execution)."""

import logging
from dataclasses import dataclass

from app.services.minio_service import minio_service
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MAGIC_SIGNATURES = {
    b'BLENDER': 'blender',          # .blend
    b'PK\x03\x04': 'zip_based',        # .zip, .docx, .c4d
    b'\x89PNG\r\n': 'png',          # image
    b'%PDF': 'pdf',                 # doc
    b'RIFF': 'riff',                # .avi, .wav
    b'\x1f\x8b': 'gzip',            # .gz, .tar.gz
    b'\x7fELF': 'elf',              # linux binary
    b'GIF8': 'gif',                 # animation
}

EXTENSION_MAP = {
    '.blend': 'blender',
    '.py': 'python_script',
    '.csv': 'csv_data',
    '.parquet': 'parquet_data',
    '.tar.gz': 'gzip',
    '.zip': 'zip_based',
    '.txt': 'text',
    '.json': 'json',
}


@dataclass
class FileDetection:
    file_type: str          # Final resolved type
    magic_match: str | None # What magic bytes indicated
    extension_match: str | None # What extension indicated
    confidence: float       # 0.0 to 1.0


def detect_file(job_id: str, minio_key: str, filename: str) -> FileDetection:
    """Read first 16 bytes from MinIO and determine file type safely."""
    # 1. Extension match
    ext = ""
    if "." in filename:
        ext = "." + filename.split(".")[-1].lower()
        if filename.endswith(".tar.gz"):
            ext = ".tar.gz"
            
    ext_match = EXTENSION_MAP.get(ext)

    # 2. Magic byte match
    magic_match = None
    try:
        # We only need the first 16 bytes
        obj = minio_service.client.get_object(
            settings.BUCKET_JOB_INPUTS, 
            minio_key, 
            offset=0, 
            length=16
        )
        header = obj.read(16)
        obj.close()
        obj.release_conn()

        for signature, mtype in MAGIC_SIGNATURES.items():
            if header.startswith(signature):
                magic_match = mtype
                break
    except Exception as e:
        logger.warning(f"Could not read magic bytes for {minio_key}: {e}")

    # 3. Resolve conflicts
    if magic_match and ext_match:
        if magic_match == ext_match:
            return FileDetection(magic_match, magic_match, ext_match, 1.0)
        else:
            # Magic bytes are more reliable than extensions
            return FileDetection(magic_match, magic_match, ext_match, 0.8)
    elif magic_match:
        return FileDetection(magic_match, magic_match, None, 0.9)
    elif ext_match:
        # For text files, magic bytes aren't helpful (just UTF-8)
        if ext_match in ('python_script', 'csv_data', 'text', 'json'):
            return FileDetection(ext_match, None, ext_match, 0.9)
        return FileDetection(ext_match, None, ext_match, 0.5)
    
    return FileDetection("unknown", None, None, 0.0)
