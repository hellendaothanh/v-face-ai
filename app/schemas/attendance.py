import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.attendance import AttendanceType
from app.schemas.employee import EmployeeRead


class AttendanceRecordRead(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    check_time: datetime
    attendance_type: AttendanceType
    confidence_score: float = Field(..., description="Cosine similarity score (0.0 - 1.0)")
    matched_face_id: Optional[uuid.UUID] = None
    device_id: Optional[str] = None
    snapshot_path: Optional[str] = None
    note: Optional[str] = None
    employee: Optional[EmployeeRead] = None

    model_config = {"from_attributes": True}


class AttendanceCheckInResponse(BaseModel):
    record_id: uuid.UUID
    employee_id: uuid.UUID
    employee_code: str
    full_name: str
    department: str
    position: str
    check_time: datetime
    attendance_type: AttendanceType
    confidence_score: float
    message: str


class AttendanceFilterParams(BaseModel):
    employee_code: Optional[str] = Field(None, description="Lọc theo mã nhân viên")
    department: Optional[str] = Field(None, description="Lọc theo phòng ban")
    start_date: Optional[date] = Field(None, description="Ngày bắt đầu (YYYY-MM-DD)")
    end_date: Optional[date] = Field(None, description="Ngày kết thúc (YYYY-MM-DD)")
    attendance_type: Optional[AttendanceType] = Field(None, description="Loại chấm công (CHECK_IN, CHECK_OUT, AUTO)")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
