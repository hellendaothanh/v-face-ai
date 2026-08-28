import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class TicketType(str, enum.Enum):
    INCIDENT = "INCIDENT"
    SERVICE_REQUEST = "SERVICE_REQUEST"
    PROBLEM = "PROBLEM"
    CHANGE = "CHANGE"


class ImpactLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class UrgencyLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class PriorityLevel(str, enum.Enum):
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MEDIUM = "P3_MEDIUM"
    P4_LOW = "P4_LOW"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_USER = "PENDING_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class KBCategory(Base, TimestampMixin):
    __tablename__ = "kb_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="BookOpen")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    articles: Mapped[List["KBArticle"]] = relationship(
        "KBArticle", back_populates="category", cascade="all, delete-orphan"
    )


class KBArticle(Base, TimestampMixin):
    __tablename__ = "kb_articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="Markdown formatted body")
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="Comma separated tags")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    category: Mapped["KBCategory"] = relationship("KBCategory", back_populates="articles")
    author: Mapped[Optional["User"]] = relationship("User", foreign_keys=[author_id])


class Ticket(Base, TimestampMixin):
    __tablename__ = "helpdesk_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    ticket_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True, comment="e.g. INC-202608-001"
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    ticket_type: Mapped[TicketType] = mapped_column(
        Enum(TicketType), default=TicketType.INCIDENT, nullable=False
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True
    )
    impact: Mapped[ImpactLevel] = mapped_column(
        Enum(ImpactLevel), default=ImpactLevel.MEDIUM, nullable=False
    )
    urgency: Mapped[UrgencyLevel] = mapped_column(
        Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM, nullable=False
    )
    priority: Mapped[PriorityLevel] = mapped_column(
        Enum(PriorityLevel), default=PriorityLevel.P3_MEDIUM, nullable=False, index=True
    )

    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True
    )
    linked_kb_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="SET NULL"), nullable=True
    )

    # SLA Tracking
    sla_response_due: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_resolve_due: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    resolution_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    satisfaction_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="CSAT 1 to 5")
    satisfaction_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    category: Mapped[Optional["KBCategory"]] = relationship("KBCategory")
    linked_kb: Mapped[Optional["KBArticle"]] = relationship("KBArticle")
    comments: Mapped[List["TicketComment"]] = relationship(
        "TicketComment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketComment.created_at.asc()"
    )


class TicketComment(Base, TimestampMixin):
    __tablename__ = "helpdesk_ticket_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("helpdesk_tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="True for private technician-only notes"
    )

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="comments")
    author: Mapped["User"] = relationship("User", foreign_keys=[user_id])
