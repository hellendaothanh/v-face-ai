from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.services.face_engine import FaceEngine, face_engine


def get_face_engine() -> FaceEngine:
    """Dependency provider for the singleton FaceEngine"""
    return face_engine


# Export get_db dependency directly
__all__ = ["get_db", "get_face_engine"]
