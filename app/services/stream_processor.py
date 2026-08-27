import asyncio
import base64
from datetime import datetime, timezone
import io
import os
import threading
import time
from typing import Any, Dict, List, Literal, Optional, Tuple
import uuid
from loguru import logger
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.liveness_detector import liveness_detector
from app.database.session import AsyncSessionLocal
from app.models.attendance import AttendanceRecord, AttendanceType
from app.models.employee import Employee
from app.models.face_feature import FaceFeature
from app.services.attendance_service import attendance_service
from app.services.camera_stream import CameraStreamReader
from app.services.face_engine import ExtractedFace, face_engine
# Unicode Font Cache for Vietnamese text rendering
_FONT_CACHE: Dict[int, ImageFont.FreeTypeFont] = {}


def _get_unicode_font(size: int = 16) -> ImageFont.FreeTypeFont:
    """Loads system TrueType font with full Vietnamese Unicode diacritics support."""
    if size in _FONT_CACHE:
        return _FONT_CACHE[size]
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                f = ImageFont.truetype(p, size)
                _FONT_CACHE[size] = f
                return f
            except Exception:
                continue
    f = ImageFont.load_default()
    _FONT_CACHE[size] = f
    return f


class VideoStreamProcessor:
    """
    Real-time background worker for processing video streams from either:
    1. MacBook Built-in Webcam (macOS AVFoundation)
    2. Tapo C200 RTSP Stream

    Key Optimizations:
    - Multi-Face Tracking & Concurrent Attendance (detects and checks in 3-4 people in parallel).
    - Auto Face Update / Continuous Learning (updates newest vector when confidence > 95%).
    - OpenCV Laplacian Variance Motion Blur Filter (skips blurry frames to prevent false matches).
    - Multi-template Cosine Distance search via PostgreSQL pgvector.
    - Anti-Spoofing / Face Liveness Detection (MiniFASNetV2 ONNX + Moire FFT).
    - Stranger Alert detection with 3-frame counter and 60s cooldown.
    - Live MJPEG stream with dynamic Bounding Box & Name overlay.
    """

    def __init__(self):
        self.stream_reader: Optional[CameraStreamReader] = None
        self._is_running = False
        self._task: Optional[asyncio.Task] = None

        # Cooldown map: employee_id -> expiry_timestamp
        self._cooldown_map: Dict[uuid.UUID, float] = {}

        # Processing stats & diagnostic counters
        self.processed_frames = 0
        self.detected_faces_count = 0
        self.blurred_faces_skipped = 0
        self.spoofed_faces_rejected = 0
        self.successful_checkins_count = 0
        self.auto_face_updates_count = 0

        # Stranger Alert (Phát hiện và cảnh báo người lạ)
        self.stranger_counter: int = 0
        self.last_stranger_alert_time: float = 0.0
        self.stranger_alerts_count: int = 0

        # Live Annotated Frame Buffer for MJPEG Feed (With Bounding Boxes)
        self._annotated_frame: Optional[np.ndarray] = None
        self._annotated_lock = threading.Lock()
        self._last_annotated_time: float = 0.0

    def start(
        self,
        source_type: Optional[Literal["WEBCAM", "RTSP"]] = None,
        webcam_index: Optional[int] = None,
        rtsp_url: Optional[str] = None,
        device_id: Optional[str] = None
    ) -> bool:
        """Starts camera stream reader and background processing task."""
        if self._is_running:
            logger.info("Video stream processor is already running. Stopping previous source first...")
            self.stop_sync()

        source = source_type or settings.CAMERA_DEFAULT_SOURCE
        wb_index = webcam_index if webcam_index is not None else settings.WEBCAM_INDEX
        url = rtsp_url or settings.RTSP_URL
        
        if source == "WEBCAM":
            dev_id = device_id or settings.WEBCAM_DEVICE_ID
        else:
            dev_id = device_id or settings.RTSP_DEVICE_ID

        self.stream_reader = CameraStreamReader(
            source_type=source,
            webcam_index=wb_index,
            rtsp_url=url,
            device_id=dev_id
        )
        self.stream_reader.start()

        self._is_running = True
        self._task = asyncio.create_task(self._processing_loop())
        logger.info(
            f"Video stream processor started for '{dev_id}' ({source}) with "
            f"Multi-Face Concurrent Attendance, Auto-Learning (>95%), "
            f"Blur Threshold={settings.CAMERA_BLUR_THRESHOLD}."
        )
        return True

    def stop_sync(self) -> None:
        """Synchronously stops stream reader."""
        self._is_running = False
        if self.stream_reader:
            self.stream_reader.stop()
            self.stream_reader = None
        if self._task:
            self._task.cancel()
            self._task = None

    async def stop(self) -> None:
        """Stops the stream processor gracefully."""
        self._is_running = False
        if self.stream_reader:
            self.stream_reader.stop()
            self.stream_reader = None

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Video stream processor stopped.")

    def get_status(self) -> Dict[str, Any]:
        """Returns overall stream status and diagnostic metrics."""
        return self.get_diagnostics()

    def get_diagnostics(self) -> Dict[str, Any]:
        """Detailed system telemetry for health inspection and debugging."""
        reader_status = {
            "source_type": self.stream_reader.source_type if self.stream_reader else None,
            "device_id": self.stream_reader.device_id if self.stream_reader else None,
            "is_connected": self.stream_reader.is_connected if self.stream_reader else False,
            "fps": self.stream_reader.fps if self.stream_reader else 0.0,
            "total_frames_read": self.stream_reader.total_frames_read if self.stream_reader else 0,
            "webcam_index": self.stream_reader.webcam_index if self.stream_reader else None,
            "rtsp_url": self.stream_reader.rtsp_url if self.stream_reader else None,
        }

        return {
            "is_running": self._is_running,
            "camera": reader_status,
            "frame_skip": settings.CAMERA_FRAME_SKIP,
            "min_face_size": settings.CAMERA_MIN_FACE_SIZE,
            "blur_threshold": settings.CAMERA_BLUR_THRESHOLD,
            "similarity_threshold": settings.CAMERA_SIMILARITY_THRESHOLD,
            "similarity_threshold_percent": f"{settings.CAMERA_SIMILARITY_THRESHOLD * 100:.1f}%",
            "cooldown_seconds": settings.CAMERA_COOLDOWN_SECONDS,
            "processed_frames": self.processed_frames,
            "detected_faces_count": self.detected_faces_count,
            "blurred_faces_skipped": self.blurred_faces_skipped,
            "spoofed_faces_rejected": self.spoofed_faces_rejected,
            "successful_checkins_count": self.successful_checkins_count,
            "auto_face_updates_count": self.auto_face_updates_count,
            "stranger_alerts_count": self.stranger_alerts_count,
            "stranger_counter": self.stranger_counter,
            "stranger_cooldown_remaining": max(0, int(settings.STRANGER_COOLDOWN_SECONDS - (time.time() - self.last_stranger_alert_time))),
            "liveness_enabled": settings.LIVENESS_ENABLED,
            "liveness_threshold": settings.LIVENESS_THRESHOLD,
            "active_cooldowns": len([k for k, v in self._cooldown_map.items() if v > time.time()])
        }

    def _is_in_cooldown(self, employee_id: uuid.UUID) -> bool:
        """Checks whether the employee is still in cooldown period."""
        now = time.time()
        expiry = self._cooldown_map.get(employee_id, 0.0)
        if now < expiry:
            return True
        return False

    def _set_cooldown(self, employee_id: uuid.UUID) -> None:
        """Sets the cooldown period (e.g. 300 seconds / 5 minutes) for the employee."""
        self._cooldown_map[employee_id] = time.time() + settings.CAMERA_COOLDOWN_SECONDS

    def _clean_expired_cooldowns(self) -> None:
        """Removes expired cooldown entries to prevent memory growth."""
        now = time.time()
        self._cooldown_map = {k: v for k, v in self._cooldown_map.items() if v > now}

    def _set_annotated_frame(self, canvas: np.ndarray) -> None:
        """Updates the annotated canvas for live MJPEG streaming with Bounding Boxes."""
        with self._annotated_lock:
            self._annotated_frame = canvas
            self._last_annotated_time = time.time()

    def get_latest_annotated_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Gets the newest annotated frame (or raw stream frame if not ready)."""
        with self._annotated_lock:
            if self._annotated_frame is not None and (time.time() - self._last_annotated_time) < 1.0:
                return True, self._annotated_frame.copy(), self._last_annotated_time

        if self.stream_reader:
            return self.stream_reader.get_latest_frame()
        return False, None, 0.0

    @staticmethod
    def _encode_image_base64(bgr_image: np.ndarray, quality: int = 80) -> str:
        """Converts BGR image numpy array to compressed JPEG Base64 data URI."""
        try:
            rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_image)
            buffered = io.BytesIO()
            pil_img.save(buffered, format="JPEG", quality=quality, optimize=True)
            encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
            return f"data:image/jpeg;base64,{encoded}"
        except Exception as e:
            logger.warning(f"Failed to encode image to base64: {e}")
            return ""

    @classmethod
    def _draw_hud_box(
        cls,
        canvas: np.ndarray,
        bbox: Tuple[int, int, int, int],
        label: str,
        sub_label: Optional[str] = None,
        color_bgr: Tuple[int, int, int] = (52, 211, 153),
        is_highlight: bool = False
    ) -> None:
        """Draws high-tech bounding box and name tag on live camera frame with full Vietnamese Unicode support."""
        try:
            x1, y1, x2, y2 = bbox
            h, w = canvas.shape[:2]
            x1, y1 = max(0, int(x1)), max(0, int(y1))
            x2, y2 = min(w - 1, int(x2)), min(h - 1, int(y2))

            thickness = 3 if is_highlight else 2
            # 1. Bounding Box & Corner accents via OpenCV
            cv2.rectangle(canvas, (x1, y1), (x2, y2), color_bgr, thickness)

            corner_len = min(20, (x2 - x1) // 4)
            cv2.line(canvas, (x1, y1), (x1 + corner_len, y1), color_bgr, thickness + 1)
            cv2.line(canvas, (x1, y1), (x1, y1 + corner_len), color_bgr, thickness + 1)
            cv2.line(canvas, (x2, y1), (x2 - corner_len, y1), color_bgr, thickness + 1)
            cv2.line(canvas, (x2, y1), (x2, y1 + corner_len), color_bgr, thickness + 1)
            cv2.line(canvas, (x1, y2), (x1 + corner_len, y2), color_bgr, thickness + 1)
            cv2.line(canvas, (x1, y2), (x1, y2 - corner_len), color_bgr, thickness + 1)
            cv2.line(canvas, (x2, y2), (x2 - corner_len, y2), color_bgr, thickness + 1)
            cv2.line(canvas, (x2, y2), (x2, y2 - corner_len), color_bgr, thickness + 1)

            # 2. Text rendering with PIL for Full Vietnamese Diacritics (e.g. Trần Phúc Hậu)
            font_main = _get_unicode_font(17)
            font_sub = _get_unicode_font(13)

            # Convert BGR canvas to PIL Image
            canvas_rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(canvas_rgb)
            draw = ImageDraw.Draw(pil_img)

            # Header text bounding box
            color_rgb = (int(color_bgr[2]), int(color_bgr[1]), int(color_bgr[0]))
            text_bbox = draw.textbbox((0, 0), label, font=font_main)
            tw = text_bbox[2] - text_bbox[0]
            th = text_bbox[3] - text_bbox[1]

            bg_top = max(0, y1 - th - 12)
            # Draw header rectangle
            draw.rectangle([x1, bg_top, x1 + tw + 16, y1], fill=color_rgb)

            # Text color (dark on bright background, white on dark)
            is_bright = color_bgr in [(52, 211, 153), (0, 255, 128), (0, 255, 255), (250, 204, 21)]
            text_fill = (15, 23, 42) if is_bright else (255, 255, 255)
            draw.text((x1 + 8, bg_top + 3), label, font=font_main, fill=text_fill)

            # Optional Sub-label below box
            if sub_label:
                sub_bbox = draw.textbbox((0, 0), sub_label, font=font_sub)
                sw = sub_bbox[2] - sub_bbox[0]
                sh = sub_bbox[3] - sub_bbox[1]
                sub_y1 = min(h - 25, y2 + 2)
                sub_y2 = sub_y1 + sh + 8
                draw.rectangle([x1, sub_y1, x1 + sw + 12, sub_y2], fill=(15, 23, 42))
                draw.text((x1 + 6, sub_y1 + 3), sub_label, font=font_sub, fill=color_rgb)

            # Write back to OpenCV BGR canvas
            updated_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            canvas[:] = updated_bgr[:]
        except Exception as e:
            logger.debug(f"Error drawing HUD box: {e}")

    async def _processing_loop(self) -> None:
        """Main async loop pulling frames, running AI inference, and handling Multi-Face parallel check-in."""
        frame_counter = 0
        last_clean_time = time.time()

        while self._is_running:
            try:
                if not self.stream_reader or not self.stream_reader.is_connected:
                    await asyncio.sleep(0.3)
                    continue

                has_frame, frame_bgr, _ = self.stream_reader.get_latest_frame()
                if not has_frame or frame_bgr is None:
                    await asyncio.sleep(0.02)
                    continue

                frame_counter += 1
                # 1. Frame-skip optimization for M4
                if frame_counter % settings.CAMERA_FRAME_SKIP != 0:
                    await asyncio.sleep(0.01)
                    continue

                self.processed_frames += 1

                # Clean cooldown cache every 60 seconds
                if time.time() - last_clean_time > 60:
                    self._clean_expired_cooldowns()
                    last_clean_time = time.time()

                # 2. Face Detection & Quality Assessment
                faces = await asyncio.to_thread(
                    face_engine.extract_faces_from_bgr,
                    bgr_image=frame_bgr,
                    min_score=settings.FACE_DETECTION_MIN_SCORE
                )

                annotated_canvas = frame_bgr.copy()

                if not faces:
                    self._set_annotated_frame(annotated_canvas)
                    await asyncio.sleep(0.01)
                    continue

                self.detected_faces_count += len(faces)

                # Filter qualified faces
                qualified_faces: List[ExtractedFace] = []
                for face in faces:
                    x1, y1, x2, y2 = face.bbox
                    width = max(0, x2 - x1)
                    height = max(0, y2 - y1)

                    # Size Filter (ignore tiny distant noise < 60px)
                    if width < settings.CAMERA_MIN_FACE_SIZE or height < settings.CAMERA_MIN_FACE_SIZE:
                        continue

                    # Motion Blur Filter (only filter extreme blur < 10.0)
                    if face.blur_score < 10.0:
                        self.blurred_faces_skipped += 1
                        self._draw_hud_box(
                            canvas=annotated_canvas,
                            bbox=face.bbox,
                            label="Nhoe Chuyen Dong (Blur)",
                            color_bgr=(100, 116, 139)
                        )
                        continue

                    qualified_faces.append(face)

                if qualified_faces:
                    # 3. MULTI-FACE CONCURRENT PROCESSING (Nhận diện hàng loạt song song với asyncio.gather)
                    tasks = [
                        self._process_single_face(
                            frame_bgr=frame_bgr,
                            face=f,
                            annotated_canvas=annotated_canvas
                        )
                        for f in qualified_faces
                    ]
                    await asyncio.gather(*tasks, return_exceptions=True)

                self._set_annotated_frame(annotated_canvas)
                await asyncio.sleep(0.01)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in video processing loop: {e}", exc_info=True)
                await asyncio.sleep(0.5)

    async def _process_single_face(
        self,
        frame_bgr: np.ndarray,
        face: ExtractedFace,
        annotated_canvas: np.ndarray
    ) -> None:
        """
        Processes a single detected face in parallel:
        1. Anti-Spoofing Liveness check
        2. Multi-Template search in PostgreSQL
        3. Stranger Detection vs Auto Check-in
        4. Auto Face Update (Self-Learning when confidence > 95%)
        5. Draws HUD Bounding Box
        """
        x1, y1, x2, y2 = face.bbox
        h_f, w_f = frame_bgr.shape[:2]
        pad_x = int((x2 - x1) * 0.2)
        pad_y = int((y2 - y1) * 0.2)
        crop_x1 = max(0, int(x1 - pad_x))
        crop_y1 = max(0, int(y1 - pad_y))
        crop_x2 = min(w_f, int(x2 + pad_x))
        crop_y2 = min(h_f, int(y2 + pad_y))
        face_crop = frame_bgr[crop_y1:crop_y2, crop_x1:crop_x2]

        # Step 1: Anti-Spoofing Check
        if settings.LIVENESS_ENABLED:
            is_real, liveness_score = await asyncio.to_thread(
                liveness_detector.predict_liveness,
                face_crop
            )

            if not is_real:
                self.spoofed_faces_rejected += 1
                logger.warning(
                    f"🚨 [Anti-Spoofing Alert] Fake face blocked (Liveness={liveness_score:.3f} < {settings.LIVENESS_THRESHOLD})"
                )
                self._draw_hud_box(
                    canvas=annotated_canvas,
                    bbox=face.bbox,
                    label="GIA MAO (SPOOF)",
                    sub_label=f"Liveness: {liveness_score * 100:.0f}%",
                    color_bgr=(50, 50, 240),
                    is_highlight=True
                )
                await ws_manager.broadcast({
                    "event": "spoofing_alert",
                    "type": "SPOOFING_ALERT",
                    "message": "Cảnh báo: Phát hiện hành vi giả mạo bằng ảnh chụp hoặc màn hình điện thoại!",
                    "liveness_score": liveness_score,
                    "threshold": settings.LIVENESS_THRESHOLD,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "snapshot": self._encode_image_base64(face_crop, quality=70) if face_crop.size > 0 else ""
                })
                return

        # Step 2: Query pgvector Multi-template matching
        async with AsyncSessionLocal() as db:
            try:
                match_result = await attendance_service.match_face_multi_template(
                    db=db,
                    query_embedding=face.embedding,
                    min_similarity=None
                )

                is_stranger = False
                similarity = 0.0
                confidence_percent = 0.0
                matched_face = None
                matched_employee = None
                distance = 1.0

                if not match_result:
                    is_stranger = True
                else:
                    matched_face, matched_employee, distance, similarity = match_result
                    confidence_percent = round(similarity * 100.0, 2)
                    if similarity < settings.STRANGER_CONFIDENCE_THRESHOLD:
                        is_stranger = True

                # Step 3: Handle Stranger Detection
                if is_stranger:
                    self.stranger_counter += 1
                    self._draw_hud_box(
                        canvas=annotated_canvas,
                        bbox=face.bbox,
                        label="NGƯỜI LẠ (STRANGER)",
                        sub_label=f"Độ khớp: {confidence_percent:.0f}%",
                        color_bgr=(60, 60, 245),
                        is_highlight=True
                    )

                    if self.stranger_counter >= settings.STRANGER_CONSECUTIVE_FRAMES:
                        now = time.time()
                        if now - self.last_stranger_alert_time >= settings.STRANGER_COOLDOWN_SECONDS:
                            self.last_stranger_alert_time = now
                            self.stranger_alerts_count += 1
                            current_time_str = datetime.now().strftime("%H:%M:%S")

                            logger.warning(
                                f"🚨 [Stranger Alert] Detected unknown stranger ({self.stranger_counter} frames). Broadcasting alert..."
                            )
                            await ws_manager.broadcast({
                                "event": "stranger_alert",
                                "type": "STRANGER_ALERT",
                                "message": "Phát hiện người lạ xuất hiện tại khu vực cửa vào",
                                "timestamp": current_time_str,
                                "iso_timestamp": datetime.now(timezone.utc).isoformat(),
                                "confidence": confidence_percent,
                                "snapshot": self._encode_image_base64(face_crop, quality=75) if face_crop.size > 0 else ""
                            })
                    return

                # Valid Employee Recognized -> Reset stranger counter immediately
                self.stranger_counter = 0

                src_type = self.stream_reader.source_type if self.stream_reader else "WEBCAM"
                dev_id = self.stream_reader.device_id if self.stream_reader else "CAMERA_AI"

                # Check Cooldown
                if self._is_in_cooldown(matched_employee.id):
                    self._draw_hud_box(
                        canvas=annotated_canvas,
                        bbox=face.bbox,
                        label=f"{matched_employee.full_name}",
                        sub_label="Đã điểm danh (Cooldown)",
                        color_bgr=(245, 158, 11)  # Amber
                    )
                    return

                # Set cooldown
                self._set_cooldown(matched_employee.id)

                # Save Snapshot to disk
                date_str = datetime.now().strftime("%Y-%m-%d")
                snapshot_dir = os.path.join(settings.UPLOAD_DIR, "camera_snapshots", date_str)
                os.makedirs(snapshot_dir, exist_ok=True)
                snapshot_filename = f"{uuid.uuid4().hex[:12]}_{matched_employee.employee_code}.jpg"
                snapshot_path = os.path.join(snapshot_dir, snapshot_filename)

                try:
                    cv2.imwrite(snapshot_path, face_crop if face_crop.size > 0 else frame_bgr)
                except Exception as e:
                    logger.warning(f"Could not save camera snapshot file: {e}")
                    snapshot_path = None

                # Step 4: AUTO FACE UPDATE / CONTINUOUS LEARNING (Tự động học diện mạo mới khi > 95%)
                is_auto_learned = False
                if similarity >= 0.95 and face.blur_score >= 40.0:
                    updated_feature = await attendance_service.auto_update_face_feature(
                        db=db,
                        employee_id=matched_employee.id,
                        new_embedding=face.embedding,
                        detection_score=face.detection_score,
                        snapshot_path=snapshot_path
                    )
                    if updated_feature:
                        is_auto_learned = True
                        self.auto_face_updates_count += 1
                        logger.info(
                            f"✨ [Auto Face Update] Đã tự học & lưu vector mẫu mới nhất cho {matched_employee.full_name} "
                            f"(Độ tin cậy: {confidence_percent:.1f}%, Độ nét: {face.blur_score:.1f})"
                        )

                # Draw Success Bounding Box on Canvas
                if is_auto_learned:
                    self._draw_hud_box(
                        canvas=annotated_canvas,
                        bbox=face.bbox,
                        label=f"✨ {matched_employee.full_name} ({confidence_percent:.0f}%)",
                        sub_label="Tự động cập nhật mẫu",
                        color_bgr=(250, 204, 21),  # Gold/Yellow
                        is_highlight=True
                    )
                else:
                    self._draw_hud_box(
                        canvas=annotated_canvas,
                        bbox=face.bbox,
                        label=f"{matched_employee.full_name} ({confidence_percent:.0f}%)",
                        sub_label=f"{matched_employee.employee_code} • Đã ghi nhận",
                        color_bgr=(52, 211, 153),  # Emerald Green
                        is_highlight=True
                    )

                # Save Attendance Record into DB
                # Map attendance_type based on camera purpose (CHECK_IN, CHECK_OUT, or BOTH)
                determined_type = AttendanceType.CHECK_IN
                if hasattr(self, 'device_purpose') and self.device_purpose:
                    purpose_val = str(self.device_purpose.value if hasattr(self.device_purpose, 'value') else self.device_purpose).upper()
                    if "CHECK_OUT" in purpose_val:
                        determined_type = AttendanceType.CHECK_OUT
                    elif "CHECK_IN" in purpose_val:
                        determined_type = AttendanceType.CHECK_IN
                    else:
                        # BOTH / Smart Toggle
                        start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                        recent_res = await db.execute(
                            select(AttendanceRecord)
                            .where(
                                AttendanceRecord.employee_id == matched_employee.id,
                                AttendanceRecord.check_time >= start_of_day
                            )
                            .order_by(AttendanceRecord.check_time.desc())
                            .limit(1)
                        )
                        last_rec = recent_res.scalar_one_or_none()
                        if not last_rec or last_rec.attendance_type == AttendanceType.CHECK_OUT:
                            determined_type = AttendanceType.CHECK_IN
                        else:
                            determined_type = AttendanceType.CHECK_OUT

                dev_label = getattr(self, 'device_name', None) or dev_id

                note_text = (
                    f"Tự động điểm danh qua Camera [{dev_label}] (Độ tin cậy: {confidence_percent:.1f}%, Độ nét: {face.blur_score:.1f})"
                    + (" [Tự động cập nhật mẫu ✨]" if is_auto_learned else "")
                )

                record = AttendanceRecord(
                    id=uuid.uuid4(),
                    employee_id=matched_employee.id,
                    check_time=datetime.now(timezone.utc),
                    attendance_type=determined_type,
                    confidence_score=round(similarity, 4),
                    matched_face_id=matched_face.id,
                    device_id=dev_label,
                    snapshot_path=snapshot_path,
                    note=note_text
                )
                db.add(record)
                await db.commit()
                await db.refresh(record)

                self.successful_checkins_count += 1

                logger.info(
                    f"🎯 Multi-Face Match: {matched_employee.full_name} ({matched_employee.employee_code}) | "
                    f"Confidence: {confidence_percent:.2f}% | Auto-Learned: {is_auto_learned}"
                )

                # Step 5: Broadcast WebSocket Event
                snapshot_base64 = self._encode_image_base64(face_crop if face_crop.size > 0 else frame_bgr)
                ws_payload = {
                    "record_id": str(record.id),
                    "employee_id": str(matched_employee.id),
                    "employee_code": matched_employee.employee_code,
                    "full_name": matched_employee.full_name,
                    "department": matched_employee.department,
                    "position": matched_employee.position,
                    "check_time": record.check_time.isoformat(),
                    "attendance_type": record.attendance_type.value,
                    "confidence_score": round(similarity, 4),
                    "confidence_percent": f"{confidence_percent:.1f}%",
                    "blur_score": face.blur_score,
                    "matched_template_id": str(matched_face.id),
                    "device_id": record.device_id,
                    "source_type": src_type,
                    "snapshot_base64": snapshot_base64,
                    "auto_learned": is_auto_learned,
                    "bbox": [int(x1), int(y1), int(x2), int(y2)]
                }
                await ws_manager.broadcast_attendance(ws_payload)

            except Exception as e:
                logger.error(f"Error in _process_single_face for employee: {e}", exc_info=True)


stream_processor = VideoStreamProcessor()
