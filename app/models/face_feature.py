import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


class FaceFeature(Base):
    __tablename__ = "face_features"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # ArcFace 512-dimensional vector embedding
    embedding: Mapped[list[float]] = mapped_column(
        Vector(512),
        nullable=False
    )
    image_path: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    detection_score: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="face_features"
    )

    # HNSW Vector Index for fast cosine similarity search
    __table_args__ = (
        Index(
            "ix_face_features_embedding_hnsw",
            embedding,
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    def __repr__(self) -> str:
        return f"<FaceFeature(id={self.id}, employee_id={self.employee_id})>"
