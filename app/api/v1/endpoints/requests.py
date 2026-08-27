import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.attendance_request import AttendanceRequestType, RequestStatus
from app.schemas.attendance_request import (
    AttendanceRequestApprove,
    AttendanceRequestCreate,
    AttendanceRequestFilterParams,
    AttendanceRequestRead,
    AttendanceRequestReject,
    DailyAttendanceReport,
)
from app.schemas.common import PaginatedResponse, ResponseBase
from app.services.request_service import request_service

router = APIRouter(prefix="/requests", tags=["Attendance Requests"])


@router.post(
    "",
    response_model=ResponseBase[AttendanceRequestRead],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo đơn xin nghỉ / công tác / giải trình đi trễ mới"
)
async def create_attendance_request(
    payload: AttendanceRequestCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Nhân viên nộp đơn ngoại lệ chấm công:
    - `HALF_DAY_LEAVE_AM`: Nghỉ nửa ngày sáng (ca chiều làm từ 13:00)
    - `HALF_DAY_LEAVE_PM`: Nghỉ nửa ngày chiều (ca sáng kết thúc lúc 12:00)
    - `BUSINESS_TRIP`: Đi công tác ngoài giờ/cả ngày
    - `LATE_EXCUSE`: Giải trình đi muộn / về sớm có lý do
    """
    req = await request_service.create_request(db=db, payload=payload)
    return ResponseBase(
        success=True,
        message=f"Đã tạo đơn '{req.request_type.value}' cho ngày {req.target_date.strftime('%d/%m/%Y')} thành công.",
        data=AttendanceRequestRead.model_validate(req)
    )


@router.get(
    "",
    response_model=ResponseBase[PaginatedResponse[AttendanceRequestRead]],
    summary="Lấy danh sách đơn từ (Có bộ lọc theo trạng thái PENDING, nhân viên, ngày)"
)
async def list_attendance_requests(
    status: Optional[RequestStatus] = Query(None, description="Lọc trạng thái: PENDING (Chờ duyệt), APPROVED (Đã duyệt), REJECTED (Từ chối)"),
    request_type: Optional[AttendanceRequestType] = Query(None, description="Lọc theo loại đơn"),
    employee_id: Optional[uuid.UUID] = Query(None, description="Lọc theo ID nhân viên"),
    employee_code: Optional[str] = Query(None, description="Lọc theo mã nhân viên"),
    date_from: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(20, ge=1, le=100, description="Kích thước trang"),
    db: AsyncSession = Depends(get_db)
):
    """Lấy danh sách đơn từ được phân trang và lọc theo trạng thái."""
    params = AttendanceRequestFilterParams(
        status=status,
        request_type=request_type,
        employee_id=employee_id,
        employee_code=employee_code,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size
    )
    result = await request_service.get_requests(db=db, params=params)
    return ResponseBase(
        success=True,
        message="Lấy danh sách đơn từ thành công",
        data=result
    )


@router.put(
    "/{id}/approve",
    response_model=ResponseBase[dict],
    summary="Duyệt đơn từ & Tự động tính toán lại công cho ngày liên quan"
)
async def approve_attendance_request(
    id: uuid.UUID,
    payload: Optional[AttendanceRequestApprove] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Quản lý phê duyệt đơn:
    - Cập nhật trạng thái đơn thành `APPROVED`.
    - Tự động áp dụng logic thay đổi mốc ca và tính lại ngày công cho nhân viên.
    """
    req, daily_report = await request_service.approve_request(
        db=db,
        request_id=id,
        payload=payload
    )
    return ResponseBase(
        success=True,
        message=f"Đã duyệt đơn '{req.request_type.value}' thành công. Đã cập nhật công ngày {req.target_date.strftime('%d/%m/%Y')} thành '{daily_report.status_label}'.",
        data={
            "request": AttendanceRequestRead.model_validate(req),
            "updated_daily_report": daily_report
        }
    )


@router.put(
    "/{id}/reject",
    response_model=ResponseBase[AttendanceRequestRead],
    summary="Từ chối đơn từ"
)
async def reject_attendance_request(
    id: uuid.UUID,
    payload: AttendanceRequestReject,
    db: AsyncSession = Depends(get_db)
):
    """Quản lý từ chối đơn với lý do cụ thể."""
    req = await request_service.reject_request(
        db=db,
        request_id=id,
        payload=payload
    )
    return ResponseBase(
        success=True,
        message=f"Đã từ chối đơn '{req.request_type.value}'.",
        data=AttendanceRequestRead.model_validate(req)
    )


@router.get(
    "/daily-summary",
    response_model=ResponseBase[List[DailyAttendanceReport]],
    summary="Bảng tính công tổng hợp cuối ngày (Đã áp dụng các đơn ngoại lệ)"
)
async def get_daily_attendance_summary(
    target_date: Optional[date] = Query(None, description="Ngày cần tính công (Mặc định hôm nay)"),
    department: Optional[str] = Query(None, description="Lọc theo phòng ban"),
    employee_id: Optional[uuid.UUID] = Query(None, description="Lọc theo nhân viên cụ thể"),
    db: AsyncSession = Depends(get_db)
):
    """
    Trả về bảng tính công chi tiết của một ngày:
    - Tự động đối chiếu giờ quẹt mặt thực tế với đơn từ `APPROVED`.
    - Hiển thị số công (`work_units`), phút đi trễ/về sớm và trạng thái ngoại lệ.
    """
    calc_date = target_date or date.today()

    if employee_id:
        report = await request_service.calculate_daily_attendance(
            db=db,
            employee_id=employee_id,
            target_date=calc_date
        )
        return ResponseBase(
            success=True,
            message=f"Lấy bảng công ngày {calc_date.strftime('%d/%m/%Y')} thành công",
            data=[report]
        )
    else:
        reports = await request_service.calculate_daily_summary_all(
            db=db,
            target_date=calc_date,
            department=department
        )
        return ResponseBase(
            success=True,
            message=f"Lấy bảng công tổng hợp ngày {calc_date.strftime('%d/%m/%Y')} thành công ({len(reports)} nhân viên)",
            data=reports
        )
