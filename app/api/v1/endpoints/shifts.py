import uuid
from datetime import time, date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.work_shift import WorkShift, ShiftAssignment, ShiftType
from app.models.employee import Employee
from app.schemas.work_shift import (
    WorkShiftCreate,
    WorkShiftUpdate,
    WorkShiftResponse,
    ShiftAssignmentCreate,
    ShiftAssignmentResponse,
    ShiftAutoMatchRequest,
    ShiftAutoMatchResponse,
)
from app.services.shift_scheduling_service import shift_scheduling_service

router = APIRouter(prefix="/shifts", tags=["Work Shifts & Roster Scheduling"])


@router.get("", response_model=List[WorkShiftResponse])
async def list_shifts(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all configured work shifts (Morning, Afternoon, Night, Standard, Flexible).
    """
    query = select(WorkShift)
    if is_active is not None:
        query = query.where(WorkShift.is_active == is_active)
    query = query.order_by(WorkShift.start_time.asc())
    result = await db.execute(query)
    shifts = result.scalars().all()
    
    # Auto-seed default shifts if none exist
    if not shifts:
        defaults = [
            WorkShift(
                shift_code="SHIFT_STANDARD",
                shift_name="Ca Hành Chính (08:00 - 17:00)",
                shift_type=ShiftType.STANDARD,
                start_time=WorkShift.start_time.type.python_type(8, 0),
                end_time=WorkShift.end_time.type.python_type(17, 0),
                grace_period_minutes=15,
                work_hours=8.0,
                is_active=True
            ),
            WorkShift(
                shift_code="SHIFT_MORNING",
                shift_name="Ca Sáng (06:00 - 14:00)",
                shift_type=ShiftType.MORNING,
                start_time=WorkShift.start_time.type.python_type(6, 0),
                end_time=WorkShift.end_time.type.python_type(14, 0),
                grace_period_minutes=10,
                work_hours=8.0,
                is_active=True
            ),
            WorkShift(
                shift_code="SHIFT_AFTERNOON",
                shift_name="Ca Chiều (14:00 - 22:00)",
                shift_type=ShiftType.AFTERNOON,
                start_time=WorkShift.start_time.type.python_type(14, 0),
                end_time=WorkShift.end_time.type.python_type(22, 0),
                grace_period_minutes=10,
                work_hours=8.0,
                is_active=True
            ),
            WorkShift(
                shift_code="SHIFT_NIGHT",
                shift_name="Ca Đêm (22:00 - 06:00)",
                shift_type=ShiftType.NIGHT,
                start_time=WorkShift.start_time.type.python_type(22, 0),
                end_time=WorkShift.end_time.type.python_type(6, 0),
                grace_period_minutes=15,
                work_hours=8.0,
                is_overnight=True,
                is_active=True
            )
        ]
        for s in defaults:
            db.add(s)
        await db.commit()
        shifts = defaults

    return shifts


@router.post("", response_model=WorkShiftResponse, status_code=status.HTTP_201_CREATED)
async def create_shift(
    payload: WorkShiftCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new custom work shift definition.
    """
    existing = await db.execute(select(WorkShift).where(WorkShift.shift_code == payload.shift_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã ca làm việc '{payload.shift_code}' đã tồn tại."
        )

    shift = WorkShift(**payload.model_dump())
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


@router.put("/{shift_id}", response_model=WorkShiftResponse)
async def update_shift(
    shift_id: uuid.UUID,
    payload: WorkShiftUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update work shift configuration.
    """
    result = await db.execute(select(WorkShift).where(WorkShift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ca làm việc.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shift, field, value)

    await db.commit()
    await db.refresh(shift)
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a work shift.
    """
    result = await db.execute(select(WorkShift).where(WorkShift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ca làm việc.")

    await db.delete(shift)
    await db.commit()


# --- Shift Assignments ---
@router.get("/assignments", response_model=List[ShiftAssignmentResponse])
async def list_shift_assignments(
    employee_id: Optional[uuid.UUID] = None,
    shift_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List employee shift assignments with employee name and shift details.
    """
    query = select(ShiftAssignment).where(ShiftAssignment.is_active == True)
    if employee_id:
        query = query.where(ShiftAssignment.employee_id == employee_id)
    if shift_id:
        query = query.where(ShiftAssignment.shift_id == shift_id)

    result = await db.execute(query)
    assignments = result.scalars().all()

    response_list = []
    for a in assignments:
        resp = ShiftAssignmentResponse.model_validate(a)
        if a.shift:
            resp.shift_name = a.shift.shift_name
            resp.shift_code = a.shift.shift_code
        if a.employee:
            resp.employee_name = a.employee.full_name
            resp.employee_code = a.employee.employee_code
        response_list.append(resp)

    return response_list


@router.post("/assignments", response_model=ShiftAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_shift(
    payload: ShiftAssignmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Assign an employee to a specific work shift.
    """
    # Verify shift exists
    shift_res = await db.execute(select(WorkShift).where(WorkShift.id == payload.shift_id))
    shift = shift_res.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ca làm việc.")

    # Verify employee exists if employee_id passed
    emp = None
    if payload.employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == payload.employee_id))
        emp = emp_res.scalar_one_or_none()
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhân viên.")

    assignment = ShiftAssignment(**payload.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    resp = ShiftAssignmentResponse.model_validate(assignment)
    resp.shift_name = shift.shift_name
    resp.shift_code = shift.shift_code
    if emp:
        resp.employee_name = emp.full_name
        resp.employee_code = emp.employee_code

    return resp


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke a shift assignment.
    """
    result = await db.execute(select(ShiftAssignment).where(ShiftAssignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phân ca.")

    await db.delete(assignment)
    await db.commit()


@router.post("/auto-match", response_model=ShiftAutoMatchResponse, summary="Tự động so khớp ca làm việc dựa trên giờ check-in thực tế")
async def auto_match_shift(
    payload: ShiftAutoMatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Thuật toán tự động tìm kiếm ca làm việc phù hợp nhất dựa trên thời điểm quét mặt / check-in.
    Nếu nhân viên chưa được gán ca cố định, hệ thống tự động gán ca có giờ bắt đầu gần nhất.
    """
    try:
        if isinstance(payload.checkin_time, str):
            parts = payload.checkin_time.strip().split(":")
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
            s = int(parts[2]) if len(parts) > 2 else 0
            checkin_t = time(h, m, s)
        else:
            checkin_t = time(8, 0)
    except Exception as e:
        logger.warning(f"Error parsing checkin_time '{payload.checkin_time}': {e}")
        checkin_t = time(8, 0)

    matched_shift = await shift_scheduling_service.auto_match_shift_for_checkin(
        db=db,
        checkin_time=checkin_t,
        employee_id=payload.employee_id
    )

    if not matched_shift:
        return ShiftAutoMatchResponse(
            matched_shift_id=None,
            shift_code="DEFAULT",
            shift_name="Ca Mặc Định (Chưa gán)",
            start_time="08:00",
            end_time="17:00",
            is_split_shift=False,
            is_overnight=False,
            match_reason="Không tìm thấy ca làm việc hoạt động nào phù hợp, áp dụng cấu hình tiêu chuẩn."
        )

    start_t_str = matched_shift.start_time.strftime("%H:%M") if hasattr(matched_shift.start_time, "strftime") else str(matched_shift.start_time)[:5]
    end_t_str = matched_shift.end_time.strftime("%H:%M") if hasattr(matched_shift.end_time, "strftime") else str(matched_shift.end_time)[:5]

    return ShiftAutoMatchResponse(
        matched_shift_id=matched_shift.id,
        shift_code=matched_shift.shift_code,
        shift_name=matched_shift.shift_name,
        start_time=start_t_str,
        end_time=end_t_str,
        is_split_shift=bool(matched_shift.is_split_shift),
        is_overnight=bool(matched_shift.is_overnight),
        match_reason=f"Đã tự động so khớp thành công với ca '{matched_shift.shift_name}' dựa trên khung giờ check-in {payload.checkin_time}."
    )

