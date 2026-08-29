from datetime import date, datetime, time as dtime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.services.report_export_service import ReportExportService

router = APIRouter(prefix="/reports", tags=["Enterprise Reports Export (Xuất Báo Cáo Doanh Nghiệp)"])


@router.get("/attendance/export", summary="Xuất báo cáo chấm công đa định dạng (Excel, PDF, CSV)")
async def export_attendance_report(
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf|csv)$", description="Định dạng xuất: xlsx, pdf, csv"),
    from_date: Optional[date] = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    department: Optional[str] = Query(default=None, description="Lọc theo phòng ban"),
    db: AsyncSession = Depends(get_db)
):
    """
    Trích xuất toàn bộ dữ liệu chấm công thực tế, tính toán sinh trắc học và đồ bảo hộ PPE
    ra các định dạng tệp tin chuyên nghiệp:
    - **xlsx**: Bảng tính Microsoft Excel có định dạng màu sắc & bảng biểu.
    - **pdf**: Tài liệu PDF khổ ngang A4 có tiêu đề công ty, số trang và lưới dữ liệu.
    - **csv**: Luồng dữ liệu CSV UTF-8 BOM tương thích Google Sheets.
    """
    # 1. Query records
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .order_by(AttendanceRecord.check_time.desc())
    )

    if from_date:
        start_dt = datetime.combine(from_date, dtime.min).replace(tzinfo=timezone.utc)
        stmt = stmt.where(AttendanceRecord.check_time >= start_dt)
    if to_date:
        end_dt = datetime.combine(to_date, dtime.max).replace(tzinfo=timezone.utc)
        stmt = stmt.where(AttendanceRecord.check_time <= end_dt)

    result = await db.execute(stmt)
    records_db = result.scalars().all()

    # 2. Transform into serializable dicts
    serialized = []
    for r in records_db:
        emp_name = r.employee.full_name if r.employee else "Khách / Nhân sự tự do"
        emp_code = r.employee.employee_code if r.employee else "N/A"
        emp_dept = r.employee.department if r.employee else "Chưa phân bổ"

        if department and department.lower() not in emp_dept.lower():
            continue

        serialized.append({
            "id": str(r.id),
            "employee_code": emp_code,
            "employee_name": emp_name,
            "department": emp_dept,
            "check_time": r.check_time,
            "attendance_type": r.attendance_type.value if hasattr(r.attendance_type, "value") else str(r.attendance_type),
            "confidence_score": (r.confidence_score or 0.95) * 100 if (r.confidence_score or 0) <= 1.0 else r.confidence_score,
            "ppe_compliance": r.ppe_compliance,
            "ppe_violations": r.ppe_violations,
            "shift_code": "SHIFT_STANDARD",
            "note": r.note or ""
        })

    # Date range label
    date_label = ""
    if from_date and to_date:
        date_label = f"{from_date.strftime('%d/%m/%Y')} - {to_date.strftime('%d/%m/%Y')}"
    elif from_date:
        date_label = f"Từ ngày {from_date.strftime('%d/%m/%Y')}"

    # 3. Export based on requested format
    if format == "xlsx":
        excel_buffer = ReportExportService.build_attendance_excel(serialized, date_range_str=date_label)
        filename = f"VFace_Attendance_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "pdf":
        pdf_buffer = ReportExportService.build_attendance_pdf(serialized, date_range_str=date_label)
        filename = f"VFace_Attendance_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else:  # CSV
        csv_content = ReportExportService.build_attendance_csv(serialized)
        filename = f"VFace_Attendance_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content.encode("utf-8-sig"),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )


@router.get("/violations/export", summary="Xuất báo cáo vi phạm an ninh & PPE đa định dạng")
async def export_violations_report(
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf|csv)$"),
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Trích xuất danh sách các sự cố vi phạm đồ bảo hộ PPE hoặc cảnh báo an ninh.
    """
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .where(AttendanceRecord.ppe_compliance == False)
        .order_by(AttendanceRecord.check_time.desc())
    )
    if from_date:
        stmt = stmt.where(AttendanceRecord.check_time >= datetime.combine(from_date, dtime.min).replace(tzinfo=timezone.utc))
    if to_date:
        stmt = stmt.where(AttendanceRecord.check_time <= datetime.combine(to_date, dtime.max).replace(tzinfo=timezone.utc))

    result = await db.execute(stmt)
    records_db = result.scalars().all()

    serialized = []
    for r in records_db:
        serialized.append({
            "id": str(r.id),
            "employee_code": r.employee.employee_code if r.employee else "STRANGER",
            "employee_name": r.employee.full_name if r.employee else "Người Lạ Chưa Xác Định",
            "department": r.employee.department if r.employee else "Khu Vực Ra Vào",
            "check_time": r.check_time,
            "attendance_type": "VIOLATION",
            "confidence_score": 0.0,
            "ppe_compliance": False,
            "ppe_violations": r.ppe_violations or "Không đeo khẩu trang / mũ bảo hộ",
            "shift_code": "N/A",
            "note": "Cảnh báo vi phạm an toàn"
        })

    if format == "xlsx":
        excel_buffer = ReportExportService.build_attendance_excel(
            serialized,
            title="BÁO CÁO VI PHẠM ĐỒ BẢO HỘ PPE & AN NINH",
            date_range_str=f"{len(serialized)} sự cố ghi nhận"
        )
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=VFace_Security_Violations.xlsx"}
        )
    elif format == "pdf":
        pdf_buffer = ReportExportService.build_attendance_pdf(
            serialized,
            title="BÁO CÁO SỰ CỐ AN NINH & VI PHẠM PPE",
            date_range_str=f"{len(serialized)} sự cố ghi nhận"
        )
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=VFace_Security_Violations.pdf"}
        )
    else:
        csv_content = ReportExportService.build_attendance_csv(serialized)
        return Response(
            content=csv_content.encode("utf-8-sig"),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=VFace_Security_Violations.csv"}
        )
