from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.exceptions import CoreUserException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.database.session import get_db
from app.models.user import User
from app.schemas import (
    ChangePasswordRequest,
    FaceTokenRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserMeResponse,
)

router = APIRouter()


@router.post("/face-token", response_model=TokenResponse, summary="Issue JWT for Biometrically Verified User")
async def face_token(
    req: FaceTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Issue Access and Refresh tokens for a user whose biometric face was successfully matched."""
    conditions = []
    if req.user_code:
        conditions.append(User.user_code == req.user_code)
    if req.username:
        conditions.append(User.username == req.username)
        conditions.append(User.email == req.username)
    if req.email:
        conditions.append(User.email == req.email)

    if not conditions and not req.user_code and not req.username:
        raise UnauthorizedException("user_code, username or email is required for biometric token issuance")

    stmt = select(User).where(or_(*conditions))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user and req.user_code:
        # Fallback: check if username matches user_code (case-insensitive)
        fallback_stmt = select(User).where(User.username.ilike(req.user_code))
        fallback_res = await db.execute(fallback_stmt)
        user = fallback_res.scalar_one_or_none()

    if not user:
        # Auto-provision IAM user for verified biometric employee
        from app.models.rbac import Role
        from app.models.user import UserProfile
        import uuid

        auto_code = req.user_code or f"EMP{uuid.uuid4().hex[:6].upper()}"
        base_username = (req.email.split('@')[0] if req.email else auto_code).lower().replace(" ", "_")
        
        # Ensure username uniqueness
        chk = await db.execute(select(User).where(User.username == base_username))
        existing_u = chk.scalar_one_or_none()
        final_username = base_username if not existing_u else f"{base_username}_{uuid.uuid4().hex[:4]}".lower()
        final_email = req.email or f"{final_username}@vface.ai"

        # Determine admin role: if EMP000, NV001, or IT/BOD department, grant superadmin
        is_admin = False
        role_names = ["employee"]
        if auto_code in ["EMP000", "NV001"] or (req.department and req.department.upper() in ["IT", "BOD", "BAN GIÁM ĐỐC"]):
            is_admin = True
            role_names = ["superadmin"]

        roles_stmt = select(Role).where(Role.name.in_(role_names))
        roles_res = await db.execute(roles_stmt)
        assigned_roles = roles_res.scalars().all()

        user = User(
            user_code=auto_code,
            username=final_username,
            email=final_email,
            hashed_password=get_password_hash("Password@123"),
            is_active=True,
            is_superuser=is_admin,
            roles=assigned_roles
        )
        db.add(user)
        await db.flush()

        profile = UserProfile(
            user_id=user.id,
            full_name=req.full_name or auto_code,
            phone_number=req.phone_number
        )
        db.add(profile)
        await db.flush()

    if not user.is_active:
        raise UnauthorizedException("Account is disabled. Please contact administrator.")

    # Update last login time
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Collect roles for token claims
    roles = [role.name for role in user.roles]
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={
            "user_code": user.user_code,
            "username": user.username,
            "roles": roles,
            "is_superuser": user.is_superuser
        }
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=24 * 60 * 60
    )


@router.post("/login", response_model=TokenResponse, summary="User Authentication & JWT Issuance")
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with username/email and password. Returns Access and Refresh tokens."""
    stmt = select(User).where(
        or_(User.username == req.username, User.email == req.username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise UnauthorizedException("Invalid username/email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled. Please contact administrator.")

    # Update last login time
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Collect roles for token claims
    roles = [role.name for role in user.roles]
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={
            "user_code": user.user_code,
            "username": user.username,
            "roles": roles,
            "is_superuser": user.is_superuser
        }
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=24 * 60 * 60
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh Access Token")
async def refresh_token(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Exchange a valid Refresh Token for a new Access Token."""
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid or expired refresh token")

    user_id_str = payload.get("sub")
    stmt = select(User).where(User.id == user_id_str)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedException("User not found or disabled")

    roles = [role.name for role in user.roles]
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={
            "user_code": user.user_code,
            "username": user.username,
            "roles": roles,
            "is_superuser": user.is_superuser
        }
    )
    new_refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=24 * 60 * 60
    )


@router.get("/me", response_model=UserMeResponse, summary="Get Current Authenticated User Info")
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Return profile, roles, and aggregate permissions for the logged-in user."""
    roles = [r.name for r in current_user.roles]
    perms = set()
    for r in current_user.roles:
        for p in r.permissions:
            perms.add(p.code)

    return UserMeResponse(
        id=current_user.id,
        user_code=current_user.user_code,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        roles=roles,
        permissions=list(perms),
        department=current_user.department.name if current_user.department else None,
        position=current_user.position.name if current_user.position else None,
        profile=current_user.profile
    )


@router.post("/change-password", summary="Change Password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Allow logged-in user to change their account password."""
    if not verify_password(req.old_password, current_user.hashed_password):
        raise CoreUserException("Incorrect old password", status_code=status.HTTP_400_BAD_REQUEST)

    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"success": True, "message": "Password changed successfully"}
