from typing import List, Literal, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Server Settings
    PROJECT_NAME: str = "V-Face Attendance API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORE_USER_SERVICE_URL: str = "http://127.0.0.1:8001/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = ["*"]

    # PostgreSQL Database
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres123"
    POSTGRES_DB: str = "vface_db"

    @property
    def ASYNC_DATABASE_URI(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URI(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # AI Face Recognition (InsightFace / ArcFace / RetinaFace)
    FACE_MODEL_NAME: str = "buffalo_l"
    FACE_MODEL_PROVIDERS: List[str] = ["CoreMLExecutionProvider", "CPUExecutionProvider"]
    FACE_SIMILARITY_THRESHOLD: float = 0.60
    FACE_DETECTION_MIN_SCORE: float = 0.75
    FACE_EMBEDDING_DIM: int = 512
    MAX_IMAGE_SIZE_MB: int = 10

    # Dual Camera Sources (1. Built-in PC/Laptop Webcam / 2. Tapo C200 RTSP)
    CAMERA_DEFAULT_SOURCE: Literal["WEBCAM", "RTSP"] = "WEBCAM"
    WEBCAM_INDEX: int = 0  # 0 is the default built-in PC/Laptop Webcam
    WEBCAM_DEVICE_ID: str = "PC_WEBCAM"

    # Tapo C200 RTSP Stream Settings (Format: rtsp://username:password@ip:port/stream1)
    RTSP_URL: str = "rtsp://admin:admin123@192.168.1.100:554/stream1"
    RTSP_DEVICE_ID: str = "TAPO_C200_GATE"

    # Realtime AI Pipeline & Camera Settings
    CAMERA_FRAME_SKIP: int = 3  # Process 1 frame every 3 frames for responsive M4 real-time tracking
    CAMERA_MIN_FACE_SIZE: int = 60  # Minimum face width & height (pixels)
    CAMERA_BLUR_THRESHOLD: float = 15.0  # Motion Blur Filter: Laplacian variance threshold (only filter extreme motion blur < 15.0)
    CAMERA_SIMILARITY_THRESHOLD: float = 0.58  # Standard ArcFace Cosine Similarity Threshold
    CAMERA_COOLDOWN_SECONDS: int = 300  # 5 minutes cooldown per employee
    CAMERA_AUTO_START: bool = False  # Start camera stream automatically on startup
    FACE_RECOGNITION_TOP_K: int = 5  # Number of top candidate templates to inspect

    # Face Anti-Spoofing & Liveness Detection
    LIVENESS_ENABLED: bool = True
    LIVENESS_THRESHOLD: float = 0.35  # Score >= 0.35 is real face, < 0.35 is spoof (Optimized for RTSP & Webcam)
    LIVENESS_MODEL_PATH: str = "./models/anti_spoofing/MiniFASNetV2.onnx"

    # Stranger Alert (Phát hiện & Cảnh báo người lạ)
    STRANGER_ALERT_ENABLED: bool = True
    STRANGER_CONFIDENCE_THRESHOLD: float = 0.70  # Match confidence < 70% coi là người lạ
    STRANGER_CONSECUTIVE_FRAMES: int = 3  # Xuất hiện liên tiếp 3 khung hình
    STRANGER_COOLDOWN_SECONDS: int = 60  # Cooldown 1 phút giữa các lần cảnh báo

    # Storage
    UPLOAD_DIR: str = "./uploads"

    @field_validator("FACE_MODEL_PROVIDERS", mode="before")
    @classmethod
    def assemble_providers(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return [p.strip() for p in v.split(",") if p.strip()]
        return v


settings = Settings()
