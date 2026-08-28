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

    # 3. Seed Enterprise Departments
    departments_data = [
        ("BOD", "Ban Giám Đốc", "Điều hành và hoạch định chiến lược phát triển toàn diện"),
        ("TECH_AI", "Khối Công Nghệ & AI", "Nghiên cứu thị giác máy tính, phát triển Face AI và hệ thống Cloud"),
        ("HR_OPS", "Phòng Nhân Sự & Vận Hành", "Quản lý nhân sự, chấm công, đào tạo và chính sách phúc lợi"),
        ("SALES_MKT", "Phòng Kinh Doanh & Marketing", "Mở rộng thị trường, giải pháp đối tác và thương mại hóa sản phẩm"),
        ("FIN_ACC", "Phòng Tài Chính - Kế Toán", "Quản trị dòng tiền, ngân sách và hạch toán tài chính doanh nghiệp"),
    ]
    dept_map = {}
    for code, name, desc in departments_data:
        stmt = select(Department).where(Department.code == code)
        result = await session.execute(stmt)
        dept = result.scalar_one_or_none()
        if not dept:
            dept = Department(code=code, name=name, description=desc)
            session.add(dept)
            await session.flush()
        dept_map[code] = dept

    # 4. Seed Enterprise Positions
    positions_data = [
        ("CEO", "Tổng Giám Đốc (CEO)", 10, "Lãnh đạo cao nhất điều hành toàn bộ hoạt động doanh nghiệp"),
        ("CTO", "Giám Đốc Công Nghệ (CTO)", 9, "Quản trị kiến trúc công nghệ, AI và hạ tầng kỹ thuật số"),
        ("HR_DIRECTOR", "Giám Đốc Nhân Sự (HR Director)", 8, "Hoạch định chiến lược nhân tài và vận hành văn hóa tổ chức"),
        ("AI_LEAD", "Trưởng Nhóm AI & Computer Vision", 6, "Chịu trách nhiệm kiến trúc mô hình Deep Learning và luồng Camera"),
        ("SR_DEV", "Kỹ Sư Phần Mềm Cao Cấp (Senior Dev)", 5, "Phát triển hệ thống microservices và giao diện điều hành"),
        ("HR_EXECUTIVE", "Chuyên Viên Nhân Sự (HR Executive)", 3, "Thực thi quy trình tuyển dụng, chấm công và quan hệ lao động"),
        ("SALES_LEAD", "Trưởng Phòng Kinh Doanh (Sales Lead)", 6, "Phát triển khách hàng doanh nghiệp và triển khai hợp đồng"),
        ("EXEC_ADMIN", "Quản Trị Viên Hệ Thống (System Admin)", 5, "Quản trị phân quyền IAM, an ninh mạng và hạ tầng vận hành"),
    ]
    pos_map = {}
    for code, name, level, desc in positions_data:
        stmt = select(Position).where(Position.code == code)
        result = await session.execute(stmt)
        pos = result.scalar_one_or_none()
        if not pos:
            pos = Position(code=code, name=name, level=level, description=desc)
            session.add(pos)
            await session.flush()
        pos_map[code] = pos

    # 5. Seed Enterprise Sample Users & Profiles
    # Map roles
    role_map = {}
    for r_name in ["superadmin", "hr_manager", "dept_manager", "it_support", "employee"]:
        stmt = select(Role).where(Role.name == r_name)
        res = await session.execute(stmt)
        r_obj = res.scalar_one_or_none()
        if r_obj:
            role_map[r_name] = r_obj

    sample_users_data = [
        (
            settings.FIRST_SUPERUSER_USERNAME,
            "EMP000",
            settings.FIRST_SUPERUSER_FULLNAME,
            settings.FIRST_SUPERUSER_EMAIL,
            "0901234567",
            settings.FIRST_SUPERUSER_PASSWORD,
            "BOD",
            "CEO",
            ["superadmin"],
            True
        ),
        (
            "cto_hai",
            "EMP001",
            "Trần Quang Hải",
            "hai.tq@vface.ai",
            "0912345678",
            "Password@123",
            "TECH_AI",
            "CTO",
            ["superadmin"],
            True
        ),
        (
            "hr_mai",
            "EMP002",
            "Lê Tuyết Mai",
            "mai.lt@vface.ai",
            "0923456789",
            "Password@123",
            "HR_OPS",
            "HR_DIRECTOR",
            ["hr_manager"],
            False
        ),
        (
            "ai_hung",
            "EMP003",
            "Phạm Quốc Hùng",
            "hung.pq@vface.ai",
            "0934567890",
            "Password@123",
            "TECH_AI",
            "AI_LEAD",
            ["dept_manager"],
            False
        ),
        (
            "dev_nam",
            "EMP004",
            "Đỗ Hoàng Nam",
            "nam.dh@vface.ai",
            "0945678901",
            "Password@123",
            "TECH_AI",
            "SR_DEV",
            ["employee"],
            False
        ),
        (
            "sale_linh",
            "EMP005",
            "Hoàng Mỹ Linh",
            "linh.hm@vface.ai",
            "0956789012",
            "Password@123",
            "SALES_MKT",
            "SALES_LEAD",
            ["employee"],
            False
        ),
        (
            "hr_nga",
            "EMP006",
            "Vũ Thúy Nga",
            "nga.vt@vface.ai",
            "0967890123",
            "Password@123",
            "HR_OPS",
            "HR_EXECUTIVE",
            ["hr_manager"],
            False
        ),
    ]

    for uname, ucode, fname, uemail, uphone, upass, d_code, p_code, uroles, is_super in sample_users_data:
        stmt = select(User).where(User.username == uname)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            logger.info(f"Seeding enterprise user: {uname} ({fname})")
            user_roles = [role_map[rn] for rn in uroles if rn in role_map]
            user = User(
                user_code=ucode,
                username=uname,
                email=uemail,
                hashed_password=get_password_hash(upass),
                is_active=True,
                is_superuser=is_super,
                department_id=dept_map.get(d_code).id if d_code in dept_map else None,
                position_id=pos_map.get(p_code).id if p_code in pos_map else None,
                roles=user_roles
            )
            session.add(user)
            await session.flush()

            profile = UserProfile(
                user_id=user.id,
                full_name=fname,
                phone_number=uphone
            )
            session.add(profile)
            await session.flush()

    # 6. Seed Default Knowledge Base (KB) Categories & Articles
    from app.models.helpdesk import (
        KBCategory,
        KBArticle,
        Ticket,
        TicketType,
        ImpactLevel,
        UrgencyLevel,
        PriorityLevel,
        TicketStatus,
    )

    stmt = select(KBCategory).where(KBCategory.code == "FACE_AI_CAM")
    res = await session.execute(stmt)
    cat_ai = res.scalar_one_or_none()
    if not cat_ai:
        cat_ai = KBCategory(
            name="Camera AI & Nhận Diện Khuôn Mặt",
            code="FACE_AI_CAM",
            icon="Camera",
            description="Xử lý sự cố luồng RTSP, mất nhận diện Face AI và thiết bị camera",
            sort_order=1,
        )
        cat_net = KBCategory(
            name="Mạng Nội Bộ & VPN & Kết Nối",
            code="NET_VPN",
            icon="Wifi",
            description="Hướng dẫn kết nối mạng nội bộ công ty, VPN làm việc từ xa",
            sort_order=2,
        )
        cat_acc = KBCategory(
            name="Tài Khoản & Phân Quyền IAM",
            code="AUTH_IAM",
            icon="ShieldCheck",
            description="Quên mật khẩu, xin cấp quyền hệ thống Chấm công / HRM / Helpdesk",
            sort_order=3,
        )
        session.add_all([cat_ai, cat_net, cat_acc])
        await session.flush()

        # Seed Sample KB Article
        art_rtsp = KBArticle(
            category_id=cat_ai.id,
            title="Khắc phục sự cố Camera AI báo Mất Tín Hiệu (Offline / RTSP Timeout)",
            slug="khac-phuc-su-co-camera-ai-mat-tin-hieu",
            summary="Các bước tự kiểm tra nguồn mạng IP, port 554 RTSP và khởi động lại luồng camera Face AI.",
            content="""### Hướng Dẫn Xử Lý Mất Tín Hiệu Camera AI

1. **Kiểm tra địa chỉ IP Camera**: Đảm bảo camera Tapo / IP CCTV cùng dải mạng với Server (`192.168.1.x`).
2. **Kiểm tra cổng RTSP 554**: Dùng lệnh `Test-NetConnection -Port 554 -ComputerName <IP_CAMERA>` trên máy chủ.
3. **Chuyển đổi nguồn luồng**:
   - Truy cập **Quản Lý Thiết Bị** trên menu V-Face.
   - Bấm nút **Chạy Camera** hoặc chuyển sang **PC Webcam** nếu thiết bị RTSP đang bảo trì.
4. **Khởi động lại backend camera**: Mở terminal chạy `.\\service.ps1 restart`.
""",
            tags="camera,rtsp,face_ai,offline,troubleshoot",
            is_published=True,
            view_count=28,
            helpful_count=12,
            author_id=admin_user.id,
        )

        art_auth = KBArticle(
            category_id=cat_acc.id,
            title="Quy trình yêu cầu mở khóa tài khoản và đặt lại mật khẩu Core IAM",
            slug="quy-trinh-mo-khoa-tai-khoan-core-iam",
            summary="Hướng dẫn nhân viên mở khóa tài khoản khi nhập sai mật khẩu quá 5 lần.",
            content="""### Quy Trình Mở Khóa Tài Khoản

1. **Tài khoản bị khóa tự động**: Sau 5 lần đăng nhập không thành công, tài khoản sẽ chuyển sang trạng thái `LOCKED`.
2. **Gửi yêu cầu Service Request**:
   - Tạo ticket loại **Service Request** với tiêu đề `[Yêu Cầu] Mở khóa tài khoản [Mã NV]`.
   - Admin IAM sẽ xác thực thông tin và kích hoạt lại trong vòng 15 phút theo cam kết SLA P3.
""",
            tags="iam,login,password,reset,unlock",
            is_published=True,
            view_count=45,
            helpful_count=19,
            author_id=admin_user.id,
        )
        session.add_all([art_rtsp, art_auth])
        await session.flush()

        # Seed Sample Ticket
        t1 = Ticket(
            ticket_code="INC-202608-0001",
            title="Camera Cổng Chính (Tapo C200) chập chờn nhận diện buổi sáng",
            description="Camera tại cửa ra vào tầng 1 thỉnh thoảng bị trễ khung hình khi nhiều nhân viên cùng check-in lúc 08:20.",
            ticket_type=TicketType.INCIDENT,
            status=TicketStatus.OPEN,
            impact=ImpactLevel.MEDIUM,
            urgency=UrgencyLevel.HIGH,
            priority=PriorityLevel.P2_HIGH,
            requester_id=admin_user.id,
            category_id=cat_ai.id,
            linked_kb_id=art_rtsp.id,
        )
        session.add(t1)

    await session.commit()
    logger.info("Database seed checks completed successfully.")


async def init_db() -> None:
    """Create tables and seed initial data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
