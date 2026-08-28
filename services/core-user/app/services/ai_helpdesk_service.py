import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from loguru import logger
import requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.helpdesk import KBArticle, Ticket, TicketComment, TicketStatus
from app.models.user import User


class AIHelpdeskService:
    """Intelligent AI Helpdesk Agent for Auto-Diagnosing Tickets via Knowledge Base."""

    @classmethod
    async def match_knowledge_base(
        cls, db: AsyncSession, ticket_title: str, ticket_description: str
    ) -> List[Tuple[KBArticle, float]]:
        """Search and score KB articles relevant to ticket query."""
        stmt = (
            select(KBArticle)
            .options(selectinload(KBArticle.category))
            .where(KBArticle.is_published == True)
        )
        res = await db.execute(stmt)
        articles = list(res.scalars().all())

        if not articles:
            return []

        query_text = f"{ticket_title} {ticket_description}".lower()
        # Tokenize query words
        query_words = set(re.findall(r"\w+", query_text))
        stop_words = {"và", "là", "cho", "của", "tại", "khi", "bị", "được", "có", "không", "the", "a", "an", "is", "in", "to", "for", "of", "and"}
        query_keywords = query_words - stop_words

        scored_articles: List[Tuple[KBArticle, float]] = []

        for art in articles:
            score = 0.0
            art_title = (art.title or "").lower()
            art_summary = (art.summary or "").lower()
            art_tags = (art.tags or "").lower()
            art_content = (art.content or "").lower()

            # Exact title containment
            if ticket_title.lower() in art_title or art_title in ticket_title.lower():
                score += 0.50

            # Tags match
            if art_tags:
                tags_list = [t.strip() for t in art_tags.split(",") if t.strip()]
                for t in tags_list:
                    if t in query_text:
                        score += 0.35

            # Keyword overlap
            for kw in query_keywords:
                if len(kw) <= 2:
                    continue
                if kw in art_title:
                    score += 0.15
                elif kw in art_tags:
                    score += 0.10
                elif kw in art_summary:
                    score += 0.05
                elif kw in art_content:
                    score += 0.02

            # Normalize and clamp score
            final_score = min(1.0, score)
            if final_score > 0.15:
                scored_articles.append((art, final_score))

        # Sort by score descending
        scored_articles.sort(key=lambda x: x[1], reverse=True)
        return scored_articles

    @classmethod
    def call_gemini_api(cls, prompt: str, api_key: str, model: str = "gemini-1.5-flash") -> Optional[str]:
        """Invoke Google Gemini REST API."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1024,
                }
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
        return None

    @classmethod
    def call_openai_api(cls, prompt: str, api_key: str, model: str = "gpt-4o-mini") -> Optional[str]:
        """Invoke OpenAI or OpenAI-compatible endpoint."""
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a senior ITIL Support Engineer and V-Face AI IT Assistant."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 1024,
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content")
            else:
                logger.warning(f"OpenAI API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
        return None

    @classmethod
    def generate_expert_fallback_response(
        cls, ticket: Ticket, matched_article: Optional[KBArticle], confidence: float
    ) -> str:
        """Rule-based intelligent ITIL diagnosis when external LLM is offline or no API key."""
        if matched_article:
            return f"""### 🤖 Phân Tích & Hướng Dẫn Tự Động Từ V-Face AI Support Agent

Chào bạn! Hệ thống AI Helpdesk đã tự động tiếp nhận sự cố **#{ticket.ticket_code}** và tìm thấy giải pháp tương thích cao trong Cơ sở tri thức (Độ tin cậy: **{int(confidence * 100)}%**).

---

