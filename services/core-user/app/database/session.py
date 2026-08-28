from typing import AsyncGenerator
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.base import Base
import app.models  # Register all models
from app.models.rbac import Permission, Role
from app.models.user import User, UserProfile
from app.models.organization import Department, Position

engine: AsyncEngine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def seed_initial_data(session: AsyncSession) -> None:
    """Seed default Permissions, Roles, and initial Super Admin user."""
    # 1. Seed Permissions
    default_permissions = [
        # Core User IAM
        ("user:create", "Create User", "core_user", "Permission to create users"),
        ("user:read", "Read User", "core_user", "Permission to view users"),
        ("user:update", "Update User", "core_user", "Permission to update users"),
        ("user:delete", "Delete User", "core_user", "Permission to delete users"),
        ("role:manage", "Manage Roles & Permissions", "core_user", "Permission to configure RBAC"),
        ("org:manage", "Manage Organization", "core_user", "Permission to configure Departments & Positions"),
        # Attendance & Face AI
        ("attendance:read", "Read Attendance", "attendance", "Permission to view attendance logs"),
        ("attendance:manage", "Manage Attendance", "attendance", "Permission to manage attendance requests/overrides"),
        ("camera:manage", "Manage AI Cameras", "attendance", "Permission to configure CCTV / RTSP devices"),
        # HRM Module
        ("hrm:read", "Read HRM Data", "hrm", "Permission to view employee contracts & leaves"),
        ("hrm:manage", "Manage HRM Operations", "hrm", "Permission to approve leaves, salary, onboarding"),
        # Helpdesk Module
        ("helpdesk:ticket_create", "Create Support Ticket", "helpdesk", "Permission to open helpdesk ticket"),
        ("helpdesk:ticket_resolve", "Resolve Support Ticket", "helpdesk", "Permission to answer and resolve tickets"),
        ("helpdesk:admin", "Helpdesk Administrator", "helpdesk", "Full access to helpdesk management"),
    ]

    perm_map = {}
    for code, name, module, desc in default_permissions:
        stmt = select(Permission).where(Permission.code == code)
        result = await session.execute(stmt)
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(code=code, name=name, module=module, description=desc)
            session.add(perm)
            await session.flush()
        perm_map[code] = perm

    # 2. Seed Default Roles
    default_roles = [
        ("superadmin", "Super Administrator", "Full system access across all services", True, list(perm_map.values())),
        ("hr_manager", "HR Manager", "Manages HR, attendance, onboarding", False, [
            perm_map["user:create"], perm_map["user:read"], perm_map["user:update"],
            perm_map["attendance:read"], perm_map["attendance:manage"],
            perm_map["hrm:read"], perm_map["hrm:manage"], perm_map["helpdesk:ticket_create"]
        ]),
        ("dept_manager", "Department Manager", "Manages team attendance & approvals", False, [
            perm_map["user:read"], perm_map["attendance:read"], perm_map["attendance:manage"],
            perm_map["hrm:read"], perm_map["helpdesk:ticket_create"]
        ]),
        ("it_support", "IT Support Specialist", "Handles Helpdesk tickets & camera setup", False, [
            perm_map["user:read"], perm_map["camera:manage"],
            perm_map["helpdesk:ticket_create"], perm_map["helpdesk:ticket_resolve"], perm_map["helpdesk:admin"]
        ]),
        ("employee", "Standard Employee", "Standard user profile and self check-in", False, [
            perm_map["attendance:read"], perm_map["helpdesk:ticket_create"]
        ])
    ]

    admin_role = None
    for role_name, display_name, desc, is_system, perms in default_roles:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
        if not role:
            role = Role(name=role_name, display_name=display_name, description=desc, is_system=is_system, permissions=perms)
            session.add(role)
            await session.flush()
        if role_name == "superadmin":
            admin_role = role

    # 3. Seed Default Department & Position
    stmt = select(Department).where(Department.code == "BOD")
    result = await session.execute(stmt)
    bod_dept = result.scalar_one_or_none()
    if not bod_dept:
        bod_dept = Department(code="BOD", name="Board of Directors", description="Executive Management")
        session.add(bod_dept)
        await session.flush()

    stmt = select(Position).where(Position.code == "EXEC_ADMIN")
    result = await session.execute(stmt)
    exec_pos = result.scalar_one_or_none()
    if not exec_pos:
        exec_pos = Position(code="EXEC_ADMIN", name="Executive Administrator", level=5, description="Full administrative rank")
        session.add(exec_pos)
        await session.flush()

    # 4. Seed First Super Admin User
    stmt = select(User).where(User.username == settings.FIRST_SUPERUSER_USERNAME)
    result = await session.execute(stmt)
    admin_user = result.scalar_one_or_none()
    if not admin_user:
        logger.info(f"Seeding first super admin user: {settings.FIRST_SUPERUSER_USERNAME}")
        admin_user = User(
            user_code="EMP000",
            username=settings.FIRST_SUPERUSER_USERNAME,
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            is_active=True,
            is_superuser=True,
            department_id=bod_dept.id,
            position_id=exec_pos.id,
            roles=[admin_role] if admin_role else []
        )
        session.add(admin_user)
        await session.flush()

        admin_profile = UserProfile(
            user_id=admin_user.id,
            full_name=settings.FIRST_SUPERUSER_FULLNAME,
            phone_number="0901234567"
        )
        session.add(admin_profile)

    await session.commit()
    logger.info("Database seed checks completed successfully.")


async def init_db() -> None:
    """Create tables and seed initial data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
