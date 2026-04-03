"""ContainerImage model — catalog and generated Docker images."""

import enum

from sqlalchemy import JSON, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ImageSource(str, enum.Enum):
    CATALOG = "catalog"
    ADAPTED = "adapted"
    GENERATED = "generated"


class BuildStatus(str, enum.Enum):
    READY = "ready"
    BUILDING = "building"
    FAILED = "failed"


class ContainerImage(Base):
    __tablename__ = "container_images"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tag: Mapped[str] = mapped_column(String(100), nullable=False)
    registry_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    source: Mapped[ImageSource] = mapped_column(
        Enum(ImageSource, name="image_source"),
        default=ImageSource.CATALOG,
        nullable=False,
    )
    build_status: Mapped[BuildStatus] = mapped_column(
        Enum(BuildStatus, name="build_status"),
        default=BuildStatus.READY,
        nullable=False,
    )

    # Metadata: base_image, frameworks, gpu_support, preinstalled_packages
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<ContainerImage {self.name}:{self.tag} source={self.source.value}>"
