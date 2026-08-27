import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class FaceFeatureRead(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    detection_score: float
    image_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FaceRegisterItemResult(BaseModel):
    filename: str
    face_id: Optional[uuid.UUID] = None
    success: bool
    detection_score: Optional[float] = None
    blur_score: Optional[float] = None
    error_detail: Optional[str] = None


class FaceRegisterResponse(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    total_uploaded: int
    total_registered: int
    results: List[FaceRegisterItemResult]