#### 🔍 1. Bài viết giải pháp được đề xuất
> **[{matched_article.title}](#kb-article-{matched_article.id})**  
> *Danh mục:* **{matched_article.category.name if matched_article.category else 'Hệ Thống'}** | *Thẻ:* `{matched_article.tags or 'helpdesk'}`

#### 🛠️ 2. Các bước xử lý tức thì (Actionable Steps)
{matched_article.content}

---

> [!TIP]
> **Khuyến nghị:** Bạn vui lòng làm theo các bước hướng dẫn chuẩn ở trên. Nếu sự cố đã được khắc phục hoàn toàn, bạn có thể bấm **Đóng Ticket** hoặc phản hồi xác nhận bên dưới. Kỹ thuật viên IT chuyên trách vẫn đang theo dõi ticket này theo đúng cam kết SLA.
"""
        else:
            return f"""### 🤖 Tiếp Nhận Tự Động Từ V-Face AI Support Agent

Chào bạn! Hệ thống AI Helpdesk đã ghi nhận yêu cầu hỗ trợ **#{ticket.ticket_code}** với mức ưu tiên **{ticket.priority.value}**.

---

#### 📋 Tóm tắt sự cố
- **Tiêu đề:** {ticket.title}
- **Loại yêu cầu:** `{ticket.ticket_type.value}`
- **Hạn cam kết xử lý (SLA Resolve Due):** `{ticket.sla_resolve_due.strftime('%H:%M %d/%m/%Y') if ticket.sla_resolve_due else '--'}`

#### 💡 Khuyến nghị kiểm tra cơ bản ban đầu:
1. Đảm bảo thiết bị đầu cuối và kết nối mạng nội bộ công ty đang hoạt động bình thường.
2. Thử làm mới trình duyệt (`Ctrl + F5`) hoặc kiểm tra lại quyền tài khoản.
3. Chuyên viên IT Support đã được gán thông báo và sẽ liên hệ hỗ trợ bạn sớm nhất!
"""

    @classmethod
    async def process_ticket_auto_resolution(
        cls, db: AsyncSession, ticket_id: uuid.UUID
    ) -> Optional[TicketComment]:
        """Main AI pipeline to analyze ticket and append auto-resolution comment."""
        if not settings.AI_HELPDESK_ENABLED:
            return None

        ticket = await db.get(
            Ticket,
            ticket_id,
            options=[
                selectinload(Ticket.requester),
                selectinload(Ticket.category),
                selectinload(Ticket.linked_kb),
                selectinload(Ticket.comments),
            ],
        )
        if not ticket:
            return None

        # 1. Match Knowledge Base
        scored_kbs = await cls.match_knowledge_base(db, ticket.title, ticket.description)
        best_article: Optional[KBArticle] = None
        best_score = 0.0
        if scored_kbs:
            best_article, best_score = scored_kbs[0]

        # Automatically link best KB if score is sufficient
        if best_article and best_score >= 0.35 and not ticket.linked_kb_id:
            ticket.linked_kb_id = best_article.id
            best_article.view_count += 1
            await db.commit()

        # 2. Build Response (Try LLM API, fallback to Rule-based)
        ai_response_text: Optional[str] = None

        if settings.AI_API_KEY and settings.AI_API_KEY.strip():
            kb_context = ""
            if best_article:
                kb_context = f"""
KNOWLEDGE BASE CONTEXT (Giải pháp có sẵn trong hệ thống):
- Tiêu đề: {best_article.title}
- Tóm tắt: {best_article.summary}
- Nội dung chi tiết:
{best_article.content}
"""
            prompt = f"""Bạn là V-Face AI IT Support Assistant, chuyên gia hỗ trợ kỹ thuật ITIL của hệ thống V-Face AI.
Hãy viết phản hồi hỗ trợ kỹ thuật chi tiết, ân cần, chuyên nghiệp bằng tiếng Việt và định dạng Markdown cho ticket sự cố sau:

THÔNG TIN TICKET:
- Mã ticket: {ticket.ticket_code}
- Tiêu đề: {ticket.title}
- Mô tả: {ticket.description}
- Loại sự cố: {ticket.ticket_type.value}
- Mức độ ưu tiên: {ticket.priority.value}

{kb_context}

YÊU CẦU ĐỊNH DẠNG:
- Sử dụng Markdown chuẩn: Tiêu đề H3/H4, In đậm, Danh sách bước, Khối code bash/sql nếu có, Hộp callout `> [!NOTE]` hoặc `> [!TIP]`.
- Nêu rõ nguyên nhân có thể xảy ra và các bước khắc phục cụ thể cho nhân viên thực hiện ngay.
- Nếu có KNOWLEDGE BASE CONTEXT, hãy dựa vào đó để hướng dẫn chuẩn xác.
"""
            if settings.AI_PROVIDER == "gemini":
                ai_response_text = cls.call_gemini_api(prompt, settings.AI_API_KEY, settings.AI_MODEL_NAME)
            elif settings.AI_PROVIDER == "openai":
                ai_response_text = cls.call_openai_api(prompt, settings.AI_API_KEY, settings.AI_MODEL_NAME)

        # Fallback if API not configured or failed
        if not ai_response_text:
            ai_response_text = cls.generate_expert_fallback_response(ticket, best_article, best_score)

        # 3. Create AI Comment
        admin_user_stmt = select(User).where(User.username == settings.FIRST_SUPERUSER_USERNAME)
        res = await db.execute(admin_user_stmt)
        admin_user = res.scalar_one_or_none()
        author_id = admin_user.id if admin_user else ticket.requester_id

        ai_comment = TicketComment(
            ticket_id=ticket.id,
            user_id=author_id,
            content=ai_response_text,
            is_internal=False,
        )
        db.add(ai_comment)

        # Mark ticket first responded time
        if not ticket.first_responded_at:
            from datetime import datetime, timezone
            ticket.first_responded_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(ai_comment)
        logger.info(f"AI Helpdesk Agent generated response for Ticket #{ticket.ticket_code}")
        return ai_comment
