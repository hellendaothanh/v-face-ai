import asyncio
import base64
import time
import uuid
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import numpy as np
import cv2
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.common import ResponseBase
from app.schemas.face import FaceRegisterResponse
from app.services.attendance_service import attendance_service
from app.services.stream_processor import stream_processor

router = APIRouter(prefix="/camera", tags=["Camera Stream"])


class CameraStartRequest(BaseModel):
    source_type: Optional[Literal["WEBCAM", "RTSP"]] = Field(
        default="WEBCAM",
        description="Nguồn camera: 'WEBCAM' (Camera máy tính / Built-in Webcam) hoặc 'RTSP' (Camera Tapo C200)"
    )
    webcam_index: Optional[int] = Field(
        default=0,
        description="Chỉ số webcam tích hợp (mặc định 0 là Camera mặc định trên máy tính)"
    )
    rtsp_url: Optional[str] = Field(
        None,
        description="Đường dẫn luồng RTSP (VD: rtsp://user:pass@192.168.1.100:554/stream1)"
    )
    device_id: Optional[str] = Field(
        None,
        description="Mã định danh thiết bị (VD: PC_WEBCAM hoặc TAPO_C200_GATE)"
    )


@router.post(
    "/start",
    response_model=ResponseBase[dict],
    summary="Khởi động luồng Camera (Webcam máy tính hoặc Tapo C200)"
)
async def start_camera_stream(payload: Optional[CameraStartRequest] = None):
    source_type = payload.source_type if payload and payload.source_type else settings.CAMERA_DEFAULT_SOURCE
    webcam_index = payload.webcam_index if payload and payload.webcam_index is not None else settings.WEBCAM_INDEX
    rtsp_url = payload.rtsp_url if payload and payload.rtsp_url else settings.RTSP_URL
    device_id = payload.device_id if payload and payload.device_id else None

    started = stream_processor.start(
        source_type=source_type,
        webcam_index=webcam_index,
        rtsp_url=rtsp_url,
        device_id=device_id
    )

    if not started:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể khởi động luồng camera nguồn {source_type}."
        )

    return ResponseBase(
        success=True,
        message=f"Đã khởi động Camera [{source_type}] và tiến trình AI nhận diện.",
        data=stream_processor.get_status()
    )


@router.post(
    "/stop",
    response_model=ResponseBase[dict],
    summary="Dừng luồng Camera"
)
async def stop_camera_stream():
    await stream_processor.stop()
    return ResponseBase(
        success=True,
        message="Đã dừng luồng camera.",
        data=stream_processor.get_status()
    )


@router.get(
    "/status",
    response_model=ResponseBase[dict],
    summary="Lấy thông số chẩn đoán & nguồn Camera hiện tại"
)
async def get_camera_status():
    status_data = stream_processor.get_status()
    return ResponseBase(
        success=True,
        message="Lấy trạng thái camera thành công",
        data=status_data
    )


@router.post(
    "/snapshot",
    response_model=ResponseBase[dict],
    summary="Chụp ảnh trực tiếp từ luồng Camera Backend đang chạy"
)
async def capture_snapshot():
    """
    Chụp một khung hình từ nguồn camera đang mở ở Backend (tránh xung đột thiết bị với trình duyệt).
    """
    if not stream_processor._is_running or not stream_processor.stream_reader:
        # Auto start camera if not running
        stream_processor.start()
        await asyncio.sleep(0.5)

    has_frame, frame_bgr, _ = stream_processor.stream_reader.get_latest_frame()
    if not has_frame or frame_bgr is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera chưa sẵn sàng hoặc không có khung hình."
        )

    ret, jpeg = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi mã hóa ảnh chụp."
        )

    base64_str = base64.b64encode(jpeg.tobytes()).decode("utf-8")
    return ResponseBase(
        success=True,
        message="Đã chụp ảnh từ luồng camera thành công.",
        data={
            "image_base64": f"data:image/jpeg;base64,{base64_str}",
            "device_id": stream_processor.stream_reader.device_id
        }
    )


@router.post(
    "/register-face/{employee_id}",
    response_model=ResponseBase[FaceRegisterResponse],
    summary="Đăng ký khuôn mặt trực tiếp từ luồng Camera đang chạy"
)
async def register_face_from_live_camera(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Tự động chụp khung hình từ camera đang chạy ở Backend, trích xuất vector 512 chiều
    và lưu trực tiếp vào hồ sơ nhân viên.
    """
    if not stream_processor._is_running or not stream_processor.stream_reader:
        stream_processor.start()
        await asyncio.sleep(0.5)

    has_frame, frame_bgr, _ = stream_processor.stream_reader.get_latest_frame()
    if not has_frame or frame_bgr is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera chưa sẵn sàng hoặc không đọc được khung hình."
        )

    ret, jpeg = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not ret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi chuyển đổi ảnh chụp."
        )

    image_bytes = jpeg.tobytes()
    filename = f"live_cam_{int(time.time())}.jpg"

    response_data = await attendance_service.register_employee_faces(
        db=db,
        employee_id=employee_id,
        image_files=[(filename, image_bytes)]
    )

    return ResponseBase(
        success=response_data.total_registered > 0,
        message=(
            f"Đã đăng ký thành công vector khuôn mặt từ camera trực tiếp!"
            if response_data.total_registered > 0
            else "Không phát hiện khuôn mặt rõ nét trong ảnh camera. Vui lòng nhìn thẳng vào camera và thử lại."
        ),
        data=response_data
    )


def _generate_video_mjpeg():
    """Generator for streaming live MJPEG frames from the active camera."""
    while True:
        if not stream_processor._is_running or not stream_processor.stream_reader:
            placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(
                placeholder,
                "Camera Dang Tat / Nhan Bat Camera",
                (90, 240),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (100, 116, 139),
                2,
                cv2.LINE_AA
            )
            ret, jpeg = cv2.imencode(".jpg", placeholder)
            frame_bytes = jpeg.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.5)
            continue

        has_frame, frame_bgr, _ = stream_processor.get_latest_annotated_frame()
        if not has_frame or frame_bgr is None:
            time.sleep(0.02)
            continue

        h, w = frame_bgr.shape[:2]
        if w > 1280:
            scale = 1280 / w
            frame_bgr = cv2.resize(frame_bgr, (int(w * scale), int(h * scale)))

        ret, jpeg = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 75])
        if not ret:
            time.sleep(0.02)
            continue

        frame_bytes = jpeg.tobytes()
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
        time.sleep(0.03)


@router.get(
    "/video_feed",
    summary="Xem trực tiếp luồng Video MJPEG từ Camera (Live Feed)"
)
def live_video_feed():
    return StreamingResponse(
        _generate_video_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
