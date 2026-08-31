from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field


class OfficeLocationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Tên văn phòng / chi nhánh")
    address: Optional[str] = Field(default="", max_length=500, description="Địa chỉ văn phòng")
    latitude: float = Field(default=21.0285, description="Tọa độ GPS Vĩ độ (Latitude)")
    longitude: float = Field(default=105.8542, description="Tọa độ GPS Kinh độ (Longitude)")
    radius_meters: float = Field(default=500.0, ge=10.0, le=50000.0, description="Bán kính chấm công hợp lệ (mét)")
    public_ips: List[str] = Field(default_factory=list, description="Danh sách IP Public của Wi-Fi văn phòng")
    wifi_bssids: List[str] = Field(default_factory=list, description="Danh sách BSSID / SSID Wi-Fi văn phòng")
    is_active: bool = Field(default=True, description="Trạng thái hoạt động")


class OfficeLocationCreate(OfficeLocationBase):
    pass


class OfficeLocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[float] = Field(None, ge=10.0, le=50000.0)
    public_ips: Optional[List[str]] = None
    wifi_bssids: Optional[List[str]] = None
    is_active: Optional[bool] = None


class OfficeLocationRead(OfficeLocationBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
