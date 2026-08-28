import uuid
from typing import AsyncGenerator, Callable, List
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.database.session import get_db
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate Bearer token and return current active User with profile, roles, and permissions."""
    if not credentials:
        raise UnauthorizedException("Authentication token required")

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired access token")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid user ID in token")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User no longer exists")
    if not user.is_active:
        raise ForbiddenException("User account is disabled")

    return user


def get_user_permissions(user: User) -> set:
    """Extract all atomic permission codes from user's assigned roles."""
    perms = set()
    if not user or not user.roles:
        return perms
    for role in user.roles:
        for p in role.permissions:
            perms.add(p.code)
    return perms


def is_user_superadmin(user: User) -> bool:
    """Check if user has superuser flag or belongs to superadmin role."""
    if not user:
        return False
    if user.is_superuser:
        return True
    return any(role.name == "superadmin" for role in user.roles)


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require user to be an active superuser."""
    if not is_user_superadmin(current_user):
        raise ForbiddenException("Superuser privileges required")
    return current_user


def require_permissions(required_permissions: List[str], require_all: bool = True) -> Callable:
    """Dependency factory checking if current user holds specified atomic permissions (or is superadmin)."""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if is_user_superadmin(current_user):
            return current_user

        user_perms = get_user_permissions(current_user)

        if require_all:
            missing = [p for p in required_permissions if p not in user_perms]
            if missing:
                raise ForbiddenException(f"Access denied: Missing required permission(s): {', '.join(missing)}")
        else:
            if not any(p in user_perms for p in required_permissions):
                raise ForbiddenException(f"Access denied: Requires at least one of: {', '.join(required_permissions)}")

        return current_user

    return permission_checker


def RequirePermission(permission: str) -> Callable:
    """Convenience alias for single-permission check."""
    return require_permissions([permission], require_all=True)
