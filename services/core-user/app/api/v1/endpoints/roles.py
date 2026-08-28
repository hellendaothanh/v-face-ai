import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permissions
from app.core.exceptions import DuplicateException, ForbiddenException, NotFoundException
from app.database.session import get_db
from app.models.rbac import Permission, Role
from app.models.user import User
from app.schemas import (
    PermissionResponse,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)

router = APIRouter()


# ------------------------------------------------------------------------------
# Roles Endpoints
# ------------------------------------------------------------------------------
@router.get("/roles", response_model=List[RoleResponse], summary="List All Roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["role:manage"]))
):
    """List all configured roles with assigned permissions."""
    stmt = select(Role).order_by(Role.created_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, summary="Create New Role")
async def create_role(
    req: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["role:manage"]))
):
    """Create a new customized role and assign permissions."""
    stmt = select(Role).where(Role.name == req.name)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise DuplicateException(f"Role '{req.name}' already exists")

    perms = []
    if req.permission_ids:
        perms_stmt = select(Permission).where(Permission.id.in_(req.permission_ids))
        perms_res = await db.execute(perms_stmt)
        perms = list(perms_res.scalars().all())

    new_role = Role(
        name=req.name,
        display_name=req.display_name,
        description=req.description,
        is_system=False,
        permissions=perms
    )
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)
    return new_role


@router.patch("/roles/{role_id}", response_model=RoleResponse, summary="Update Role & Permissions")
async def update_role(
    role_id: uuid.UUID,
    req: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["role:manage"]))
):
    """Update role display name, description, or assigned permissions."""
    stmt = select(Role).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException("Role not found")

    if req.display_name is not None:
        role.display_name = req.display_name
    if req.description is not None:
        role.description = req.description

    if req.permission_ids is not None:
        perms_stmt = select(Permission).where(Permission.id.in_(req.permission_ids))
        perms_res = await db.execute(perms_stmt)
        role.permissions = list(perms_res.scalars().all())

    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/roles/{role_id}", summary="Delete Role")
async def delete_role(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["role:manage"]))
):
    """Delete a custom role (Protected system roles cannot be deleted)."""
    stmt = select(Role).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException("Role not found")
    if role.is_system:
        raise ForbiddenException("System default roles cannot be deleted")

    await db.delete(role)
    await db.commit()
    return {"success": True, "message": f"Role '{role.name}' deleted"}


# ------------------------------------------------------------------------------
# Permissions Endpoints
# ------------------------------------------------------------------------------
@router.get("/permissions", response_model=List[PermissionResponse], summary="List All Permissions")
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permissions(["role:manage"]))
):
    """List all available granular system permissions across modules."""
    stmt = select(Permission).order_by(Permission.module.asc(), Permission.code.asc())
    result = await db.execute(stmt)
    return result.scalars().all()
