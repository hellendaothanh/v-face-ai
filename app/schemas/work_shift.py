from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.work_shift import ShiftType, PayrollStatus


# --- Work Shift Schemas ---
class WorkShiftBase(BaseModel):
    shift_code: str = Field(..., example="SHIFT_MORNING")
    shift_name: str = Field(..., example="Ca Sáng (08:00 - 17:00)")
    shift_type: ShiftType = Field(default=ShiftType.STANDARD)
    start_time: time = Field(default=time(8, 0))
    end_time: time = Field(default=time(17, 0))
    grace_period_minutes: int = Field(default=15, ge=0)
    break_duration_minutes: int = Field(default=60, ge=0)
    work_hours: float = Field(default=8.0, gt=0)
    is_overnight: bool = Field(default=False)
    is_split_shift: bool = Field(default=False)
    split_break_start: Optional[time] = None
    split_break_end: Optional[time] = None
    rotation_days: Optional[int] = None
    allow_auto_match: bool = Field(default=True)
    is_active: bool = Field(default=True)


class WorkShiftCreate(WorkShiftBase):
    pass


class WorkShiftUpdate(BaseModel):
    shift_code: Optional[str] = None
    shift_name: Optional[str] = None
    shift_type: Optional[ShiftType] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    grace_period_minutes: Optional[int] = None
    break_duration_minutes: Optional[int] = None
    work_hours: Optional[float] = None
    is_overnight: Optional[bool] = None
    is_split_shift: Optional[bool] = None
    split_break_start: Optional[time] = None
    split_break_end: Optional[time] = None
    rotation_days: Optional[int] = None
    allow_auto_match: Optional[bool] = None
    is_active: Optional[bool] = None


class ShiftAutoMatchRequest(BaseModel):
    checkin_time: str = Field(..., example="08:15", description="Giờ check-in thực tế (HH:MM)")
    employee_id: Optional[UUID] = None


class ShiftAutoMatchResponse(BaseModel):
    matched_shift_id: Optional[UUID]
    shift_code: str
    shift_name: str
    start_time: str
    end_time: str
    is_split_shift: bool = False
    is_overnight: bool = False
    match_reason: str



class WorkShiftResponse(WorkShiftBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Shift Assignment Schemas ---
class ShiftAssignmentBase(BaseModel):
    shift_id: UUID
    employee_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = Field(default=True)
    note: Optional[str] = None


class ShiftAssignmentCreate(ShiftAssignmentBase):
    pass


class ShiftAssignmentResponse(ShiftAssignmentBase):
    id: UUID
    created_at: datetime
    shift_name: Optional[str] = None
    shift_code: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True


# --- Payroll Schemas ---
class PayrollCalculateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2030)
    employee_id: Optional[UUID] = None
    department_id: Optional[UUID] = None


class PayrollRecordResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    month: int
    year: int
    
    # Work Metrics
    standard_work_days: float
    actual_worked_days: float
    total_work_hours: float
    overtime_hours: float
    late_arrivals_count: int
    early_leaves_count: int
    approved_paid_leave_days: float
    unpaid_leave_days: float

    # Financials (VND)
    base_salary: float
    hourly_rate: float
    overtime_pay: float
    allowance: float
    late_penalty: float
    bonus: float
    gross_salary: float
    insurance_deduction: float
    net_salary: float
    status: PayrollStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PayrollStatusUpdate(BaseModel):
    status: PayrollStatus
    notes: Optional[str] = None
