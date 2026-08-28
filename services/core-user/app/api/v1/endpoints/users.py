import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_user_permissions,
    is_user_superadmin,
    require_permissions,
)
from app.core.exceptions import DuplicateException, ForbiddenException, NotFoundException
from app.core.security import get_password_hash
from app.database.session import get_db
from app.models.organization import Department, Position
from app.models.rbac import Role
from app.models.user import User, UserProfile
from app.schemas import UserCreate, UserProfileUpdate, UserResponse, UserUpdate

router = APIRouter()


@router.get("", response_model=List[UserResponse], summary="List All Users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:read"]))
):
    """Retrieve users list with Layer-3 ABAC Scoping (Superadmin/HR sees all; Dept Manager restricted to own dept)."""
    stmt = select(User)

    user_perms = get_user_permissions(current_user)
    is_admin = is_user_superadmin(current_user) or "hrm:manage" in user_perms or "role:manage" in user_perms

    # Layer 3: Data-level Scope (ABAC)
    if not is_admin:
        # Dept Manager scope check: can only see users in their assigned department
        if current_user.department_id:
            stmt = stmt.where(User.department_id == current_user.department_id)
        else:
            # If manager has no department assigned, only view self
            stmt = stmt.where(User.id == current_user.id)
    else:
        if department_id:
            stmt = stmt.where(User.department_id == department_id)

    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.join(User.profile, isouter=True).where(
            or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.user_code.ilike(search_pattern),
                UserProfile.full_name.ilike(search_pattern)
            )
        )

    stmt = stmt.offset(skip).limit(limit).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create New User")
async def create_user(
    req: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:create"]))
):
    """Create a new user account with profile and assign roles with Anti-Privilege Escalation protection."""
    # Check duplicate code, username, email
    stmt = select(User).where(
        or_(
            User.user_code == req.user_code,
            User.username == req.username,
            User.email == req.email
        )
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise DuplicateException("User code, username, or email already registered")

    # Fetch assigned roles
    roles = []
    if req.role_ids:
        roles_stmt = select(Role).where(Role.id.in_(req.role_ids))
        roles_res = await db.execute(roles_stmt)
        roles = list(roles_res.scalars().all())

        # Anti-Privilege Escalation Check: Non-superadmin cannot assign superadmin or system roles
        if not is_user_superadmin(current_user):
            for r in roles:
                if r.name == "superadmin" or r.is_system:
                    raise ForbiddenException(f"Only Superadmin can assign '{r.display_name or r.name}' role")

    # Create User
    new_user = User(
        user_code=req.user_code,
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        is_active=True,
        department_id=req.department_id,
        position_id=req.position_id,
        roles=roles
    )
    db.add(new_user)
    await db.flush()

    # Create Profile
    new_profile = UserProfile(
        user_id=new_user.id,
        full_name=req.full_name,
        phone_number=req.phone_number
    )
    db.add(new_profile)

    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/{user_id}", response_model=UserResponse, summary="Get User By ID")
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:read"]))
):
    """Get single user detailed profile and role assignment with ABAC Scope check."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    # ABAC Scope Check
    user_perms = get_user_permissions(current_user)
    is_admin = is_user_superadmin(current_user) or "hrm:manage" in user_perms or "role:manage" in user_perms
    if not is_admin:
        if current_user.id != user_id and current_user.department_id != user.department_id:
            raise ForbiddenException("Access denied: You can only view users in your department")

    return user


@router.put("/{user_id}", response_model=UserResponse, summary="Update User (PUT)")
@router.patch("/{user_id}", response_model=UserResponse, summary="Update User Settings / Roles (PATCH)")
async def update_user(
    user_id: uuid.UUID,
    req: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:update"]))
):
    """Update user active status, department, position, assigned roles, profile and password."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    # Anti-Privilege Escalation on Target User
    if (user.is_superuser or any(r.name == "superadmin" for r in user.roles)) and not is_user_superadmin(current_user):
        raise ForbiddenException("Only Superadmin can modify a Superadmin account")

    if req.email is not None:
        user.email = req.email
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.department_id is not None:
        user.department_id = req.department_id
    if req.position_id is not None:
        user.position_id = req.position_id
    if req.password and req.password.strip():
        user.hashed_password = get_password_hash(req.password.strip())

    if req.role_ids is not None:
        roles_stmt = select(Role).where(Role.id.in_(req.role_ids))
        roles_res = await db.execute(roles_stmt)
        new_roles = list(roles_res.scalars().all())

        # Anti-Privilege Escalation: Non-superadmin cannot assign superadmin role
        if not is_user_superadmin(current_user):
            for r in new_roles:
                if r.name == "superadmin" or r.is_system:
                    raise ForbiddenException(f"Only Superadmin can assign '{r.display_name or r.name}' role")

        user.roles = new_roles

    # Update profile fields if provided
    if req.full_name is not None or req.phone_number is not None:
        if not user.profile:
            user.profile = UserProfile(user_id=user.id, full_name=user.username)
            db.add(user.profile)
        if req.full_name is not None:
            user.profile.full_name = req.full_name
        if req.phone_number is not None:
            user.profile.phone_number = req.phone_number

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}/profile", response_model=UserResponse, summary="Update User Personal Profile")
async def update_user_profile(
    user_id: uuid.UUID,
    req: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update profile details (user themselves or admin)."""
    # Allow user to update their own profile, or require user:update
    if current_user.id != user_id and not is_user_superadmin(current_user):
        user_perms = get_user_permissions(current_user)
        if "user:update" not in user_perms:
            raise ForbiddenException("Permission denied")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    if not user.profile:
        user.profile = UserProfile(user_id=user.id, full_name=user.username)
        db.add(user.profile)

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(user.profile, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete User")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["user:delete"]))
):
    """Delete a user account with self-deletion and superadmin deletion protection."""
    if current_user.id == user_id:
        raise ForbiddenException("Cannot delete your own account")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    if (user.is_superuser or any(r.name == "superadmin" for r in user.roles)) and not is_user_superadmin(current_user):
        raise ForbiddenException("Cannot delete Superadmin user")

    await db.delete(user)
    await db.commit()

