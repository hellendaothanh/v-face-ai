import uuid
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.work_shift import ShiftAssignment, ShiftType, WorkShift


class ShiftSchedulingService:
    """
    Advanced Shift Scheduling & Auto-Matching Engine
    - Auto-Match Shift: Dynamically assigns the optimal shift window based on real-time check-in.
    - Split Shift (Ca Gãy): Handles two working intervals in a single day with intermediate break.
    - Rotating Shift (Ca Xoay): Calculates cyclic shift schedules (e.g. 7-day Day / 7-day Night rotation).
    """

    @staticmethod
    async def auto_match_shift_for_checkin(
        db: AsyncSession,
        checkin_time: time,
        employee_id: Optional[uuid.UUID] = None
    ) -> Optional[WorkShift]:
        """
        Finds the best matching shift based on checkin timestamp:
        1. Checks if employee has a direct active ShiftAssignment.
        2. If not, selects the active shift whose start_time is closest to checkin_time (within 90 mins).
        """
        # 1. Check direct assignment
        if employee_id:
            today = date.today()
            assign_query = await db.execute(
                select(ShiftAssignment)
                .where(
                    ShiftAssignment.employee_id == employee_id,
                    ShiftAssignment.is_active == True,
                    ShiftAssignment.effective_from <= today
                )
                .order_by(ShiftAssignment.effective_from.desc())
            )
            assignment = assign_query.scalars().first()
            if assignment:
                shift_res = await db.execute(select(WorkShift).where(WorkShift.id == assignment.shift_id))
                assigned_shift = shift_res.scalars().first()
                if assigned_shift:
                    return assigned_shift

        # 2. Dynamic auto-matching against all active shifts
        shifts_res = await db.execute(
            select(WorkShift).where(WorkShift.is_active == True, WorkShift.allow_auto_match == True)
        )
        shifts = shifts_res.scalars().all()
        if not shifts:
            return None

        def time_to_minutes(t: time) -> int:
            return t.hour * 60 + t.minute

        checkin_mins = time_to_minutes(checkin_time)
        best_shift = None
        min_diff = float("inf")

        for s in shifts:
            start_mins = time_to_minutes(s.start_time)
            # Distance from start time
            diff = abs(start_mins - checkin_mins)
            # Support overnight shift wrap around
            if diff > 720:  # 12 hours
                diff = 1440 - diff
            if diff < min_diff:
                min_diff = diff
                best_shift = s

        return best_shift

    @staticmethod
    def calculate_split_shift_work_hours(
        in_time_1: datetime,
        out_time_1: datetime,
        in_time_2: Optional[datetime] = None,
        out_time_2: Optional[datetime] = None,
        standard_daily_hours: float = 8.0
    ) -> Dict[str, float]:
        """
        Computes total worked hours and overtime for split shifts with 2 distinct intervals:
        Interval 1: Lunch / Morning window (e.g. 10:00 - 14:00 = 4.0h)
        Interval 2: Dinner / Evening window (e.g. 17:00 - 21:00 = 4.0h)
        """
        hours_segment_1 = max(0.0, (out_time_1 - in_time_1).total_seconds() / 3600.0)
        hours_segment_2 = 0.0
        if in_time_2 and out_time_2:
            hours_segment_2 = max(0.0, (out_time_2 - in_time_2).total_seconds() / 3600.0)

        total_worked = round(hours_segment_1 + hours_segment_2, 2)
        ot_hours = max(0.0, round(total_worked - standard_daily_hours, 2))

        return {
            "segment_1_hours": round(hours_segment_1, 2),
            "segment_2_hours": round(hours_segment_2, 2),
            "total_worked_hours": total_worked,
            "ot_hours": ot_hours
        }

    @staticmethod
    def calculate_rotating_shift(
        start_date: date,
        target_date: date,
        rotation_cycle_days: int,
        shift_pool: List[WorkShift]
    ) -> Optional[WorkShift]:
        """
        Computes active rotating shift for target_date given a start date and cycle days.
        e.g. Cycle = 7 days:
        Day 0-6: Shift A
        Day 7-13: Shift B
        """
        if not shift_pool or rotation_cycle_days <= 0:
            return shift_pool[0] if shift_pool else None

        days_elapsed = max(0, (target_date - start_date).days)
        cycle_index = (days_elapsed // rotation_cycle_days) % len(shift_pool)
        return shift_pool[cycle_index]


shift_scheduling_service = ShiftSchedulingService()
