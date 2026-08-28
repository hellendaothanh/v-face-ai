import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.helpdesk import ImpactLevel, PriorityLevel, TicketStatus, TicketType, UrgencyLevel


# --- KB Schemas ---
class KBCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    icon: Optional[str] = "BookOpen"
    description: Optional[str] = None
    sort_order: int = 0


class KBCategoryCreate(KBCategoryBase):
    pass


class KBCategoryResponse(KBCategoryBase):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class KBArticleBase(BaseModel):
    category_id: uuid.UUID
    title: str = Field(..., max_length=255)
    summary: Optional[str] = None
    content: str
    tags: Optional[str] = None
    is_published: bool = True


class KBArticleCreate(KBArticleBase):
    slug: Optional[str] = None


class KBArticleUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    is_published: Optional[bool] = None


class KBArticleResponse(KBArticleBase):
    id: uuid.UUID
    slug: str
    view_count: int
    helpful_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[KBCategoryResponse] = None
    model_config = ConfigDict(from_attributes=True)


# --- Ticket Schemas ---
class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    ticket_type: TicketType = TicketType.INCIDENT
    impact: ImpactLevel = ImpactLevel.MEDIUM
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    category_id: Optional[uuid.UUID] = None
    linked_kb_id: Optional[uuid.UUID] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    impact: Optional[ImpactLevel] = None
    urgency: Optional[UrgencyLevel] = None
    assignee_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    linked_kb_id: Optional[uuid.UUID] = None
    resolution_summary: Optional[str] = None


class TicketCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal: bool = False


class TicketCommentResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    is_internal: bool
    created_at: datetime
    author_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class TicketFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None


class TicketResponse(BaseModel):
    id: uuid.UUID
    ticket_code: str
    title: str
    description: str
    ticket_type: TicketType
    status: TicketStatus
    impact: ImpactLevel
    urgency: UrgencyLevel
    priority: PriorityLevel
    requester_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    linked_kb_id: Optional[uuid.UUID] = None

    sla_response_due: Optional[datetime] = None
    sla_resolve_due: Optional[datetime] = None
    first_responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    resolution_summary: Optional[str] = None
    satisfaction_rating: Optional[int] = None
    satisfaction_feedback: Optional[str] = None

    requester_name: Optional[str] = None
    requester_code: Optional[str] = None
    assignee_name: Optional[str] = None
    category_name: Optional[str] = None
    linked_kb_title: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    comments: List[TicketCommentResponse] = []

    model_config = ConfigDict(from_attributes=True)
