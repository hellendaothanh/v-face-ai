import enum
import uuid
from datetime import datetime, time
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Index, Integer, Numeric, String, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


class ShiftType(str, enum.Enum):
    STANDARD = "STANDARD"      # 08:00 - 17:00
    MORNING = "MORNING"        # 06:00 - 14:00
    AFTERNOON = "AFTERNOON"    # 14:00 - 22:00
    NIGHT = "NIGHT"            # 22:00 - 06:00 (Overnight)
    FLEXIBLE = "FLEXIBLE"      # Flexible hours
    SPLIT = "SPLIT"            # Ca gãy (e.g. 10:00-14:00 & 17:00-21:00)
    ROTATING = "ROTATING"      # Ca xoay luân phiên (e.g. 7 days Day -> 7 days Night)


class PayrollStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    PAID = "PAID"


class WorkShift(Base):
    __tablename__ = "work_shifts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    shift_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    shift_name: Mapped[str] = mapped_column(String(100), nullable=False)
    shift_type: Mapped[ShiftType] = mapped_column(
        String(50),
        default=ShiftType.STANDARD,
        nullable=False
    )
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    break_duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    work_hours: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    is_overnight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_split_shift: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    split_break_start: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    split_break_end: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    rotation_days: Mapped[Optional[int]] = mapped_column(Integer, default=None, nullable=True)
    allow_auto_match: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assignments: Mapped[List["ShiftAssignment"]] = relationship("ShiftAssignment", back_populates="shift", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<WorkShift({self.shift_code}: {self.shift_name} [{self.start_time}-{self.end_time}])>"


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    employee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )
    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("work_shifts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    effective_from: Mapped[datetime] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    shift: Mapped["WorkShift"] = relationship("WorkShift", back_populates="assignments", lazy="selectin")
    employee: Mapped[Optional["Employee"]] = relationship("Employee", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ShiftAssignment(emp={self.employee_id}, shift={self.shift_id})>"


class PayrollRecord(Base):
    __tablename__ = "payroll_records"

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
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Timesheet Aggregations
    standard_work_days: Mapped[float] = mapped_column(Float, default=22.0, nullable=False)
    actual_worked_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_work_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    late_arrivals_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    early_leaves_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    approved_paid_leave_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    unpaid_leave_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Financial Breakdown (VND)
    base_salary: Mapped[float] = mapped_column(Float, default=10000000.0, nullable=False)
    hourly_rate: Mapped[float] = mapped_column(Float, default=56818.0, nullable=False)
    overtime_pay: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    allowance: Mapped[float] = mapped_column(Float, default=1500000.0, nullable=False)
    late_penalty: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bonus: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_salary: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    insurance_deduction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_salary: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    status: Mapped[PayrollStatus] = mapped_column(
        Enum(PayrollStatus, name="payroll_status_enum", create_type=True),
        default=PayrollStatus.DRAFT,
        nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")

    __table_args__ = (
        Index("ix_payroll_emp_period", "employee_id", "month", "year", unique=True),
    )

    def __repr__(self) -> str:
        return f"<PayrollRecord(emp={self.employee_id}, {self.month}/{self.year}: Net={self.net_salary:,.0f})>"
