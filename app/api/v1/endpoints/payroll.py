import csv
import io
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.work_shift import PayrollRecord, PayrollStatus, WorkShift, ShiftAssignment
from app.models.employee import Employee
from app.models.attendance import AttendanceRecord, AttendanceType
from app.schemas.work_shift import (
    PayrollCalculateRequest,
    PayrollRecordResponse,
    PayrollStatusUpdate
)

router = APIRouter(prefix="/payroll", tags=["Automated Timesheet & Payroll Engine"])


@router.post("/calculate", response_model=List[PayrollRecordResponse])
async def calculate_monthly_payroll(
    payload: PayrollCalculateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Automated Payroll Engine: Computes monthly timesheet metrics from raw attendance logs,
    applies shift grace periods, overtime rules, deductions, and creates/updates PayrollRecords.
    """
    month = payload.month
    year = payload.year

    # 1. Fetch eligible employees
    emp_query = select(Employee).where(Employee.is_active == True)
    if payload.employee_id:
        emp_query = emp_query.where(Employee.id == payload.employee_id)
    if payload.department_id:
        emp_query = emp_query.where(Employee.department == str(payload.department_id))

    emp_res = await db.execute(emp_query)
    employees = emp_res.scalars().all()

    if not employees:
        return []

    # 2. Date boundaries for the month
    start_dt = datetime(year, month, 1, 0, 0, 0)
    if month == 12:
        end_dt = datetime(year + 1, 1, 1, 0, 0, 0)
    else:
        end_dt = datetime(year, month + 1, 1, 0, 0, 0)

    calculated_records = []

    for emp in employees:
        # Fetch all attendance records for this employee in the month
        att_query = select(AttendanceRecord).where(
            and_(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.check_time >= start_dt,
                AttendanceRecord.check_time < end_dt
            )
        ).order_by(AttendanceRecord.check_time.asc())
        
        att_res = await db.execute(att_query)
        att_records = att_res.scalars().all()

        # Group records by calendar day
        days_present = set()
        late_count = 0
        early_count = 0
        total_hours = 0.0
        ot_hours = 0.0

        daily_records = {}
        for r in att_records:
            d_key = r.check_time.date()
            if d_key not in daily_records:
                daily_records[d_key] = []
            daily_records[d_key].append(r)

        for d_key, recs in daily_records.items():
            days_present.add(d_key)
            first_check = recs[0].check_time
            last_check = recs[-1].check_time

            # Calculate daily duration
            diff_hours = (last_check - first_check).total_seconds() / 3600.0
            if diff_hours < 0.1:  # single check-in: assume 8 hours standard
                diff_hours = 8.0

            total_hours += diff_hours

            # Check late arrival (after 08:15 standard)
            if first_check.hour > 8 or (first_check.hour == 8 and first_check.minute > 15):
                late_count += 1

            # Check early leave (before 17:00 standard)
            if last_check.hour < 17:
                early_count += 1

            # Overtime > 8 hours
            if diff_hours > 8.0:
                ot_hours += (diff_hours - 8.0)

        actual_days = float(len(days_present))
        standard_days = 22.0

        # Salary formula
        base_salary = 12000000.0  # 12,000,000 VND default
        hourly_rate = base_salary / (standard_days * 8.0)
        allowance = 1500000.0    # 1,500,000 VND meal/transport
        ot_pay = ot_hours * hourly_rate * 1.5
        late_penalty = late_count * 50000.0  # 50,000 VND per late arrival
        bonus = 500000.0 if late_count == 0 and actual_days >= standard_days else 0.0

        # Pro-rated base if worked less than standard days
        prorated_base = (actual_days / standard_days) * base_salary if standard_days > 0 else base_salary
        gross_salary = prorated_base + allowance + ot_pay + bonus - late_penalty
        insurance_deduction = gross_salary * 0.105  # 10.5% Social / Health / Unemployment insurance
        net_salary = max(0.0, gross_salary - insurance_deduction)

        # Check existing record
        rec_query = select(PayrollRecord).where(
            and_(
                PayrollRecord.employee_id == emp.id,
                PayrollRecord.month == month,
                PayrollRecord.year == year
            )
        )
        existing_rec = (await db.execute(rec_query)).scalar_one_or_none()

        if existing_rec:
            existing_rec.standard_work_days = standard_days
            existing_rec.actual_worked_days = actual_days
            existing_rec.total_work_hours = round(total_hours, 1)
            existing_rec.overtime_hours = round(ot_hours, 1)
            existing_rec.late_arrivals_count = late_count
            existing_rec.early_leaves_count = early_count
            existing_rec.base_salary = base_salary
            existing_rec.hourly_rate = round(hourly_rate, 2)
            existing_rec.overtime_pay = round(ot_pay, 0)
            existing_rec.allowance = allowance
            existing_rec.late_penalty = late_penalty
            existing_rec.bonus = bonus
            existing_rec.gross_salary = round(gross_salary, 0)
            existing_rec.insurance_deduction = round(insurance_deduction, 0)
            existing_rec.net_salary = round(net_salary, 0)
            record_obj = existing_rec
        else:
            record_obj = PayrollRecord(
                employee_id=emp.id,
                month=month,
                year=year,
                standard_work_days=standard_days,
                actual_worked_days=actual_days,
                total_work_hours=round(total_hours, 1),
                overtime_hours=round(ot_hours, 1),
                late_arrivals_count=late_count,
                early_leaves_count=early_count,
                base_salary=base_salary,
                hourly_rate=round(hourly_rate, 2),
                overtime_pay=round(ot_pay, 0),
                allowance=allowance,
                late_penalty=late_penalty,
                bonus=bonus,
                gross_salary=round(gross_salary, 0),
                insurance_deduction=round(insurance_deduction, 0),
                net_salary=round(net_salary, 0),
                status=PayrollStatus.DRAFT
            )
            db.add(record_obj)

        await db.commit()
        await db.refresh(record_obj)

        resp = PayrollRecordResponse(
            id=record_obj.id,
            employee_id=emp.id,
            employee_name=emp.full_name,
            employee_code=emp.employee_code,
            department_name=emp.department,
            month=month,
            year=year,
            standard_work_days=record_obj.standard_work_days,
            actual_worked_days=record_obj.actual_worked_days,
            total_work_hours=record_obj.total_work_hours,
            overtime_hours=record_obj.overtime_hours,
            late_arrivals_count=record_obj.late_arrivals_count,
            early_leaves_count=record_obj.early_leaves_count,
            approved_paid_leave_days=record_obj.approved_paid_leave_days,
            unpaid_leave_days=record_obj.unpaid_leave_days,
            base_salary=record_obj.base_salary,
            hourly_rate=record_obj.hourly_rate,
            overtime_pay=record_obj.overtime_pay,
            allowance=record_obj.allowance,
            late_penalty=record_obj.late_penalty,
            bonus=record_obj.bonus,
            gross_salary=record_obj.gross_salary,
            insurance_deduction=record_obj.insurance_deduction,
            net_salary=record_obj.net_salary,
            status=record_obj.status,
            notes=record_obj.notes,
            created_at=record_obj.created_at
        )
        calculated_records.append(resp)

    return calculated_records


@router.get("/records", response_model=List[PayrollRecordResponse])
async def list_payroll_records(
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List calculated payroll records.
    """
    query = select(PayrollRecord).order_by(PayrollRecord.year.desc(), PayrollRecord.month.desc())
    if month:
        query = query.where(PayrollRecord.month == month)
    if year:
        query = query.where(PayrollRecord.year == year)
    if employee_id:
        query = query.where(PayrollRecord.employee_id == employee_id)

    result = await db.execute(query)
    records = result.scalars().all()

    response_list = []
    for r in records:
        resp = PayrollRecordResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else "N/A",
            employee_code=r.employee.employee_code if r.employee else "N/A",
            department_name=r.employee.department if r.employee else "N/A",
            month=r.month,
            year=r.year,
            standard_work_days=r.standard_work_days,
            actual_worked_days=r.actual_worked_days,
            total_work_hours=r.total_work_hours,
            overtime_hours=r.overtime_hours,
            late_arrivals_count=r.late_arrivals_count,
            early_leaves_count=r.early_leaves_count,
            approved_paid_leave_days=r.approved_paid_leave_days,
            unpaid_leave_days=r.unpaid_leave_days,
            base_salary=r.base_salary,
            hourly_rate=r.hourly_rate,
            overtime_pay=r.overtime_pay,
            allowance=r.allowance,
            late_penalty=r.late_penalty,
            bonus=r.bonus,
            gross_salary=r.gross_salary,
            insurance_deduction=r.insurance_deduction,
            net_salary=r.net_salary,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at
        )
        response_list.append(resp)

    return response_list


