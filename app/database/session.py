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


async def init_db() -> None:
    """
    Initialize database:
    1. Enables pgvector extension if not exists.
    2. Creates all registered SQLAlchemy tables.
    """
    async with engine.begin() as conn:
        logger.info("Verifying and enabling 'vector' extension in PostgreSQL...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        logger.info("Creating database tables if not exist...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialization completed successfully.")
