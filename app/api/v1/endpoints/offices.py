import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.office_location import OfficeLocation
from app.schemas.common import ResponseBase
from app.schemas.office_location import (
    OfficeLocationCreate,
    OfficeLocationRead,
    OfficeLocationUpdate,
)

router = APIRouter(prefix="/offices", tags=["Offices & Geofencing (Quản lý Văn phòng & IP Wi-Fi)"])


def extract_client_ip(request: Request) -> str:
    """Trích xuất địa chỉ IP thực của client từ các header proxy hoặc socket connection"""
    # 1. X-Forwarded-For (thường chứa danh sách IP phân tách bởi dấu phẩy, IP đầu tiên là client thực)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",")]
        if parts and parts[0]:
            return parts[0]

    # 2. X-Real-IP
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # 3. Request Client Host
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


@router.get("/my-ip", response_model=ResponseBase[dict])
async def get_my_ip(request: Request):
    """
    Tiện ích giúp Admin/User kiểm tra địa chỉ IP hiện tại để thêm vào danh sách Wi-Fi văn phòng.
    """
    client_ip = extract_client_ip(request)
    return ResponseBase(
        success=True,
        message="Lấy địa chỉ IP hiện tại thành công",
        data={"client_ip": client_ip}
    )


@router.get("", response_model=ResponseBase[List[OfficeLocationRead]])
async def list_offices(
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách tất cả các văn phòng / chi nhánh kèm cấu hình GPS & IP Wi-Fi.
    """
    res = await db.execute(select(OfficeLocation).order_by(OfficeLocation.created_at.asc()))
    offices = res.scalars().all()
    return ResponseBase(
        success=True,
        message=f"Đã tải {len(offices)} văn phòng/chi nhánh.",
        data=offices
    )


@router.post("", response_model=ResponseBase[OfficeLocationRead], status_code=status.HTTP_201_CREATED)
async def create_office(
    payload: OfficeLocationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Tạo văn phòng / chi nhánh mới với tọa độ GPS, bán kính và danh sách IP Public Wi-Fi.
    """
    # Clean and standardize IP list
    clean_ips = [ip.strip() for ip in payload.public_ips if ip and ip.strip()]
    clean_bssids = [b.strip() for b in payload.wifi_bssids if b and b.strip()]

    new_office = OfficeLocation(
        id=uuid.uuid4(),
        name=payload.name.strip(),
        address=payload.address or "",
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_meters=payload.radius_meters,
        public_ips=clean_ips,
        wifi_bssids=clean_bssids,
        is_active=payload.is_active
    )
    db.add(new_office)
    await db.commit()
    await db.refresh(new_office)

    return ResponseBase(
        success=True,
        message=f"Đã thêm văn phòng '{new_office.name}' thành công.",
        data=new_office
    )


@router.put("/{office_id}", response_model=ResponseBase[OfficeLocationRead])
async def update_office(
    office_id: uuid.UUID,
    payload: OfficeLocationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Cập nhật thông tin, tọa độ GPS hoặc danh sách IP Public của văn phòng.
    """
    res = await db.execute(select(OfficeLocation).where(OfficeLocation.id == office_id))
    office = res.scalar_one_or_none()
    if not office:
        raise HTTPException(status_code=404, detail="Không tìm thấy văn phòng.")

    update_data = payload.model_dump(exclude_unset=True)
    if "public_ips" in update_data and update_data["public_ips"] is not None:
        update_data["public_ips"] = [ip.strip() for ip in update_data["public_ips"] if ip and ip.strip()]
    if "wifi_bssids" in update_data and update_data["wifi_bssids"] is not None:
        update_data["wifi_bssids"] = [b.strip() for b in update_data["wifi_bssids"] if b and b.strip()]

    for field, val in update_data.items():
        setattr(office, field, val)

    await db.commit()
    await db.refresh(office)

    return ResponseBase(
        success=True,
        message=f"Đã cập nhật văn phòng '{office.name}' thành công.",
        data=office
    )


@router.delete("/{office_id}", response_model=ResponseBase[dict])
async def delete_office(
    office_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Xóa văn phòng khỏi hệ thống.
    """
    res = await db.execute(select(OfficeLocation).where(OfficeLocation.id == office_id))
    office = res.scalar_one_or_none()
    if not office:
        raise HTTPException(status_code=404, detail="Không tìm thấy văn phòng.")

    await db.delete(office)
    await db.commit()

    return ResponseBase(
        success=True,
        message=f"Đã xóa văn phòng '{office.name}'.",
        data={"id": str(office_id)}
    )