@router.put("/records/{record_id}/status", response_model=PayrollRecordResponse)
async def update_payroll_status(
    record_id: uuid.UUID,
    payload: PayrollStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update payroll record status (DRAFT -> APPROVED -> PAID).
    """
    result = await db.execute(select(PayrollRecord).where(PayrollRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi lương.")

    record.status = payload.status
    if payload.notes:
        record.notes = payload.notes

    await db.commit()
    await db.refresh(record)

    return PayrollRecordResponse(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=record.employee.full_name if record.employee else "N/A",
        employee_code=record.employee.employee_code if record.employee else "N/A",
        department_name=record.employee.department if record.employee else "N/A",
        month=record.month,
        year=record.year,
        standard_work_days=record.standard_work_days,
        actual_worked_days=record.actual_worked_days,
        total_work_hours=record.total_work_hours,
        overtime_hours=record.overtime_hours,
        late_arrivals_count=record.late_arrivals_count,
        early_leaves_count=record.early_leaves_count,
        approved_paid_leave_days=record.approved_paid_leave_days,
        unpaid_leave_days=record.unpaid_leave_days,
        base_salary=record.base_salary,
        hourly_rate=record.hourly_rate,
        overtime_pay=record.overtime_pay,
        allowance=record.allowance,
        late_penalty=record.late_penalty,
        bonus=record.bonus,
        gross_salary=record.gross_salary,
        insurance_deduction=record.insurance_deduction,
        net_salary=record.net_salary,
        status=record.status,
        notes=record.notes,
        created_at=record.created_at
    )


@router.get("/export-csv")
async def export_payroll_csv(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2030),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports payroll spreadsheet in CSV format with UTF-8 BOM for Excel compatibility.
    """
    records = await list_payroll_records(month=month, year=year, db=db)

    output = io.StringIO()
    # UTF-8 BOM
    output.write("\ufeff")
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Mã NV", "Họ và Tên", "Phòng Ban", "Kỳ Lương", "Ngày Công Chuẩn",
        "Ngày Thực Làm", "Tổng Giờ Làm", "Giờ OT", "Số Lần Đi Muộn",
        "Lương Cơ Bản (VND)", "Tiền Làm Thêm OT (VND)", "Phụ Cấp (VND)",
        "Thưởng Chuyên Cần (VND)", "Phạt Đi Muộn (VND)", "Tổng Thu Nhập (Gross)",
        "Trừ Bảo Hiểm (10.5%)", "Thực Nhận (Net)", "Trạng Thái"
    ])

    for r in records:
        writer.writerow([
            r.employee_code,
            r.employee_name,
            r.department_name,
            f"{r.month:02d}/{r.year}",
            r.standard_work_days,
            r.actual_worked_days,
            r.total_work_hours,
            r.overtime_hours,
            r.late_arrivals_count,
            f"{r.base_salary:,.0f}",
            f"{r.overtime_pay:,.0f}",
            f"{r.allowance:,.0f}",
            f"{r.bonus:,.0f}",
            f"{r.late_penalty:,.0f}",
            f"{r.gross_salary:,.0f}",
            f"{r.insurance_deduction:,.0f}",
            f"{r.net_salary:,.0f}",
            r.status.value
        ])

    csv_content = output.getvalue()
    filename = f"Bang_Luong_Thang_{month:02d}_{year}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
