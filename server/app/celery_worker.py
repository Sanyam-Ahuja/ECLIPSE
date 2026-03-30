"""Celery Worker Entry Point."""

from app.core.config import get_settings
from celery import Celery

settings = get_settings()

celery_app = Celery(
    "campugrid",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.pipeline.orchestrator",
        "app.scheduler.matcher"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
