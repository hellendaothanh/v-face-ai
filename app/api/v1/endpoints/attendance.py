from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.core.exceptions import InvalidImageFormatException
from app.models.attendance import AttendanceType
from app.schemas.attendance import (
    AttendanceCheckInResponse,
    AttendanceFilterParams,
    AttendanceRecordRead,
)
from app.schemas.common import PaginatedResponse, ResponseBase
from app.services.attendance_service import attendance_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post(
    "/check-in",
    response_model=ResponseBase[AttendanceCheckInResponse],
    summary="Chấm công bằng nhận diện khuôn mặt (Check-in/Check-out)"
)
async def face_check_in(
    image: UploadFile = File(
        ...,
        description="Ảnh chụp trực tiếp từ camera chấm công (JPEG/PNG/WEBP)"
    ),
    attendance_type: AttendanceType = Form(
        default=AttendanceType.CHECK_IN,
        description="Loại chấm công: CHECK_IN, CHECK_OUT, hoặc AUTO"
    ),
    device_id: Optional[str] = Form(
        None,
        description="Mã thiết bị / camera chấm công (VD: CAM_GATE_01)"
    ),
    note: Optional[str] = Form(
        None,
        description="Ghi chú thêm nếu có"
    ),
    db: AsyncSession = Depends(get_db)
):
    """
    Điểm danh khuôn mặt:
    1. Trích xuất vector 512D từ ảnh camera.
    2. Truy vấn Cosine Distance với toán tử `<=>` của pgvector trong PostgreSQL.
    3. Kiểm tra độ tương đồng với ngưỡng (Threshold e.g. >= 0.60).
    4. Ghi nhận log chấm công và trả về thông tin nhân viên tương ứng.
    """
    valid_content_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in valid_content_types:
        raise InvalidImageFormatException("Ảnh không đúng định dạng. Chỉ chấp nhận JPEG, PNG, WEBP.")

    image_bytes = await image.read()
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh vượt quá giới hạn ({settings.MAX_IMAGE_SIZE_MB}MB)."
        )

    check_in_result = await attendance_service.recognize_and_check_in(
        db=db,
        image_bytes=image_bytes,
        attendance_type=attendance_type,
        device_id=device_id,
        note=note
    )

    return ResponseBase(
        success=True,
        message=check_in_result.message,
        data=check_in_result
    )


@router.get(
    "",
    response_model=ResponseBase[PaginatedResponse[AttendanceRecordRead]],
    summary="Lấy lịch sử chấm công"
)
async def get_attendance_history(
    employee_code: Optional[str] = Query(None, description="Lọc theo mã nhân viên"),
    department: Optional[str] = Query(None, description="Lọc theo phòng ban"),
    start_date: Optional[date] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)"),
    attendance_type: Optional[AttendanceType] = Query(None, description="Lọc loại chấm công"),
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    db: AsyncSession = Depends(get_db)
):
    """
    Truy vấn lịch sử chấm công với các bộ lọc theo ngày, mã nhân viên, phòng ban.
    """
    filter_params = AttendanceFilterParams(
        employee_code=employee_code,
        department=department,
        start_date=start_date,
        end_date=end_date,
        attendance_type=attendance_type,
        page=page,
        page_size=page_size
    )

    result = await attendance_service.get_attendance_history(
        db=db,
        params=filter_params
    )

    return ResponseBase(
        success=True,
        message="Lấy lịch sử chấm công thành công",
        data=result
    )


@router.post(
    "/mobile-checkin",
    response_model=ResponseBase[dict],
    summary="Chấm công di động định vị Geofencing GPS & BSSID"
)
async def mobile_geofence_checkin(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Roadmap Phase 4: Chấm công di động định vị Geofencing GPS & BSSID.
    Kiểm tra khoảng cách GPS của nhân viên so với trụ sở cơ quan (bán kính cho phép 500m).
    """
    import math
    from app.models.employee import Employee
    from sqlalchemy import select

    emp_code = payload.get("employee_code")
    lat = float(payload.get("latitude", 0.0))
    lng = float(payload.get("longitude", 0.0))
    wifi_bssid = payload.get("wifi_bssid")

    if not emp_code:
        raise HTTPException(status_code=400, detail="Thiếu mã nhân viên.")

    res = await db.execute(select(Employee).where(Employee.employee_code == emp_code))
    emp = res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy nhân viên {emp_code}.")

    # Office Coordinates: Hanoi Headquarter (21.0285, 105.8542)
    office_lat, office_lng = 21.0285, 105.8542
    # Haversine distance formula (meters)
    R = 6371000.0
    phi1 = math.radians(office_lat)
    phi2 = math.radians(lat)
    delta_phi = math.radians(lat - office_lat)
    delta_lambda = math.radians(lng - office_lng)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_meters = R * c

    # Allow if within 500m or if matched trusted office BSSID
    max_radius = 500.0
    in_geofence = distance_meters <= max_radius or (wifi_bssid and "vface" in wifi_bssid.lower())

    if not in_geofence:
        raise HTTPException(
            status_code=400,
            detail=f"Vị trí nằm ngoài vùng cho phép ({distance_meters:.1f}m > {max_radius:.0f}m). Vui lòng check-in trong khuôn viên văn phòng."
        )

    # Create Attendance Record
    from app.models.attendance import AttendanceRecord, AttendanceType
    record = AttendanceRecord(
        employee_id=emp.id,
        attendance_type=AttendanceType.CHECK_IN,
        confidence_score=0.99,
        device_id="MOBILE_GEOFENCE_GPS",
        note=f"Chấm công di động Geofence (Cách VP {distance_meters:.1f}m, BSSID={wifi_bssid or 'N/A'})"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ResponseBase(
        success=True,
        message=f"Chấm công di động thành công cho {emp.full_name} (Cách VP {distance_meters:.1f}m).",
        data={
            "record_id": str(record.id),
            "employee_name": emp.full_name,
            "employee_code": emp.employee_code,
            "distance_meters": round(distance_meters, 1),
            "check_time": record.check_time.isoformat(),
            "in_geofence": in_geofence
        }
    )

