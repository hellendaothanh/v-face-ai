from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.notification import OTTNotificationLog
from app.schemas.common import ResponseBase
from app.services.ott_notification_service import ott_service

router = APIRouter(prefix="/notifications", tags=["OTT Bot Notifications (Telegram / Slack / Zalo)"])


class OTTTestRequest(BaseModel):
    channel: str = Field(default="TELEGRAM", description="Kênh gửi: TELEGRAM, SLACK, ZALO, ALL")
    event_type: str = Field(default="STRANGER_THREAT", description="Loại sự kiện: STRANGER_THREAT, PPE_VIOLATION, LEAVE_RESOLUTION")
    title: str = Field(default="Cảnh Báo Kiểm Tra Kết Nối OTT Bot", description="Tiêu đề thông báo")
    message: str = Field(default="Hệ thống V-Face AI đã thiết lập kết nối thành công với Bot Gateway.", description="Nội dung thông báo")
    recipient: Optional[str] = Field(default=None, description="Chat ID hoặc Webhook URL mục tiêu")


@router.post("/ott/test", response_model=ResponseBase[Dict[str, Any]], summary="Bắn tin nhắn thử nghiệm qua OTT Gateway")
async def send_test_ott_notification(
    payload: OTTTestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Kích hoạt gửi tin nhắn cảnh báo mẫu qua kênh Telegram / Slack / Zalo để kiểm tra tích hợp.
    """
    res = await ott_service.send_notification(
        db=db,
        channel=payload.channel,
        event_type=payload.event_type,
        title=payload.title,
        message=payload.message,
        recipient=payload.recipient
    )
    return ResponseBase(
        success=True,
        message=f"Đã phát lệnh gửi thông báo OTT qua kênh {payload.channel}",
        data=res
    )


@router.get("/ott/history", response_model=ResponseBase[List[Dict[str, Any]]], summary="Lấy lịch sử thông báo OTT")
async def get_ott_history(
    limit: int = Query(default=50, ge=1, le=200),
    channel: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Truy xuất danh sách lịch sử tin nhắn cảnh báo đã phát đi qua Telegram, Slack và Zalo.
    """
    stmt = select(OTTNotificationLog).order_by(OTTNotificationLog.created_at.desc()).limit(limit)
    if channel:
        stmt = stmt.where(OTTNotificationLog.channel == channel.upper())

    result = await db.execute(stmt)
    logs = result.scalars().all()

    data = [
        {
            "id": str(l.id),
            "channel": l.channel,
            "event_type": l.event_type,
            "recipient_target": l.recipient_target,
            "title": l.title,
            "message_content": l.message_content,
            "snapshot_url": l.snapshot_url,
            "status": l.status,
            "error_message": l.error_message,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]

    return ResponseBase(
        success=True,
        message=f"Lấy {len(data)} bản ghi lịch sử thông báo OTT",
        data=data
    )
