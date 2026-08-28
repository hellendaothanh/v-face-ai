from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field

from app.models.device import DevicePurpose


class DeviceBase(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=150, description="Tên thiết bị camera")
    rtsp_url: str = Field(..., min_length=1, max_length=500, description="Địa chỉ luồng RTSP hoặc chỉ số Webcam (0, 1...)")
    location: str = Field(default="Văn phòng chính", max_length=255, description="Vị trí / Chi nhánh lắp đặt")
    purpose: DevicePurpose = Field(default=DevicePurpose.CHECK_IN, description="Mục đích: CHECK_IN, CHECK_OUT, hoặc BOTH")
    is_active: bool = Field(default=True, description="Trạng thái kích hoạt luồng xử lý")


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = Field(None, min_length=2, max_length=150)
    rtsp_url: Optional[str] = Field(None, min_length=1, max_length=500)
    location: Optional[str] = Field(None, max_length=255)
    purpose: Optional[DevicePurpose] = None
    is_active: Optional[bool] = None


class DeviceResponse(DeviceBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_connected: Optional[bool] = Field(default=False, description="Tình trạng kết nối luồng camera hiện tại")
    fps: Optional[float] = Field(default=0.0, description="Tốc độ khung hình xử lý hiện tại")
    processed_count: Optional[int] = Field(default=0, description="Số lượng lượt nhận diện thành công của thiết bị")

    model_config = {"from_attributes": True}


class DeviceToggleResponse(BaseModel):
    id: uuid.UUID
    device_name: str
    is_active: bool
    message: str
