import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.helpdesk import PriorityLevel, TicketStatus, TicketType
from app.models.user import User
from app.schemas.helpdesk import (
    KBArticleCreate,
    KBArticleResponse,
    KBArticleUpdate,
    KBCategoryCreate,
    KBCategoryResponse,
    TicketCommentCreate,
    TicketCommentResponse,
    TicketCreate,
    TicketFeedbackCreate,
    TicketResponse,
    TicketUpdate,
)
from app.services.helpdesk_service import HelpdeskService

router = APIRouter(prefix="/helpdesk", tags=["Helpdesk & Service Desk (ITIL)"])


def _get_user_display_name(user) -> Optional[str]:
    if not user:
        return None
    if getattr(user, "profile", None) and getattr(user.profile, "full_name", None):
        return user.profile.full_name
    return getattr(user, "full_name", user.username)


def _format_ticket(t) -> dict:
    return {
        "id": t.id,
        "ticket_code": t.ticket_code,
        "title": t.title,
        "description": t.description,
        "ticket_type": t.ticket_type,
        "status": t.status,
        "impact": t.impact,
        "urgency": t.urgency,
        "priority": t.priority,
        "requester_id": t.requester_id,
        "assignee_id": t.assignee_id,
        "category_id": t.category_id,
        "linked_kb_id": t.linked_kb_id,
        "sla_response_due": t.sla_response_due,
        "sla_resolve_due": t.sla_resolve_due,
        "first_responded_at": t.first_responded_at,
        "resolved_at": t.resolved_at,
        "closed_at": t.closed_at,
        "resolution_summary": t.resolution_summary,
        "satisfaction_rating": t.satisfaction_rating,
        "satisfaction_feedback": t.satisfaction_feedback,
        "requester_name": _get_user_display_name(t.requester),
        "requester_code": t.requester.user_code if t.requester else None,
        "assignee_name": _get_user_display_name(t.assignee),
        "category_name": t.category.name if t.category else None,
        "linked_kb_title": t.linked_kb.title if t.linked_kb else None,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "comments": [
            {
                "id": c.id,
                "ticket_id": c.ticket_id,
                "user_id": c.user_id,
                "content": c.content,
                "is_internal": c.is_internal,
                "created_at": c.created_at,
                "author_name": _get_user_display_name(c.author) or "User",
            }
            for c in getattr(t, "comments", [])
        ],
    }


# ==============================================================================
# KNOWLEDGE BASE (KB) ENDPOINTS
# ==============================================================================
@router.get("/kb/categories", response_model=List[KBCategoryResponse])
async def list_kb_categories(db: AsyncSession = Depends(get_db)):
    """List all Knowledge Base categories."""
    return await HelpdeskService.get_categories(db)


@router.post("/kb/categories", response_model=KBCategoryResponse)
async def create_kb_category(
    data: KBCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new KB Category (requires Helpdesk admin / manager)."""
    return await HelpdeskService.create_category(db, data)


@router.get("/kb/articles", response_model=List[KBArticleResponse])
async def list_kb_articles(
    category_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Search and list published Knowledge Base articles."""
    return await HelpdeskService.get_articles(db, category_id=category_id, search=search)


@router.get("/kb/articles/{article_id}", response_model=KBArticleResponse)
async def get_kb_article(article_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get single KB article by ID and increment view count."""
    article = await HelpdeskService.get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="KB Article not found")
    return article


@router.post("/kb/articles", response_model=KBArticleResponse)
async def create_kb_article(
    data: KBArticleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new standard solution article in Knowledge Base."""
    return await HelpdeskService.create_article(db, data, author_id=current_user.id)


@router.put("/kb/articles/{article_id}", response_model=KBArticleResponse)
async def update_kb_article(
    article_id: uuid.UUID,
    data: KBArticleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing Knowledge Base article."""
    article = await HelpdeskService.update_article(db, article_id, data)
    if not article:
        raise HTTPException(status_code=404, detail="KB Article not found")
    return article


@router.delete("/kb/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb_article(
    article_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a Knowledge Base article."""
    success = await HelpdeskService.delete_article(db, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="KB Article not found")
    return None


@router.post("/kb/articles/{article_id}/helpful", response_model=KBArticleResponse)
async def mark_article_helpful(article_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Vote helpful count for KB article."""
    article = await HelpdeskService.mark_article_helpful(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="KB Article not found")
    return article


# ==============================================================================
# TICKETS & SERVICE DESK ENDPOINTS
# ==============================================================================
@router.get("/tickets", response_model=List[TicketResponse])
async def list_tickets(
    status: Optional[TicketStatus] = None,
    priority: Optional[PriorityLevel] = None,
    ticket_type: Optional[TicketType] = None,
    search: Optional[str] = None,
    my_tickets_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List ITIL support tickets with flexible filters."""
    req_id = current_user.id if my_tickets_only else None
    tickets = await HelpdeskService.get_tickets(
        db, status=status, priority=priority, ticket_type=ticket_type, requester_id=req_id, search=search
    )
    return [_format_ticket(t) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get ticket detail, SLA tracking, and audit comments."""
    ticket = await HelpdeskService.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _format_ticket(ticket)


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new ITIL Ticket (Incident / Service Request) with SLA target calculation."""
    ticket = await HelpdeskService.create_ticket(db, data, requester_id=current_user.id)
    return _format_ticket(ticket)


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update ticket status, assign technician, link KB solution, or resolve."""
    ticket = await HelpdeskService.update_ticket(db, ticket_id, data)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _format_ticket(ticket)


@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentResponse)
async def add_ticket_comment(
    ticket_id: uuid.UUID,
    data: TicketCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add discussion comment or internal technician note."""
    comment = await HelpdeskService.add_comment(db, ticket_id, current_user.id, data)
    return {
        "id": comment.id,
        "ticket_id": comment.ticket_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "is_internal": comment.is_internal,
        "created_at": comment.created_at,
        "author_name": current_user.full_name or current_user.username,
    }


@router.post("/tickets/{ticket_id}/feedback", response_model=TicketResponse)
async def submit_csat_feedback(
    ticket_id: uuid.UUID,
    data: TicketFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit CSAT satisfaction rating (1-5 stars) after ticket resolution."""
    ticket = await HelpdeskService.add_feedback(db, ticket_id, data)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _format_ticket(ticket)


@router.post("/tickets/{ticket_id}/ai-diagnose", response_model=TicketResponse)
async def trigger_ai_diagnose(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger or re-run AI Helpdesk Agent auto-diagnosis and KB matching on a ticket."""
    from app.services.ai_helpdesk_service import AIHelpdeskService
    await AIHelpdeskService.process_ticket_auto_resolution(db, ticket_id)
    ticket = await HelpdeskService.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _format_ticket(ticket)

