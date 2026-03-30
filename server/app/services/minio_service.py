"""MinIO object storage service."""

import io
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings


settings = get_settings()

minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

REQUIRED_BUCKETS = [
    settings.BUCKET_JOB_INPUTS,
    settings.BUCKET_JOB_OUTPUTS,
    settings.BUCKET_CHECKPOINTS,
    settings.BUCKET_BUILD_CONTEXTS,
]


class MinIOService:
    """High-level MinIO operations for CampuGrid."""

    def __init__(self, client: Minio | None = None):
        self.client = client or minio_client

    def ensure_buckets(self) -> None:
        """Create required buckets if they don't exist. Called on server startup."""
        for bucket in REQUIRED_BUCKETS:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)

    def upload_bytes(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload bytes to MinIO. Returns the object key."""
        self.client.put_object(
            bucket_name=bucket,
            object_name=key,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return key

    def upload_file(self, bucket: str, key: str, file_path: str) -> str:
        """Upload a file from disk to MinIO. Returns the object key."""
        self.client.fput_object(
            bucket_name=bucket,
            object_name=key,
            file_path=file_path,
        )
        return key

    def download_bytes(self, bucket: str, key: str) -> bytes:
        """Download an object as bytes."""
        response = self.client.get_object(bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def download_file(self, bucket: str, key: str, file_path: str) -> str:
        """Download an object to a local file. Returns the file path."""
        self.client.fget_object(bucket, key, file_path)
        return file_path

    def get_presigned_url(
        self,
        bucket: str,
        key: str,
        expiry_hours: int = 4,
    ) -> str:
        """Generate a presigned download URL."""
        return self.client.presigned_get_object(
            bucket_name=bucket,
            object_name=key,
            expires=timedelta(hours=expiry_hours),
        )

    def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        """List object keys in a bucket with optional prefix."""
        objects = self.client.list_objects(bucket, prefix=prefix, recursive=True)
        return [obj.object_name for obj in objects]

    def get_object_size(self, bucket: str, key: str) -> int:
        """Get size of an object in bytes."""
        stat = self.client.stat_object(bucket, key)
        return stat.size

    def delete_object(self, bucket: str, key: str) -> None:
        """Delete an object."""
        self.client.remove_object(bucket, key)

    def object_exists(self, bucket: str, key: str) -> bool:
        """Check if an object exists."""
        try:
            self.client.stat_object(bucket, key)
            return True
        except S3Error:
            return False


# Singleton
minio_service = MinIOService()
