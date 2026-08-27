import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.face import FaceFeatureRead


class EmployeeBase(BaseModel):
    employee_code: str = Field(..., min_length=2, max_length=50, description="Mã định danh nhân viên duy nhất (VD: NV001, EMP_102)")
    full_name: str = Field(..., min_length=2, max_length=150, description="Họ và tên đầy đủ")
    email: EmailStr = Field(..., description="Email công việc của nhân viên")
    phone_number: Optional[str] = Field(None, max_length=20, description="Số điện thoại liên hệ")
    department: str = Field(..., min_length=2, max_length=100, description="Phòng ban (VD: Kỹ thuật, Nhân sự, Sales)")
    position: str = Field(..., min_length=2, max_length=100, description="Chức danh / Vị trí (VD: AI Engineer, Backend Dev)")
    is_active: bool = Field(default=True, description="Trạng thái hoạt động")


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    position: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None


class EmployeeRead(EmployeeBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    registered_faces_count: int = Field(default=0, description="Số lượng mẫu khuôn mặt đã đăng ký")

    model_config = {"from_attributes": True}


class EmployeeDetailRead(EmployeeRead):
    face_features: List[FaceFeatureRead] = Field(default_factory=list)
