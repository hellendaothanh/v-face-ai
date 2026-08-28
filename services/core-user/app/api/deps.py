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


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require user to be an active superuser."""
    if not current_user.is_superuser:
        raise ForbiddenException("Superuser privileges required")
    return current_user


def require_permissions(required_permissions: List[str]) -> Callable:
    """Dependency factory checking if current user holds all specified permissions (or is superuser)."""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.is_superuser:
            return current_user

        # Collect user permissions from assigned roles
        user_perms = set()
        for role in current_user.roles:
            for perm in role.permissions:
                user_perms.add(perm.code)

        for req in required_permissions:
            if req not in user_perms:
                raise ForbiddenException(f"Missing required permission: '{req}'")

        return current_user

    return permission_checker
