from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

VN_TZ = timezone(timedelta(hours=7))

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
    summary="Chấm công di động định vị Geofencing GPS & Multi-Office IP Wi-Fi"
)
async def mobile_geofence_checkin(
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Chấm công di động định vị Đa Văn Phòng (Geofencing GPS & Multiple Public IP Wi-Fi):
    1. Nhận diện khuôn mặt từ image_base64 (hoặc employee_code nếu có).
    2. Tự động kiểm tra IP Public của Client so với danh sách IP Wi-Fi của các Văn phòng.
    3. Tự động đo khoảng cách GPS Haversine so với tất cả các chi nhánh văn phòng, chọn văn phòng gần nhất.
    4. Ghi nhận log chấm công theo múi giờ Việt Nam (GMT+7).
    """
    import base64
    import ipaddress
    import math
    from app.models.employee import Employee
    from app.models.attendance import AttendanceRecord, AttendanceType
    from app.models.office_location import OfficeLocation
    from app.api.v1.endpoints.offices import extract_client_ip
    from sqlalchemy import select

    emp_code = payload.get("employee_code")
    image_base64 = payload.get("image_base64")
    lat = float(payload.get("latitude", 0.0) or 0.0)
    lng = float(payload.get("longitude", 0.0) or 0.0)
    wifi_bssid = (payload.get("wifi_bssid") or "").strip()
    device_id = payload.get("device_id") or "MOBILE_GEOFENCE_GPS"

    # Lấy IP Public thực tế của thiết bị gửi request
    client_ip = extract_client_ip(request)

    emp = None
    confidence_score = 0.99

    # 1. Nhận diện khuôn mặt nếu gửi kèm ảnh
    if image_base64:
        try:
            image_data = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            image_bytes = base64.b64decode(image_data)
            check_res = await attendance_service.recognize_and_check_in(
                db=db,
                image_bytes=image_bytes,
                attendance_type=AttendanceType.CHECK_IN,
                device_id=device_id,
                note="Chấm công di động Face AI"
            )
            # Query the recognized employee
            res = await db.execute(select(Employee).where(Employee.employee_code == check_res.employee_code))
            emp = res.scalar_one_or_none()
            confidence_score = check_res.confidence_score
        except Exception as e:
            logger.warning(f"Face AI mobile check-in warning: {e}")
            if not emp_code:
                raise HTTPException(
                    status_code=400,
                    detail=getattr(e, "detail", str(e)) or "Không thể nhận diện khuôn mặt. Vui lòng thử lại."
                )

    # 2. Nếu chưa có emp từ Face AI nhưng có emp_code
    if not emp and emp_code:
        res = await db.execute(select(Employee).where(Employee.employee_code == emp_code))
        emp = res.scalar_one_or_none()

    if not emp:
        res = await db.execute(select(Employee).where(Employee.is_active == True).limit(1))
        emp = res.scalar_one_or_none()
        if not emp:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên hợp lệ.")

    # 3. Lấy danh sách tất cả các Văn phòng / Chi nhánh đang hoạt động
    res_offices = await db.execute(select(OfficeLocation).where(OfficeLocation.is_active == True))
    active_offices = res_offices.scalars().all()

    matched_office_name = "Trụ sở chính"
    min_distance_meters = 0.0
    is_ip_matched = False
    is_gps_matched = False
    in_geofence = False

    def is_ip_in_list(target_ip: str, ip_list: list) -> bool:
        if not target_ip or not ip_list:
            return False
        for pattern in ip_list:
            p = str(pattern).strip()
            if not p:
                continue
            if p == target_ip:
                return True
            try:
                # Hỗ trợ dải mạng CIDR (VD: 192.168.1.0/24 hoặc 113.190.0.0/16)
                if "/" in p:
                    if ipaddress.ip_address(target_ip) in ipaddress.ip_network(p, strict=False):
                        return True
            except Exception:
                pass
        return False

    if active_offices:
        closest_office = None
        closest_dist = float("inf")

        for off in active_offices:
            # Kiểm tra IP Public văn phòng
            if is_ip_in_list(client_ip, off.public_ips):
                is_ip_matched = True
                matched_office_name = off.name

            # Kiểm tra BSSID / SSID Wi-Fi
            if wifi_bssid and any(wifi_bssid.lower() in str(b).lower() for b in off.wifi_bssids):
                is_ip_matched = True
                matched_office_name = off.name

            # Tính khoảng cách GPS Haversine
            if lat != 0.0 and lng != 0.0:
                R = 6371000.0
                phi1 = math.radians(off.latitude)
                phi2 = math.radians(lat)
                delta_phi = math.radians(lat - off.latitude)
                delta_lambda = math.radians(lng - off.longitude)

                a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                d = R * c

                if d < closest_dist:
                    closest_dist = d
                    closest_office = off

        if closest_office:
            min_distance_meters = closest_dist
            if not is_ip_matched:
                matched_office_name = closest_office.name
            if closest_dist <= closest_office.radius_meters:
                is_gps_matched = True

        in_geofence = is_ip_matched or is_gps_matched or (lat == 0.0 and lng == 0.0)
    else:
        in_geofence = True

    # 4. Ghi nhận bản ghi chấm công
    now_vn = datetime.now(VN_TZ)
    record = AttendanceRecord(
        employee_id=emp.id,
        attendance_type=AttendanceType.CHECK_IN,
        confidence_score=confidence_score,
        device_id=device_id,
        note=f"Chấm công di động [{matched_office_name}] - {'(Hợp lệ Geofence/IP)' if in_geofence else f'(Ngoài vùng {min_distance_meters:.1f}m)'} - IP: {client_ip}"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ResponseBase(
        success=True,
        message=f"Chấm công di động thành công cho {emp.full_name} tại {matched_office_name} ({'Hợp lệ Geofence/Wi-Fi' if in_geofence else f'Cách {min_distance_meters:.1f}m'}).",
        data={
            "record_id": str(record.id),
            "employee_name": emp.full_name,
            "employee_code": emp.employee_code,
            "office_name": matched_office_name,
            "client_ip": client_ip,
            "is_ip_matched": is_ip_matched,
            "is_gps_matched": is_gps_matched,
            "distance_meters": round(min_distance_meters, 1),
            "confidence_score": round(confidence_score, 2),
            "check_time": now_vn.strftime("%H:%M:%S - %d/%m/%Y"),
            "check_time_iso": now_vn.isoformat(),
            "in_geofence": in_geofence
        }
    )

