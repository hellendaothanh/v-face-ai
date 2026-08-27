import uuid
from datetime import date, datetime, time, timezone
from typing import List, Optional, Tuple
from loguru import logger
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EmployeeNotFoundException, VFaceException
from app.models.attendance import AttendanceRecord
from app.models.attendance_request import (
    AttendanceRequest,
    AttendanceRequestType,
    RequestStatus,
)
from app.models.employee import Employee
from app.schemas.attendance_request import (
    AttendanceRequestApprove,
    AttendanceRequestCreate,
    AttendanceRequestFilterParams,
    AttendanceRequestRead,
    AttendanceRequestReject,
    DailyAttendanceReport,
)
from app.schemas.common import PaginatedResponse


class RequestNotFoundException(VFaceException):
    def __init__(self, request_id: uuid.UUID):
        super().__init__(
            status_code=404,
            detail=f"Không tìm thấy đơn từ có mã '{request_id}'."
        )


class RequestService:
    @staticmethod
    async def create_request(
        db: AsyncSession,
        payload: AttendanceRequestCreate
    ) -> AttendanceRequest:
        """Tạo đơn xin nghỉ / công tác / giải trình đi trễ mới cho nhân viên."""
        # Kiểm tra nhân viên tồn tại
        emp_query = select(Employee).where(Employee.id == payload.employee_id)
        emp_res = await db.execute(emp_query)
        employee = emp_res.scalar_one_or_none()
        if not employee:
            raise EmployeeNotFoundException(payload.employee_id)

        # Kiểm tra trùng lặp đơn trong cùng 1 ngày
        existing_query = select(AttendanceRequest).where(
            and_(
                AttendanceRequest.employee_id == payload.employee_id,
                AttendanceRequest.target_date == payload.target_date,
                AttendanceRequest.status.in_([RequestStatus.PENDING, RequestStatus.APPROVED])
            )
        )
        existing_res = await db.execute(existing_query)
        existing = existing_res.first()
        if existing:
            raise VFaceException(
                status_code=409,
                detail=f"Nhân viên {employee.full_name} đã có đơn đăng ký cho ngày {payload.target_date.strftime('%d/%m/%Y')}."
            )

        req = AttendanceRequest(
            id=uuid.uuid4(),
            employee_id=payload.employee_id,
            request_type=payload.request_type,
            target_date=payload.target_date,
            reason=payload.reason.strip(),
            status=RequestStatus.PENDING
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

        logger.info(
            f"Created attendance request: {req.id} | Employee: {employee.full_name} | "
            f"Type: {req.request_type} | Date: {req.target_date}"
        )
        return req

    @classmethod
    async def approve_request(
        cls,
        db: AsyncSession,
        request_id: uuid.UUID,
        payload: Optional[AttendanceRequestApprove] = None
    ) -> Tuple[AttendanceRequest, DailyAttendanceReport]:
        """
        Duyệt đơn từ và tự động tính toán lại báo cáo công cho ngày tương ứng.
        """
        query = (
            select(AttendanceRequest)
            .options(selectinload(AttendanceRequest.employee))
            .where(AttendanceRequest.id == request_id)
        )
        res = await db.execute(query)
        req = res.scalar_one_or_none()
        if not req:
            raise RequestNotFoundException(request_id)

        req.status = RequestStatus.APPROVED
        req.approved_by = payload.approved_by if payload and payload.approved_by else "Quản lý"
        req.approved_at = datetime.now(timezone.utc)
        if payload and payload.note:
            req.note = payload.note

        await db.commit()
        await db.refresh(req)

        logger.info(
            f"Approved attendance request: {req.id} | Type: {req.request_type} | "
            f"By: {req.approved_by} | Date: {req.target_date}"
        )

        # Tính toán lại dữ liệu công nhật cho nhân viên trong ngày đó
        daily_report = await cls.calculate_daily_attendance(
            db=db,
            employee_id=req.employee_id,
            target_date=req.target_date
        )

        return req, daily_report

    @staticmethod
    async def reject_request(
        db: AsyncSession,
        request_id: uuid.UUID,
        payload: AttendanceRequestReject
    ) -> AttendanceRequest:
        """Từ chối đơn từ."""
        query = (
            select(AttendanceRequest)
            .options(selectinload(AttendanceRequest.employee))
            .where(AttendanceRequest.id == request_id)
        )
        res = await db.execute(query)
        req = res.scalar_one_or_none()
        if not req:
            raise RequestNotFoundException(request_id)

        req.status = RequestStatus.REJECTED
        req.approved_by = payload.rejected_by or "Quản lý"
        req.approved_at = datetime.now(timezone.utc)
        req.note = payload.note

        await db.commit()
        await db.refresh(req)

        logger.info(f"Rejected attendance request: {req.id} | Reason: {payload.note}")
        return req

    @staticmethod
    async def get_requests(
        db: AsyncSession,
        params: AttendanceRequestFilterParams
    ) -> PaginatedResponse[AttendanceRequestRead]:
        """Lấy danh sách đơn từ có phân trang và bộ lọc linh hoạt."""
        query = (
            select(AttendanceRequest)
            .join(Employee, AttendanceRequest.employee_id == Employee.id)
            .options(selectinload(AttendanceRequest.employee))
        )

        if params.status:
            query = query.where(AttendanceRequest.status == params.status)

        if params.request_type:
            query = query.where(AttendanceRequest.request_type == params.request_type)

        if params.employee_id:
            query = query.where(AttendanceRequest.employee_id == params.employee_id)

        if params.employee_code:
            query = query.where(Employee.employee_code.ilike(f"%{params.employee_code.strip()}%"))

        if params.date_from:
            query = query.where(AttendanceRequest.target_date >= params.date_from)

        if params.date_to:
            query = query.where(AttendanceRequest.target_date <= params.date_to)

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_stmt)).scalar_one() or 0

        # Pagination & Ordering (Chờ duyệt ưu tiên lên đầu, sau đó theo target_date mới nhất)
        offset = (params.page - 1) * params.page_size
        query = (
            query.order_by(
                (AttendanceRequest.status == RequestStatus.PENDING).desc(),
                AttendanceRequest.created_at.desc()
            )
            .offset(offset)
            .limit(params.page_size)
        )

        res = await db.execute(query)
        records = res.scalars().all()

        items = [AttendanceRequestRead.model_validate(r) for r in records]
        total_pages = (total + params.page_size - 1) // params.page_size if total > 0 else 0

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages
        )

    # --------------------------------------------------------------------------
    # CORE LOGIC: Tính công nhật có áp dụng đơn từ ngoại lệ
    # --------------------------------------------------------------------------
    @classmethod
    async def calculate_daily_attendance(
        cls,
        db: AsyncSession,
        employee_id: uuid.UUID,
        target_date: date
    ) -> DailyAttendanceReport:
        """
        Tính công và xử lý ngoại lệ theo đơn từ đã duyệt:
        - Mốc ca chuẩn: Sáng (08:30 - 12:00, ân hạn đến 08:45), Chiều (13:00 - 17:00, ân hạn đến 13:15).
        - HALF_DAY_LEAVE_PM (Nghỉ chiều): Ca kết thúc lúc 12:00. Ra về sau 12:00 -> Đúng giờ (0.5 công).
        - HALF_DAY_LEAVE_AM (Nghỉ sáng): Ca bắt đầu lúc 13:00. Đến trước 13:15 -> Đúng giờ (0.5 công).
        - BUSINESS_TRIP / LATE_EXCUSE: Ghi đè thành 'Đúng giờ', minutes_late=0, minutes_early=0 (1.0 công).
        - Không có đơn: Tính trễ/sớm theo giờ quẹt thẻ thực tế.
        """
        # 1. Lấy thông tin nhân viên
        emp_query = select(Employee).where(Employee.id == employee_id)
        emp_res = await db.execute(emp_query)
        employee = emp_res.scalar_one_or_none()
        if not employee:
            raise EmployeeNotFoundException(employee_id)

        # 2. Lấy đơn từ đã DUYỆT (APPROVED) trong ngày
        req_query = select(AttendanceRequest).where(
            and_(
                AttendanceRequest.employee_id == employee_id,
                AttendanceRequest.target_date == target_date,
                AttendanceRequest.status == RequestStatus.APPROVED
            )
        )
        req_res = await db.execute(req_query)
        approved_request = req_res.scalar_one_or_none()

        # 3. Lấy tất cả các lượt quẹt mặt trong ngày
        start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)

        records_query = (
            select(AttendanceRecord)
            .where(
                and_(
                    AttendanceRecord.employee_id == employee_id,
                    AttendanceRecord.check_time >= start_dt,
                    AttendanceRecord.check_time <= end_dt
                )
            )
            .order_by(AttendanceRecord.check_time.asc())
        )
        records_res = await db.execute(records_query)
        records = records_res.scalars().all()

        first_check_in = records[0].check_time if records else None
        last_check_out = records[-1].check_time if len(records) > 1 else first_check_in

        # Mốc thời gian chuẩn
        std_morning_start = time(8, 30)
        std_morning_grace = time(8, 45)
        std_noon = time(12, 0)
        std_afternoon_start = time(13, 0)
        std_afternoon_grace = time(13, 15)
        std_afternoon_end = time(17, 0)

        # 4. ÁP DỤNG LOGIC BIẾN ĐỔI THEO ĐƠN TỪ
        status_label = "Vắng mặt"
        work_units = 0.0
        minutes_late = 0
        minutes_early = 0
        note = None

        if approved_request:
            req_type = approved_request.request_type

            # Case A: Đi công tác
            if req_type == AttendanceRequestType.BUSINESS_TRIP:
                status_label = "Đúng giờ (Đi công tác)"
                work_units = 1.0
                minutes_late = 0
                minutes_early = 0
                note = f"Áp dụng đơn Công tác đã duyệt: {approved_request.reason}"

            # Case B: Giải trình đi muộn / về sớm
            elif req_type == AttendanceRequestType.LATE_EXCUSE:
                status_label = "Đúng giờ (Giải trình được duyệt)"
                work_units = 1.0 if records else 0.5
                minutes_late = 0
                minutes_early = 0
                note = f"Miễn phạt đi muộn/về sớm: {approved_request.reason}"

            # Case C: Nghỉ nửa ngày chiều (HALF_DAY_LEAVE_PM)
            elif req_type == AttendanceRequestType.HALF_DAY_LEAVE_PM:
                if first_check_in:
                    local_in = first_check_in.astimezone().time()
                    local_out = last_check_out.astimezone().time() if last_check_out else local_in

                    # Kiểm tra giờ đến sáng
                    if local_in > std_morning_grace:
                        in_minutes = local_in.hour * 60 + local_in.minute
                        std_minutes = std_morning_start.hour * 60 + std_morning_start.minute
                        minutes_late = max(0, in_minutes - std_minutes)
                        status_label = f"Đi muộn ca sáng ({minutes_late}p) - Nghỉ chiều"
                        work_units = 0.5
                    else:
                        minutes_late = 0
                        status_label = "Đúng giờ (Nửa công sáng)"
                        work_units = 0.5

                    # Kết thúc ca lúc 12:00 -> Nếu về sau 12:00 tính đúng giờ
                    if local_out < std_noon and len(records) > 1:
                        out_minutes = local_out.hour * 60 + local_out.minute
                        noon_minutes = std_noon.hour * 60 + std_noon.minute
                        minutes_early = max(0, noon_minutes - out_minutes)
                    else:
                        minutes_early = 0
                else:
                    status_label = "Vắng mặt ca sáng (Đã có đơn nghỉ chiều)"
                    work_units = 0.0

                note = f"Đơn nghỉ nửa ngày chiều: {approved_request.reason}"

            # Case D: Nghỉ nửa ngày sáng (HALF_DAY_LEAVE_AM)
            elif req_type == AttendanceRequestType.HALF_DAY_LEAVE_AM:
                if first_check_in:
                    local_in = first_check_in.astimezone().time()
                    local_out = last_check_out.astimezone().time() if last_check_out else local_in

                    # Ca chiều bắt đầu 13:00, ân hạn đến 13:15
                    if local_in <= std_afternoon_grace:
                        minutes_late = 0
                        status_label = "Đúng giờ (Nửa công chiều)"
                        work_units = 0.5
                    else:
                        in_minutes = local_in.hour * 60 + local_in.minute
                        pm_start_minutes = std_afternoon_start.hour * 60 + std_afternoon_start.minute
                        minutes_late = max(0, in_minutes - pm_start_minutes)
                        status_label = f"Đi muộn ca chiều ({minutes_late}p) - Nghỉ sáng"
                        work_units = 0.5

                    # Kiểm tra về sớm ca chiều (trước 17:00)
                    if local_out < std_afternoon_end and len(records) > 1:
                        out_minutes = local_out.hour * 60 + local_out.minute
                        end_minutes = std_afternoon_end.hour * 60 + std_afternoon_end.minute
                        minutes_early = max(0, end_minutes - out_minutes)
                    else:
                        minutes_early = 0
                else:
                    status_label = "Vắng mặt ca chiều (Đã có đơn nghỉ sáng)"
                    work_units = 0.0

                note = f"Đơn nghỉ nửa ngày sáng: {approved_request.reason}"

        # 5. KHÔNG CÓ ĐƠN TỪ (Tính toán chấm công thực tế)
        else:
            if not records:
                status_label = "Vắng mặt"
                work_units = 0.0
            else:
                local_in = first_check_in.astimezone().time()
                local_out = last_check_out.astimezone().time() if last_check_out else local_in

                # Check đi muộn
                if local_in > std_morning_grace:
                    in_minutes = local_in.hour * 60 + local_in.minute
                    std_minutes = std_morning_start.hour * 60 + std_morning_start.minute
                    minutes_late = max(0, in_minutes - std_minutes)
                else:
                    minutes_late = 0

                # Check về sớm
                if local_out < std_afternoon_end and len(records) > 1:
                    out_minutes = local_out.hour * 60 + local_out.minute
                    end_minutes = std_afternoon_end.hour * 60 + std_afternoon_end.minute
                    minutes_early = max(0, end_minutes - out_minutes)
                else:
                    minutes_early = 0

                # Đánh giá công và nhãn
                if minutes_late == 0 and minutes_early == 0:
                    status_label = "Đúng giờ (Đủ công)"
                    work_units = 1.0
                elif minutes_late > 0 and minutes_early > 0:
                    status_label = f"Đi muộn ({minutes_late}p) & Về sớm ({minutes_early}p)"
                    work_units = 1.0
                elif minutes_late > 0:
                    status_label = f"Đi muộn ({minutes_late}p)"
                    work_units = 1.0
                elif minutes_early > 0:
                    status_label = f"Về sớm ({minutes_early}p)"
                    work_units = 1.0

        return DailyAttendanceReport(
            employee_id=employee.id,
            employee_code=employee.employee_code,
            full_name=employee.full_name,
            department=employee.department,
            position=employee.position,
            target_date=target_date,
            first_check_in=first_check_in,
            last_check_out=last_check_out,
            status_label=status_label,
            work_units=work_units,
            minutes_late=minutes_late,
            minutes_early=minutes_early,
            approved_request_type=approved_request.request_type if approved_request else None,
            approved_request_reason=approved_request.reason if approved_request else None,
            records_count=len(records),
            note=note
        )

    @classmethod
    async def calculate_daily_summary_all(
        cls,
        db: AsyncSession,
        target_date: date,
        department: Optional[str] = None
    ) -> List[DailyAttendanceReport]:
        """Tính toán bảng công tổng hợp cho tất cả nhân viên trong một ngày cụ thể."""
        emp_query = select(Employee).where(Employee.is_active.is_(True))
        if department:
            emp_query = emp_query.where(Employee.department.ilike(f"%{department.strip()}%"))
        emp_query = emp_query.order_by(Employee.employee_code.asc())

        emp_res = await db.execute(emp_query)
        employees = emp_res.scalars().all()

        reports: List[DailyAttendanceReport] = []
        for emp in employees:
            report = await cls.calculate_daily_attendance(
                db=db,
                employee_id=emp.id,
                target_date=target_date
            )
            reports.append(report)

        return reports


request_service = RequestService()
