from typing import AsyncGenerator
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.database.base import Base
import app.models  # Ensure all models are registered in Base.metadata

# Async Engine for PostgreSQL
engine: AsyncEngine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

# Async Session Factory
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


async def seed_sample_employees() -> None:
    """Seed sample enterprise employees if database table is empty."""
    from sqlalchemy import select
    from app.models.employee import Employee

    sample_employees = [
        ("EMP000", "Nguyễn Quản Trị", "admin@vface.ai", "0901234567", "Ban Giám Đốc", "Tổng Giám Đốc (CEO)"),
        ("EMP001", "Trần Quang Hải", "hai.tq@vface.ai", "0912345678", "Khối Công Nghệ & AI", "Giám Đốc Công Nghệ (CTO)"),
        ("EMP002", "Lê Tuyết Mai", "mai.lt@vface.ai", "0923456789", "Phòng Nhân Sự & Vận Hành", "Giám Đốc Nhân Sự"),
        ("EMP003", "Phạm Quốc Hùng", "hung.pq@vface.ai", "0934567890", "Khối Công Nghệ & AI", "Trưởng Nhóm AI & Computer Vision"),
        ("EMP004", "Đỗ Hoàng Nam", "nam.dh@vface.ai", "0945678901", "Khối Công Nghệ & AI", "Kỹ Sư Phần Mềm Cao Cấp"),
        ("EMP005", "Hoàng Mỹ Linh", "linh.hm@vface.ai", "0956789012", "Phòng Kinh Doanh & Marketing", "Trưởng Phòng Kinh Doanh"),
        ("EMP006", "Vũ Thúy Nga", "nga.vt@vface.ai", "0967890123", "Phòng Nhân Sự & Vận Hành", "Chuyên Viên Nhân Sự"),
    ]

    async with AsyncSessionLocal() as session:
        try:
            for code, name, email, phone, dept, pos in sample_employees:
                stmt = select(Employee).where(Employee.employee_code == code)
                res = await session.execute(stmt)
                if not res.scalar_one_or_none():
                    emp = Employee(
                        employee_code=code,
                        full_name=name,
                        email=email,
                        phone_number=phone,
                        department=dept,
                        position=pos,
                        is_active=True
                    )
                    session.add(emp)
            await session.commit()
            logger.info("✔ Sample enterprise employees checked / seeded successfully.")
        except Exception as e:
            await session.rollback()
            logger.warning(f"Error seeding sample employees: {e}")


async def seed_sample_offices() -> None:
    """Seed sample enterprise office locations with GPS coordinates & IP configurations."""
    import uuid
    from sqlalchemy import select
    from app.models.office_location import OfficeLocation

    sample_offices = [
        {
            "name": "Trụ sở chính Hà Nội",
            "address": "123 Phố Huế, Quận Hai Bà Trưng, TP. Hà Nội",
            "latitude": 21.0285,
            "longitude": 105.8542,
            "radius_meters": 500.0,
            "public_ips": ["14.162.144.10", "118.69.182.50", "192.168.1.7", "127.0.0.1"],
            "wifi_bssids": ["vface_corp_hanoi", "vface_guest_hanoi"],
            "is_active": True,
        },
        {
            "name": "Chi nhánh TP. Hồ Chí Minh",
            "address": "45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            "latitude": 10.7769,
            "longitude": 106.7009,
            "radius_meters": 500.0,
            "public_ips": ["113.190.234.12", "115.79.200.8"],
            "wifi_bssids": ["vface_corp_hcm"],
            "is_active": True,
        },
        {
            "name": "Chi nhánh Đà Nẵng",
            "address": "78 Bạch Đằng, Quận Hải Châu, TP. Đà Nẵng",
            "latitude": 16.0678,
            "longitude": 108.2208,
            "radius_meters": 500.0,
            "public_ips": ["171.244.15.30"],
            "wifi_bssids": ["vface_corp_danang"],
            "is_active": True,
        }
    ]

    async with AsyncSessionLocal() as session:
        try:
            for item in sample_offices:
                stmt = select(OfficeLocation).where(OfficeLocation.name == item["name"])
                res = await session.execute(stmt)
                if not res.scalar_one_or_none():
                    office = OfficeLocation(
                        id=uuid.uuid4(),
                        name=item["name"],
                        address=item["address"],
                        latitude=item["latitude"],
                        longitude=item["longitude"],
                        radius_meters=item["radius_meters"],
                        public_ips=item["public_ips"],
                        wifi_bssids=item["wifi_bssids"],
                        is_active=item["is_active"],
                    )
                    session.add(office)
            await session.commit()
            logger.info("✔ Sample enterprise offices checked / seeded successfully.")
        except Exception as e:
            await session.rollback()
            logger.warning(f"Error seeding sample offices: {e}")


async def init_db() -> None:
    """
    Initialize database:
    1. Enables pgvector extension if not exists.
    2. Creates all registered SQLAlchemy tables.
    3. Runs schema sync / missing column additions.
    """
    async with engine.begin() as conn:
        logger.info("Verifying and enabling 'vector' extension in PostgreSQL...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        logger.info("Creating database tables if not exist...")
        await conn.run_sync(Base.metadata.create_all)

        # Automatic lightweight schema sync for newly added columns
        migration_statements = [
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS ppe_compliance BOOLEAN DEFAULT true NOT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS ppe_violations VARCHAR(255);",
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS gesture_verified BOOLEAN DEFAULT false NOT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL;",
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS work_duration_hours DOUBLE PRECISION DEFAULT 0.0 NOT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS ot_hours DOUBLE PRECISION DEFAULT 0.0 NOT NULL;"
        ]
        for stmt in migration_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                logger.debug(f"Schema sync note ({stmt.strip()}): {e}")

        logger.info("Database initialization completed successfully.")
