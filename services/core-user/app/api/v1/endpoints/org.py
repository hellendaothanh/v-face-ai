import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permissions
from app.core.exceptions import DuplicateException, NotFoundException
from app.database.session import get_db
from app.models.organization import Department, Position
from app.models.user import User
from app.schemas import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    PositionCreate,
    PositionResponse,
    PositionUpdate,
)

router = APIRouter()


# ------------------------------------------------------------------------------
# Departments
# ------------------------------------------------------------------------------
@router.get("/departments", response_model=List[DepartmentResponse], summary="List Departments")
async def list_departments(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """List organizational departments."""
    stmt = select(Department)
    if is_active is not None:
        stmt = stmt.where(Department.is_active == is_active)
    stmt = stmt.order_by(Department.name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Department")
async def create_department(
    req: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """Create a new department."""
    stmt = select(Department).where(Department.code == req.code)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise DuplicateException(f"Department code '{req.code}' already exists")

    dept = Department(**req.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.patch("/departments/{department_id}", response_model=DepartmentResponse, summary="Update Department")
async def update_department(
    department_id: uuid.UUID,
    req: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """Update department details or manager."""
    stmt = select(Department).where(Department.id == department_id)
    result = await db.execute(stmt)
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundException("Department not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(dept, field, value)

    await db.commit()
    await db.refresh(dept)
    return dept


# ------------------------------------------------------------------------------
# Positions
# ------------------------------------------------------------------------------
@router.get("/positions", response_model=List[PositionResponse], summary="List Positions")
async def list_positions(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """List job positions and ranks."""
    stmt = select(Position)
    if is_active is not None:
        stmt = stmt.where(Position.is_active == is_active)
    stmt = stmt.order_by(Position.level.desc(), Position.name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/positions", response_model=PositionResponse, status_code=status.HTTP_201_CREATED, summary="Create Position")
async def create_position(
    req: PositionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """Create a new job title / position."""
    stmt = select(Position).where(Position.code == req.code)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise DuplicateException(f"Position code '{req.code}' already exists")

    pos = Position(**req.model_dump())
    db.add(pos)
    await db.commit()
    await db.refresh(pos)
    return pos


@router.patch("/positions/{position_id}", response_model=PositionResponse, summary="Update Position")
async def update_position(
    position_id: uuid.UUID,
    req: PositionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["org:manage"]))
):
    """Update position title, rank level or description."""
    stmt = select(Position).where(Position.id == position_id)
    result = await db.execute(stmt)
    pos = result.scalar_one_or_none()
    if not pos:
        raise NotFoundException("Position not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(pos, field, value)

    await db.commit()
    await db.refresh(pos)
    return pos
