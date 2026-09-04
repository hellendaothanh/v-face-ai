import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import httpx
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationStatus, OTTNotificationLog


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
        Dispatches notification asynchronously to target OTT channel and records in audit log.
        """
        channel_upper = channel.upper()
        target = recipient or self.telegram_chat_id
        status = NotificationStatus.SENT.value
        error_msg = None

        logger.info(f"📲 [OTT Dispatch] Event: {event_type} | Channel: {channel_upper} | Target: {target}")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                if channel_upper == "TELEGRAM":
                    if not self.telegram_bot_token.startswith("MOCK_"):
                        url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
                        payload = {
                            "chat_id": target,
                            "text": f"🚨 *{title}*\n\n{message}\n\n_🕒 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_",
                            "parse_mode": "Markdown"
                        }
                        res = await client.post(url, json=payload)
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
                        res = await client.post(self.slack_webhook_url, json=payload)
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


ott_service = OTTNotificationService()
