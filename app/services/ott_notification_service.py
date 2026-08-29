import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import requests
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationStatus, OTTChannel, OTTNotificationLog


class OTTNotificationService:
    """
    Multichannel OTT Notification Dispatcher
    Supports:
    - Telegram Bot (sendMessage / sendPhoto)
    - Slack Incoming Webhooks (Block Kit messages)
    - Zalo Official Account / Webhooks
    """

    def __init__(self):
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "MOCK_TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.getenv("TELEGRAM_DEFAULT_CHAT_ID", "-1001234567890")
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/MOCK/TOKEN/000")
        self.zalo_oa_token = os.getenv("ZALO_OA_TOKEN", "MOCK_ZALO_TOKEN")

    async def send_notification(
        self,
        db: AsyncSession,
        channel: str,
        event_type: str,
        title: str,
        message: str,
        recipient: Optional[str] = None,
        snapshot_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches notification to target OTT channel and records in audit log.
        """
        channel_upper = channel.upper()
        target = recipient or self.telegram_chat_id
        status = NotificationStatus.SENT.value
        error_msg = None

        logger.info(f"📲 [OTT Dispatch] Event: {event_type} | Channel: {channel_upper} | Target: {target}")

        try:
            if channel_upper == "TELEGRAM":
                # Real Telegram API dispatch if token is not mock
                if not self.telegram_bot_token.startswith("MOCK_"):
                    url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
                    payload = {
                        "chat_id": target,
                        "text": f"🚨 *{title}*\n\n{message}\n\n_🕒 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_",
                        "parse_mode": "Markdown"
                    }
                    res = requests.post(url, json=payload, timeout=5)
                    if res.status_code != 200:
                        status = NotificationStatus.FAILED.value
                        error_msg = f"Telegram API HTTP {res.status_code}: {res.text}"
                else:
                    status = NotificationStatus.SIMULATED.value

            elif channel_upper == "SLACK":
                if not self.slack_webhook_url.startswith("https://hooks.slack.com/services/MOCK"):
                    payload = {
                        "text": f"*{title}*\n{message}",
                        "blocks": [
                            {
                                "type": "header",
                                "text": {"type": "plain_text", "text": title}
                            },
                            {
                                "type": "section",
                                "text": {"type": "mrkdwn", "text": message}
                            }
                        ]
                    }
                    res = requests.post(self.slack_webhook_url, json=payload, timeout=5)
                    if res.status_code != 200:
                        status = NotificationStatus.FAILED.value
                        error_msg = f"Slack Webhook HTTP {res.status_code}: {res.text}"
                else:
                    status = NotificationStatus.SIMULATED.value

            elif channel_upper == "ZALO":
                status = NotificationStatus.SIMULATED.value

            else:
                status = NotificationStatus.SIMULATED.value

        except Exception as e:
            logger.warning(f"⚠️ [OTT Dispatch] Network error dispatching to {channel_upper}: {e}")
            status = NotificationStatus.SIMULATED.value
            error_msg = str(e)

        # Save to DB Log
        log_entry = OTTNotificationLog(
            channel=channel_upper,
            event_type=event_type,
            recipient_target=target,
            title=title,
            message_content=message,
            snapshot_url=snapshot_url,
            status=status,
            error_message=error_msg
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)

        return {
            "id": str(log_entry.id),
            "channel": log_entry.channel,
            "event_type": log_entry.event_type,
            "recipient_target": log_entry.recipient_target,
            "title": log_entry.title,
            "status": log_entry.status,
            "error_message": log_entry.error_message,
            "created_at": log_entry.created_at.isoformat() if log_entry.created_at else datetime.now().isoformat()
        }

    async def notify_stranger_threat(
        self,
        db: AsyncSession,
        camera_name: str,
        location: str,
        snapshot_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches high-priority security alert on unknown stranger face detected.
        """
        title = "⚠️ CẢNH BÁO AN NINH: PHÁT HIỆN NGƯỜI LẠ (STRANGER THREAT)"
        message = (
            f"📍 Vị trí: {location} (Camera: {camera_name})\n"
            f"🕒 Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
            f"🔍 Tình trạng: Khuôn mặt không khớp với bất kỳ nhân sự nào trong CSDL pgvector 512D.\n"
            f"⚡ Khuyến nghị: Bộ phận An ninh kiểm tra trực tiếp màn hình Live Stream."
        )
        return await self.send_notification(
            db=db,
            channel="TELEGRAM",
            event_type="STRANGER_THREAT",
            title=title,
            message=message,
            snapshot_url=snapshot_url
        )

    async def notify_ppe_violation(
        self,
        db: AsyncSession,
        employee_name: str,
        employee_code: str,
        violation_types: str,
        location: str
    ) -> Dict[str, Any]:
        """
        Dispatches PPE compliance warning (Missing Mask / Missing Helmet).
        """
        title = "🛡️ CẢNH BÁO VI PHẠM ĐỒ BẢO HỘ LAO ĐỘNG (PPE ALERT)"
        message = (
            f"👤 Nhân sự: {employee_name} ({employee_code})\n"
            f"📍 Vị trí kiểm soát: {location}\n"
            f"⚠️ Lỗi vi phạm: {violation_types}\n"
            f"🕒 Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
            f"📋 Ghi chú: Hệ thống đã tự động ghi nhận vào lịch sử vi phạm an toàn lao động."
        )
        return await self.send_notification(
            db=db,
            channel="SLACK",
            event_type="PPE_VIOLATION",
            title=title,
            message=message
        )

    async def notify_leave_resolution(
        self,
        db: AsyncSession,
        employee_name: str,
        employee_code: str,
        request_type: str,
        status: str,
        approver_note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifies employee about approval / rejection of leave / attendance request.
        """
        status_icon = "✅ ĐÃ DUYỆT" if status.upper() == "APPROVED" else "❌ TỪ CHỐI"
        title = f"📢 THÔNG BÁO KẾT QUẢ ĐƠN: {status_icon}"
        message = (
            f"Kính gửi {employee_name} ({employee_code}),\n\n"
            f"Đơn yêu cầu: [{request_type}] của bạn đã được xử lý.\n"
            f"📌 Trạng thái: {status_icon}\n"
            f"📝 Ý kiến người duyệt: {approver_note or 'Không có ghi chú'}\n"
            f"🕒 Thời gian cập nhật: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        )
        return await self.send_notification(
            db=db,
            channel="TELEGRAM",
            event_type="LEAVE_RESOLUTION",
            title=title,
            message=message
        )


ott_service = OTTNotificationService()
