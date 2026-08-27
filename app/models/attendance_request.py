import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.employee import Employee


class AttendanceRequestType(str, enum.Enum):
    HALF_DAY_LEAVE_AM = "HALF_DAY_LEAVE_AM"  # Nghỉ nửa ngày sáng (Ca chiều làm từ 13:00)
    HALF_DAY_LEAVE_PM = "HALF_DAY_LEAVE_PM"  # Nghỉ nửa ngày chiều (Ca sáng kết thúc lúc 12:00)
    BUSINESS_TRIP = "BUSINESS_TRIP"          # Đi công tác ngoài giờ/cả ngày
    LATE_EXCUSE = "LATE_EXCUSE"              # Giải trình đi muộn / về sớm có lý do


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"      # Chờ duyệt
    APPROVED = "APPROVED"    # Đã duyệt
    REJECTED = "REJECTED"    # Từ chối


class AttendanceRequest(Base, TimestampMixin):
    """
    Bảng quản lý đơn từ và xử lý ngoại lệ chấm công (Nghỉ nửa buổi, Công tác, Giải trình đi trễ/về sớm).
    """
    __tablename__ = "attendance_requests"

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
    request_type: Mapped[AttendanceRequestType] = mapped_column(
        Enum(AttendanceRequestType, name="attendance_request_type_enum", create_type=True),
        nullable=False,
        index=True
    )
    target_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status_enum", create_type=True),
        default=RequestStatus.PENDING,
        nullable=False,
        index=True
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    note: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="attendance_requests",
        lazy="selectin"
    )

    __table_args__ = (
        Index("ix_requests_emp_date_status", "employee_id", "target_date", "status"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceRequest(id={self.id}, employee_id={self.employee_id}, type={self.request_type}, status={self.status})>"
