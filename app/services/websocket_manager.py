import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Set
from loguru import logger
from fastapi import WebSocket


class WebSocketManager:
    """
    Manages active WebSocket connections and broadcasts real-time attendance events to frontends.
    """

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active clients: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        Broadcasts a generic JSON message (such as STRANGER_ALERT or SPOOFING_ALERT) to all connected clients.
        """
        if not self.active_connections:
            return

        json_str = json.dumps(message, default=str)
        stale_connections = []

        async with self._lock:
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(json_str)
                except Exception as e:
                    logger.warning(f"Error sending message to WebSocket client: {e}")
                    stale_connections.append(connection)

            for stale in stale_connections:
                self.active_connections.discard(stale)

    async def broadcast_attendance(self, data: Dict[str, Any]) -> None:
        """
        Broadcasts an attendance event to all connected clients.
        """
        if not self.active_connections:
            return

        message = {
            "event": "ATTENDANCE_CHECKIN",
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }

        json_str = json.dumps(message, default=str)
        stale_connections = []

        async with self._lock:
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(json_str)
                except Exception as e:
                    logger.warning(f"Error sending message to WebSocket client: {e}")
                    stale_connections.append(connection)

            for stale in stale_connections:
                self.active_connections.discard(stale)

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.warning(f"Failed to send personal WS message: {e}")


ws_manager = WebSocketManager()
