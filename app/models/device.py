import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class DevicePurpose(str, enum.Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"
    BOTH = "BOTH"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    device_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True
    )
    rtsp_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    location: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Văn phòng chính"
    )
    purpose: Mapped[DevicePurpose] = mapped_column(
        Enum(DevicePurpose, name="device_purpose_enum", create_type=True),
        default=DevicePurpose.CHECK_IN,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
