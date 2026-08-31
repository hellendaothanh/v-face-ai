import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class OfficeLocation(Base):
    """
    Quản lý danh sách Văn phòng / Chi nhánh phục vụ chấm công Geofencing & Wi-Fi IP
    """
    __tablename__ = "office_locations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True
    )
    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default=""
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=21.0285
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=105.8542
    )
    radius_meters: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=500.0
    )
    # Danh sách các IP Public của Wi-Fi văn phòng (VD: ["14.162.144.10", "118.69.182.50", "192.168.1.7"])
    public_ips: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    # Danh sách BSSID / SSID Wi-Fi văn phòng (VD: ["vface_corp_5g", "a4:91:b1:..."])
    wifi_bssids: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
