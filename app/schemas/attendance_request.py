import uuid
from datetime import date, datetime, time
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.attendance_request import AttendanceRequestType, RequestStatus
from app.schemas.employee import EmployeeRead


class AttendanceRequestCreate(BaseModel):
    employee_id: uuid.UUID = Field(..., description="ID của nhân viên tạo đơn")
    request_type: AttendanceRequestType = Field(
        ...,
        description="Loại đơn: HALF_DAY_LEAVE_AM, HALF_DAY_LEAVE_PM, BUSINESS_TRIP, LATE_EXCUSE"
    )
    target_date: date = Field(..., description="Ngày áp dụng đơn (YYYY-MM-DD)")
    reason: str = Field(..., min_length=3, description="Lý do chi tiết")


class AttendanceRequestApprove(BaseModel):
    approved_by: Optional[str] = Field(default="Quản lý", description="Tên hoặc mã định danh người duyệt")
    note: Optional[str] = Field(None, description="Ghi chú khi duyệt đơn")


class AttendanceRequestReject(BaseModel):
    rejected_by: Optional[str] = Field(default="Quản lý", description="Tên hoặc mã định danh người từ chối")
    note: Optional[str] = Field(..., description="Lý do từ chối đơn")


class AttendanceRequestRead(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    request_type: AttendanceRequestType
    target_date: date
    reason: str
    status: RequestStatus
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeRead] = None

    model_config = {"from_attributes": True}


class AttendanceRequestFilterParams(BaseModel):
    status: Optional[RequestStatus] = Field(None, description="Lọc theo trạng thái đơn: PENDING, APPROVED, REJECTED")
    request_type: Optional[AttendanceRequestType] = Field(None, description="Lọc theo loại đơn")
    employee_id: Optional[uuid.UUID] = Field(None, description="Lọc theo ID nhân viên")
    employee_code: Optional[str] = Field(None, description="Lọc theo mã nhân viên")
    date_from: Optional[date] = Field(None, description="Từ ngày (YYYY-MM-DD)")
    date_to: Optional[date] = Field(None, description="Đến ngày (YYYY-MM-DD)")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ------------------------------------------------------------------------------
# Daily Attendance Summary / Report with Request Override
# ------------------------------------------------------------------------------
class DailyAttendanceReport(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    full_name: str
    department: str
    position: str
    target_date: date
    first_check_in: Optional[datetime] = None
    last_check_out: Optional[datetime] = None
    status_label: str = Field(..., description="Trạng thái chấm công (VD: Đúng giờ, Đúng giờ (Nửa công), Đi công tác, Đi muộn 15p, Vắng mặt)")
    work_units: float = Field(..., description="Số công làm việc (1.0, 0.5, 0.0)")
    minutes_late: int = Field(default=0, description="Số phút đi muộn")
    minutes_early: int = Field(default=0, description="Số phút về sớm")
    approved_request_type: Optional[AttendanceRequestType] = None
    approved_request_reason: Optional[str] = None
    records_count: int = 0
    note: Optional[str] = None
