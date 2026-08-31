import os
from contextlib import asynccontextmanager
from loguru import logger
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import VFaceException
from app.database.session import init_db, seed_sample_employees, seed_sample_offices
from app.services.camera_manager import camera_manager
from app.services.face_engine import face_engine
from app.services.stream_processor import stream_processor
from app.services.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Events:
    - Startup: Initialize PostgreSQL vector extension and tables, pre-load AI models, initialize multi-camera manager.
    - Shutdown: Clean up resources and stop stream processing threads.
    """
    logger.info("==================================================")
    logger.info(f"Starting {settings.PROJECT_NAME}...")
    logger.info("==================================================")

    # 1. Ensure storage directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "faces"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "camera_snapshots"), exist_ok=True)

    # 2. Initialize Database & pgvector
    try:
        await init_db()
        await seed_sample_employees()
        await seed_sample_offices()
        logger.info("Database & pgvector extension checked successfully.")
    except Exception as e:
        logger.error(f"Database initialization error (check PostgreSQL container): {e}")

    # 3. Pre-load InsightFace AI Engine into memory
    try:
        face_engine.initialize()
        logger.info("AI Face Engine warm-up completed.")
    except Exception as e:
        logger.warning(f"AI Face Engine initialization warning: {e}")

    # 4. Initialize Multi-Device Camera Manager
    try:
        await camera_manager.initialize()
        logger.info("Multi-Device Camera Manager initialized.")
    except Exception as e:
        logger.warning(f"Camera Manager startup notice: {e}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    await camera_manager.shutdown()
    await stream_processor.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hệ thống chấm công bằng nhận diện khuôn mặt sử dụng FastAPI, PostgreSQL pgvector, InsightFace ArcFace 512D, RTSP Stream & Realtime WebSocket.",
    version="1.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://localhost:8001",
        "*"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Custom Exception Handler
@app.exception_handler(VFaceException)
async def vface_exception_handler(request: Request, exc: VFaceException):
    return JSONResponse(
        status_code=exc.status_code,
        headers={"Access-Control-Allow-Origin": "*"},
        content={
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"Access-Control-Allow-Origin": "*"},
        content={
            "success": False,
            "message": f"Internal Server Error: {str(exc)}",
            "data": str(exc) if settings.DEBUG else None
        }
    )


# WebSocket root endpoint: /ws/attendance
@app.websocket("/ws/attendance")
async def root_websocket_attendance(websocket: WebSocket):
    """
    Direct root WebSocket endpoint for Frontend clients to receive live attendance events.
    Connect to: ws://localhost:8000/ws/attendance
    """
    await ws_manager.connect(websocket)
    await ws_manager.send_personal_message(
        {
            "event": "CONNECTION_ESTABLISHED",
            "message": "Connected to V-Face Attendance Realtime WebSocket Stream."
        },
        websocket
    )
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await ws_manager.send_personal_message({"type": "pong"}, websocket)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client disconnected/error: {e}")
        await ws_manager.disconnect(websocket)


# Include API V1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "ai_model": settings.FACE_MODEL_NAME,
        "camera_running": stream_processor._is_running,
        "active_ws_clients": len(ws_manager.active_connections)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
