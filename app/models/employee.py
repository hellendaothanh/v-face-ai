import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.face_feature import FaceFeature
    from app.models.attendance import AttendanceRecord


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )
    phone_number: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True
    )
    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    position: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    face_features: Mapped[List["FaceFeature"]] = relationship(
        "FaceFeature",
        back_populates="employee",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(
        "AttendanceRecord",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    attendance_requests: Mapped[List["AttendanceRequest"]] = relationship(
        "AttendanceRequest",
        back_populates="employee",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Employee(code={self.employee_code}, name={self.full_name})>"
