import json
from loguru import logger
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/attendance")
async def websocket_attendance_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for Frontend clients to receive live real-time attendance events.
    Frontend connects to: ws://localhost:8000/ws/attendance (or ws://localhost:8000/api/v1/ws/attendance)
    """
    await ws_manager.connect(websocket)

    # Send welcome message
    await ws_manager.send_personal_message(
        {
            "event": "CONNECTION_ESTABLISHED",
            "message": "Connected to V-Face Attendance Realtime WebSocket Stream."
        },
        websocket
    )

    try:
        while True:
            # Keep connection open and handle incoming ping messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws_manager.send_personal_message({"type": "pong"}, websocket)
            except Exception:
                # Raw text ping/pong
                if data.strip().lower() == "ping":
                    await ws_manager.send_personal_message({"type": "pong"}, websocket)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(websocket)
