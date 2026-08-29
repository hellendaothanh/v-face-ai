import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class OTTChannel(str, enum.Enum):
    TELEGRAM = "TELEGRAM"
    SLACK = "SLACK"
    ZALO = "ZALO"
    ALL = "ALL"


class NotificationStatus(str, enum.Enum):
    SENT = "SENT"
    FAILED = "FAILED"
    SIMULATED = "SIMULATED"


class OTTNotificationLog(Base):
    __tablename__ = "ott_notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    channel: Mapped[str] = mapped_column(String(50), default="TELEGRAM", nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # STRANGER_THREAT, PPE_VIOLATION, LEAVE_RESOLUTION
    recipient_target: Mapped[str] = mapped_column(String(255), nullable=False)        # Chat ID, Webhook URL mask, or Zalo ID
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SENT", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<OTTNotificationLog({self.channel} - {self.event_type} - {self.status})>"
