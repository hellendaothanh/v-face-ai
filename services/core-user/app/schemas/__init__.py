import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ------------------------------------------------------------------------------
# Auth Schemas
# ------------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or Email")
    password: str = Field(..., description="Plain password")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class FaceTokenRequest(BaseModel):
    user_code: Optional[str] = Field(None, description="Employee/User Code")
    username: Optional[str] = Field(None, description="Username or Email")
    employee_id: Optional[str] = Field(None, description="Employee UUID from Face AI")
    secret_key: Optional[str] = Field(None, description="Internal service secret if needed")


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


# ------------------------------------------------------------------------------
# Role & Permission Schemas
# ------------------------------------------------------------------------------
class PermissionBase(BaseModel):
    code: str
    name: str
    module: str
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: Optional[List[uuid.UUID]] = []


class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[uuid.UUID]] = None


class RoleResponse(RoleBase):
    id: uuid.UUID
    is_system: bool
    permissions: List[PermissionResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# Organization Schemas
# ------------------------------------------------------------------------------
class DepartmentBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    manager_id: Optional[uuid.UUID] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    manager_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class PositionBase(BaseModel):
    code: str
    name: str
    level: int = 1
    description: Optional[str] = None
    is_active: bool = True


class PositionCreate(PositionBase):
    pass


class PositionUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PositionResponse(PositionBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# User & Profile Schemas
# ------------------------------------------------------------------------------
class UserProfileBase(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    identity_card: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    identity_card: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    user_code: str = Field(..., description="Unique employee code e.g. EMP001")
    username: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone_number: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    position_id: Optional[uuid.UUID] = None
    role_ids: Optional[List[uuid.UUID]] = []


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[uuid.UUID] = None
    position_id: Optional[uuid.UUID] = None
    role_ids: Optional[List[uuid.UUID]] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    user_code: str
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    department: Optional[DepartmentResponse] = None
    position: Optional[PositionResponse] = None
    roles: List[RoleResponse] = []
    profile: Optional[UserProfileResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMeResponse(BaseModel):
    id: uuid.UUID
    user_code: str
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    roles: List[str] = []
    permissions: List[str] = []
    department: Optional[str] = None
    position: Optional[str] = None
    profile: Optional[UserProfileResponse] = None
