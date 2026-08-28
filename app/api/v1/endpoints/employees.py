import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.config import settings
from app.core.exceptions import (
    EmployeeCodeAlreadyExistsException,
    EmployeeNotFoundException,
    InvalidImageFormatException,
)
from app.models.employee import Employee
from app.models.face_feature import FaceFeature
from app.schemas.common import PaginatedResponse, ResponseBase
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeDetailRead,
    EmployeeRead,
    EmployeeUpdate,
)
from app.schemas.face import FaceRegisterResponse
from app.services.attendance_service import attendance_service

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post(
    "",
    response_model=ResponseBase[EmployeeRead],
    status_code=status.HTTP_201_CREATED,
    summary="Thêm nhân viên mới"
)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Tạo thông tin nhân viên mới trong hệ thống.
    """
    # Check if employee code already exists
    existing = await db.execute(
        select(Employee).where(Employee.employee_code == payload.employee_code)
    )
    if existing.scalar_one_or_none():
        raise EmployeeCodeAlreadyExistsException(payload.employee_code)

    # Check if email already exists
    existing_email = await db.execute(
        select(Employee).where(Employee.email == payload.email)
    )
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' is already registered."
        )

    employee = Employee(
        id=uuid.uuid4(),
        employee_code=payload.employee_code,
        full_name=payload.full_name,
        email=payload.email,
        phone_number=payload.phone_number,
        department=payload.department,
        position=payload.position,
        is_active=payload.is_active
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    employee_data = EmployeeRead.model_validate(employee)
    employee_data.registered_faces_count = 0

    return ResponseBase(
        success=True,
        message="Thêm nhân viên thành công",
        data=employee_data
    )


@router.get(
    "",
    response_model=ResponseBase[PaginatedResponse[EmployeeRead]],
    summary="Lấy danh sách nhân viên"
)
async def list_employees(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(20, ge=1, le=500, description="Số bản ghi mỗi trang"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã NV, tên, email"),
    department: Optional[str] = Query(None, description="Lọc theo phòng ban"),
    is_active: Optional[bool] = Query(None, description="Lọc theo trạng thái hoạt động"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách nhân viên kèm số lượng vector khuôn mặt đã đăng ký (`registered_faces_count`).
    """
    # Subquery to count face features per employee
    faces_subquery = (
        select(
            FaceFeature.employee_id,
            func.count(FaceFeature.id).label("faces_count")
        )
        .group_by(FaceFeature.employee_id)
        .subquery()
    )

    query = (
        select(
            Employee,
            func.coalesce(faces_subquery.c.faces_count, 0).label("registered_faces_count")
        )
        .outerjoin(faces_subquery, Employee.id == faces_subquery.c.employee_id)
    )

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            (Employee.employee_code.ilike(search_pattern))
            | (Employee.full_name.ilike(search_pattern))
            | (Employee.email.ilike(search_pattern))
        )

    if department:
        query = query.where(Employee.department.ilike(f"%{department.strip()}%"))

    if is_active is not None:
        query = query.where(Employee.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one() or 0

    # Paginate and fetch
    offset = (page - 1) * page_size
    query = query.order_by(Employee.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    items: List[EmployeeRead] = []
    for emp, count in rows:
        read_obj = EmployeeRead.model_validate(emp)
        read_obj.registered_faces_count = count
        items.append(read_obj)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return ResponseBase(
        success=True,
        message="Lấy danh sách nhân viên thành công",
        data=PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )


@router.get(
    "/{id}",
    response_model=ResponseBase[EmployeeDetailRead],
    summary="Lấy chi tiết nhân viên"
)
async def get_employee_detail(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy thông tin chi tiết của một nhân viên và danh sách các vector khuôn mặt đã đăng ký.
    """
    query = (
        select(Employee)
        .options(selectinload(Employee.face_features))
        .where(Employee.id == id)
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()

    if not employee:
        raise EmployeeNotFoundException(id)

    detail_obj = EmployeeDetailRead.model_validate(employee)
    detail_obj.registered_faces_count = len(employee.face_features)

    return ResponseBase(
        success=True,
        message="Lấy thông tin nhân viên thành công",
        data=detail_obj
    )


@router.post(
    "/{id}/register-face",
    response_model=ResponseBase[FaceRegisterResponse],
    summary="Đăng ký khuôn mặt cho nhân viên"
)
async def register_face(
    id: uuid.UUID,
    images: List[UploadFile] = File(
        ...,
        description="Một hoặc nhiều file ảnh khuôn mặt (JPEG/PNG/WEBP)"
    ),
    db: AsyncSession = Depends(get_db)
):
    """
    Nhận 1 hoặc nhiều file ảnh từ Multipart Form:
    1. Kiểm tra định dạng & dung lượng ảnh.
    2. Dùng RetinaFace phát hiện khuôn mặt và kiểm tra chất lượng.
    3. Dùng ArcFace trích xuất vector 512 chiều.
    4. Lưu vector vào bảng `face_features` của PostgreSQL qua pgvector.
    """
    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tải lên ít nhất một file ảnh."
        )

    valid_content_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

    image_files: List[tuple[str, bytes]] = []
    for file in images:
        if file.content_type not in valid_content_types:
            raise InvalidImageFormatException(
                f"File '{file.filename}' không đúng định dạng. Chỉ chấp nhận JPEG, PNG, WEBP."
            )
        
        file_bytes = await file.read()
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Ảnh '{file.filename}' vượt quá dung lượng tối đa ({settings.MAX_IMAGE_SIZE_MB}MB)."
            )

        image_files.append((file.filename or "unknown.jpg", file_bytes))

    response_data = await attendance_service.register_employee_faces(
        db=db,
        employee_id=id,
        image_files=image_files
    )

    return ResponseBase(
        success=response_data.total_registered > 0,
        message=(
            f"Đã đăng ký thành công {response_data.total_registered}/{response_data.total_uploaded} ảnh khuôn mặt."
            if response_data.total_registered > 0
            else "Không thể đăng ký khuôn mặt từ các ảnh đã tải lên. Vui lòng kiểm tra lại chất lượng ảnh."
        ),
        data=response_data
    )


@router.post(
    "/{id}/verify-face",
    response_model=ResponseBase[dict],
    summary="Kiểm tra & xác thực mẫu khuôn mặt của nhân viên"
)
async def verify_employee_face(
    id: uuid.UUID,
    image: UploadFile = File(..., description="Ảnh chụp khuôn mặt cần kiểm tra"),
    db: AsyncSession = Depends(get_db)
):
    """
    So khớp trực tiếp khuôn mặt từ ảnh gửi lên với 5 vector khuôn mặt của nhân viên.
    Trả về độ tương đồng cao nhất, chỉ số khoảng cách và kết luận XÁC THỰC THÀNH CÔNG hay THẤT BẠI.
    """
    import numpy as np
    from app.services.face_engine import face_engine

    employee = await db.scalar(
        select(Employee).options(selectinload(Employee.face_features)).where(Employee.id == id)
    )
    if not employee:
        raise EmployeeNotFoundException(id)
    if not employee.face_features:
        raise HTTPException(status_code=400, detail="Nhân viên chưa có dữ liệu vector khuôn mặt.")

    image_bytes = await image.read()
    extracted = face_engine.extract_single_face(image_bytes=image_bytes, require_single_face=False)

    query_emb = np.array(extracted.embedding, dtype=np.float32)
    norm = np.linalg.norm(query_emb)
    if norm > 0:
        query_emb = query_emb / norm

    best_sim = -1.0
    for feat in employee.face_features:
        feat_emb = np.array(feat.embedding, dtype=np.float32)
        fnorm = np.linalg.norm(feat_emb)
        if fnorm > 0:
            feat_emb = feat_emb / fnorm
        sim = float(np.dot(query_emb, feat_emb))
        if sim > best_sim:
            best_sim = sim

    confidence_percent = round(max(0.0, best_sim) * 100.0, 2)
    is_verified = best_sim >= settings.FACE_SIMILARITY_THRESHOLD

    return ResponseBase(
        success=is_verified,
        message=f"Xác thực {'thành công' if is_verified else 'không khớp'}: Độ tin cậy {confidence_percent}%",
        data={
            "employee_id": str(employee.id),
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "is_verified": is_verified,
            "confidence_percent": confidence_percent,
            "similarity_score": round(best_sim, 4),
            "threshold": settings.FACE_SIMILARITY_THRESHOLD,
            "registered_templates_count": len(employee.face_features),
            "blur_score": extracted.blur_score,
            "detection_score": extracted.detection_score
        }
    )


@router.put(
    "/{id}",
    response_model=ResponseBase[EmployeeRead],
    summary="Cập nhật thông tin nhân viên"
)
async def update_employee(
    id: uuid.UUID,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Cập nhật thông tin nhân viên: Họ tên, Email, SĐT, Phòng ban, Chức vụ, Trạng thái.
    """
    query = select(Employee).where(Employee.id == id)
    result = await db.execute(query)
    employee = result.scalar_one_or_none()

    if not employee:
        raise EmployeeNotFoundException(id)

    if payload.email and payload.email != employee.email:
        existing_email = await db.execute(
            select(Employee).where(Employee.email == payload.email, Employee.id != id)
        )
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{payload.email}' is already in use by another employee."
            )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    await db.commit()
    await db.refresh(employee)

    employee_data = EmployeeRead.model_validate(employee)
    return ResponseBase(
        success=True,
        message="Cập nhật thông tin nhân viên thành công",
        data=employee_data
    )


@router.delete(
    "/{id}",
    response_model=ResponseBase[dict],
    summary="Xóa nhân viên"
)
async def delete_employee(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Xoá nhân viên và tự động cascade xoá toàn bộ vector khuôn mặt cũng như lịch sử chấm công liên quan.
    """
    query = select(Employee).where(Employee.id == id)
    result = await db.execute(query)
    employee = result.scalar_one_or_none()

    if not employee:
        raise EmployeeNotFoundException(id)

    await db.delete(employee)
    await db.commit()

    return ResponseBase(
        success=True,
        message=f"Đã xóa nhân viên '{employee.full_name}' ({employee.employee_code}) thành công.",
        data={"deleted_id": str(id)}
    )
