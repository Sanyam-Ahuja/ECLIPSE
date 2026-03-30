"""Base model — re-exports Base from database module."""

from app.core.database import Base

__all__ = ["Base"]
