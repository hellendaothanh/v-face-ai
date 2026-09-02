import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.helpdesk import (
    ImpactLevel,
    KBArticle,
    KBCategory,
    PriorityLevel,
    Ticket,
    TicketComment,
    TicketStatus,
    TicketType,
    UrgencyLevel,
)
from app.models.user import User
from app.schemas.helpdesk import (
    KBArticleCreate,
    KBCategoryCreate,
    TicketCommentCreate,
    TicketCreate,
    TicketFeedbackCreate,
    TicketUpdate,
)


class HelpdeskService:
    @staticmethod
    def calculate_priority(impact: ImpactLevel, urgency: UrgencyLevel) -> PriorityLevel:
        """ITIL Matrix: Calculate Priority Level from Impact & Urgency."""
        if impact == ImpactLevel.HIGH and urgency == UrgencyLevel.HIGH:
            return PriorityLevel.P1_CRITICAL
        elif (impact == ImpactLevel.HIGH and urgency == UrgencyLevel.MEDIUM) or (
            impact == ImpactLevel.MEDIUM and urgency == UrgencyLevel.HIGH
        ):
            return PriorityLevel.P2_HIGH
        elif impact == ImpactLevel.LOW and urgency == UrgencyLevel.LOW:
            return PriorityLevel.P4_LOW
        else:
            return PriorityLevel.P3_MEDIUM

    @staticmethod
    def calculate_sla_targets(priority: PriorityLevel) -> tuple[datetime, datetime]:
        """ITIL SLA Targets: Response Due and Resolution Due."""
        now = datetime.now(timezone.utc)
        if priority == PriorityLevel.P1_CRITICAL:
            return now + timedelta(minutes=15), now + timedelta(hours=2)
        elif priority == PriorityLevel.P2_HIGH:
            return now + timedelta(minutes=30), now + timedelta(hours=4)
        elif priority == PriorityLevel.P3_MEDIUM:
            return now + timedelta(hours=2), now + timedelta(hours=24)
        else:  # P4_LOW
            return now + timedelta(hours=4), now + timedelta(hours=48)

    # --- KB Categories ---
    @staticmethod
    async def get_categories(db: AsyncSession) -> List[KBCategory]:
        stmt = select(KBCategory).order_by(KBCategory.sort_order.asc(), KBCategory.name.asc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def create_category(db: AsyncSession, data: KBCategoryCreate) -> KBCategory:
        cat = KBCategory(**data.model_dump())
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        return cat

    # --- KB Articles ---
    @staticmethod
    async def get_articles(
        db: AsyncSession, category_id: Optional[uuid.UUID] = None, search: Optional[str] = None
    ) -> List[KBArticle]:
        stmt = select(KBArticle).options(selectinload(KBArticle.category)).where(KBArticle.is_published == True)
        if category_id:
            stmt = stmt.where(KBArticle.category_id == category_id)
        if search:
            stmt = stmt.where(
                or_(
                    KBArticle.title.ilike(f"%{search}%"),
                    KBArticle.summary.ilike(f"%{search}%"),
                    KBArticle.content.ilike(f"%{search}%"),
                    KBArticle.tags.ilike(f"%{search}%"),
                )
            )
        stmt = stmt.order_by(desc(KBArticle.view_count), desc(KBArticle.created_at))
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_article_by_id(db: AsyncSession, article_id: uuid.UUID) -> Optional[KBArticle]:
        stmt = (
            select(KBArticle)
            .options(selectinload(KBArticle.category))
            .where(KBArticle.id == article_id)
        )
        res = await db.execute(stmt)
        article = res.scalar_one_or_none()
        if article:
            article.view_count += 1
            await db.commit()
            await db.refresh(article)
        return article

    @staticmethod
    async def create_article(
        db: AsyncSession, data: KBArticleCreate, author_id: Optional[uuid.UUID] = None
    ) -> KBArticle:
        slug = data.slug or re.sub(r"[^a-zA-Z0-9]+", "-", data.title.lower()).strip("-")
        # Ensure unique slug
        unique_slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        article = KBArticle(
            category_id=data.category_id,
            title=data.title,
            slug=unique_slug,
            summary=data.summary,
            content=data.content,
            tags=data.tags,
            is_published=data.is_published,
            author_id=author_id,
        )
        db.add(article)
        await db.commit()
        await db.refresh(article)
        return article

    @staticmethod
    async def update_article(
        db: AsyncSession, article_id: uuid.UUID, data: Any
    ) -> Optional[KBArticle]:
        stmt = (
            select(KBArticle)
            .options(selectinload(KBArticle.category))
            .where(KBArticle.id == article_id)
        )
        res = await db.execute(stmt)
        article = res.scalar_one_or_none()
        if not article:
            return None
        
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else data
        for key, val in update_data.items():
            if val is not None and hasattr(article, key):
                setattr(article, key, val)
        
        await db.commit()
        await db.refresh(article)
        return article

    @staticmethod
    async def delete_article(db: AsyncSession, article_id: uuid.UUID) -> bool:
        article = await db.get(KBArticle, article_id)
        if not article:
            return False
        await db.delete(article)
        await db.commit()
        return True

    @staticmethod
    async def mark_article_helpful(db: AsyncSession, article_id: uuid.UUID) -> Optional[KBArticle]:
        stmt = (
            select(KBArticle)
            .options(selectinload(KBArticle.category))
            .where(KBArticle.id == article_id)
        )
        res = await db.execute(stmt)
        article = res.scalar_one_or_none()
        if article:
            article.helpful_count += 1
            await db.commit()
            await db.refresh(article)
        return article

    # --- Tickets ---
    @staticmethod
    async def get_tickets(
        db: AsyncSession,
        status: Optional[TicketStatus] = None,
        priority: Optional[PriorityLevel] = None,
        ticket_type: Optional[TicketType] = None,
        requester_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
    ) -> List[Ticket]:
        stmt = (
            select(Ticket)
            .options(
                selectinload(Ticket.requester),
                selectinload(Ticket.assignee),
                selectinload(Ticket.category),
                selectinload(Ticket.linked_kb),
                selectinload(Ticket.comments).selectinload(TicketComment.author),
            )
            .order_by(desc(Ticket.created_at))
        )
        if status:
            stmt = stmt.where(Ticket.status == status)
        if priority:
            stmt = stmt.where(Ticket.priority == priority)
        if ticket_type:
            stmt = stmt.where(Ticket.ticket_type == ticket_type)
        if requester_id:
            stmt = stmt.where(Ticket.requester_id == requester_id)
        if search:
            stmt = stmt.where(
                or_(
                    Ticket.ticket_code.ilike(f"%{search}%"),
                    Ticket.title.ilike(f"%{search}%"),
                    Ticket.description.ilike(f"%{search}%"),
                )
            )

        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_ticket_by_id(db: AsyncSession, ticket_id: uuid.UUID) -> Optional[Ticket]:
        stmt = (
            select(Ticket)
            .options(
                selectinload(Ticket.requester),
                selectinload(Ticket.assignee),
                selectinload(Ticket.category),
                selectinload(Ticket.linked_kb),
                selectinload(Ticket.comments).selectinload(TicketComment.author),
            )
            .where(Ticket.id == ticket_id)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def create_ticket(
        db: AsyncSession, data: TicketCreate, requester_id: uuid.UUID
    ) -> Ticket:
        # Generate ITIL ticket code
        prefix = "INC" if data.ticket_type == TicketType.INCIDENT else "SR"
        date_str = datetime.now().strftime("%Y%m")
        count_stmt = select(func.count(Ticket.id))
        res = await db.execute(count_stmt)
        seq = (res.scalar() or 0) + 1
        ticket_code = f"{prefix}-{date_str}-{seq:04d}"

        priority = HelpdeskService.calculate_priority(data.impact, data.urgency)
        sla_resp, sla_res = HelpdeskService.calculate_sla_targets(priority)

        ticket = Ticket(
            ticket_code=ticket_code,
            title=data.title,
            description=data.description,
            ticket_type=data.ticket_type,
            status=TicketStatus.OPEN,
            impact=data.impact,
            urgency=data.urgency,
            priority=priority,
            requester_id=requester_id,
            category_id=data.category_id,
            linked_kb_id=data.linked_kb_id,
            sla_response_due=sla_resp,
            sla_resolve_due=sla_res,
        )
        db.add(ticket)
        await db.commit()

        # Trigger AI Helpdesk Auto-Resolution
        try:
            from app.services.ai_helpdesk_service import AIHelpdeskService
            await AIHelpdeskService.process_ticket_auto_resolution(db, ticket.id)
        except Exception as e:
            from loguru import logger
            logger.warning(f"Non-blocking AI Helpdesk processing error: {e}")

        return await HelpdeskService.get_ticket_by_id(db, ticket.id)

    @staticmethod
    async def update_ticket(
        db: AsyncSession, ticket_id: uuid.UUID, data: TicketUpdate
    ) -> Optional[Ticket]:
        ticket = await HelpdeskService.get_ticket_by_id(db, ticket_id)
        if not ticket:
            return None

        update_dict = data.model_dump(exclude_unset=True)

        # Priority recalculation if impact or urgency changed
        if "impact" in update_dict or "urgency" in update_dict:
            new_impact = update_dict.get("impact", ticket.impact)
            new_urgency = update_dict.get("urgency", ticket.urgency)
            ticket.priority = HelpdeskService.calculate_priority(new_impact, new_urgency)

        for k, v in update_dict.items():
            setattr(ticket, k, v)

        now = datetime.now(timezone.utc)
        if ticket.status == TicketStatus.RESOLVED and not ticket.resolved_at:
            ticket.resolved_at = now
        elif ticket.status == TicketStatus.CLOSED and not ticket.closed_at:
            ticket.closed_at = now

        await db.commit()
        return await HelpdeskService.get_ticket_by_id(db, ticket.id)

    @staticmethod
    async def add_comment(
        db: AsyncSession, ticket_id: uuid.UUID, user_id: uuid.UUID, data: TicketCommentCreate
    ) -> TicketComment:
        ticket = await db.get(Ticket, ticket_id)
        now = datetime.now(timezone.utc)
        if ticket and not ticket.first_responded_at:
            ticket.first_responded_at = now

        comment = TicketComment(
            ticket_id=ticket_id,
            user_id=user_id,
            content=data.content,
            is_internal=data.is_internal,
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        return comment

    @staticmethod
    async def add_feedback(
        db: AsyncSession, ticket_id: uuid.UUID, data: TicketFeedbackCreate
    ) -> Optional[Ticket]:
        ticket = await db.get(Ticket, ticket_id)
        if ticket:
            ticket.satisfaction_rating = data.rating
            ticket.satisfaction_feedback = data.feedback
            await db.commit()
            return await HelpdeskService.get_ticket_by_id(db, ticket.id)
        return None
