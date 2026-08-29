import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.work_shift import WorkShift


class AttendanceType(str, enum.Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"
    AUTO = "AUTO"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

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
    check_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    attendance_type: Mapped[AttendanceType] = mapped_column(
        Enum(AttendanceType, name="attendance_type_enum", create_type=True),
        default=AttendanceType.CHECK_IN,
        nullable=False
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Cosine similarity score between query face and matched registered face (0.0 to 1.0)"
    )
    matched_face_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("face_features.id", ondelete="SET NULL"),
        nullable=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    snapshot_path: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    # Roadmap Phase 1 & 2 Attributes
    ppe_compliance: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="True if PPE (mask, helmet) compliance is satisfied or not required"
    )
    ppe_violations: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Comma-separated PPE violations e.g. NO_MASK, NO_HELMET"
    )
    gesture_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True if check-in passed active gesture challenge (blink, smile, nod)"
    )
    shift_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("work_shifts.id", ondelete="SET NULL"),
        nullable=True
    )
    work_duration_hours: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    ot_hours: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="attendance_records",
        lazy="selectin"
    )
    shift: Mapped[Optional["WorkShift"]] = relationship(
        "WorkShift",
        lazy="selectin"
    )

    __table_args__ = (
        Index("ix_attendance_employee_time", "employee_id", "check_time"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceRecord(employee_id={self.employee_id}, time={self.check_time}, type={self.attendance_type})>"
