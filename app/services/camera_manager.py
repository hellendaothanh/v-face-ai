import asyncio
import os
import threading
import time
from typing import Dict, List, Optional, Tuple
import uuid
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import AsyncSessionLocal
from app.models.attendance import AttendanceType
from app.models.device import Device, DevicePurpose
from app.services.camera_stream import CameraStreamReader
from app.services.stream_processor import VideoStreamProcessor


class DeviceWorker:
    """
    Worker wrapping a VideoStreamProcessor instance for a specific physical or RTSP Device.
    """
    def __init__(self, device: Device):
        self.device_id: uuid.UUID = device.id
        self.device_name: str = device.device_name
        self.rtsp_url: str = device.rtsp_url
        self.location: str = device.location
        self.purpose: DevicePurpose = device.purpose
        self.is_active: bool = device.is_active

        # Determine source type
        is_webcam = self.rtsp_url.isdigit() or self.rtsp_url.lower().startswith("webcam") or self.rtsp_url == "0"
        self.source_type = "WEBCAM" if is_webcam else "RTSP"
        self.stream_index = int(self.rtsp_url) if self.rtsp_url.isdigit() else 0

        # Dedicated stream reader
        self.stream_reader = CameraStreamReader(
            source_type=self.source_type,
            rtsp_url=self.rtsp_url if self.source_type == "RTSP" else None,
            webcam_index=self.stream_index,
            device_id=self.device_name,
            target_fps=15
        )

        # Dedicated stream processor
        self.processor = VideoStreamProcessor()
        self.processor.stream_reader = self.stream_reader
        self.processor.device_id = str(self.device_id)
        self.processor.device_name = self.device_name
        self.processor.device_purpose = self.purpose
        self.processor.device_location = self.location

    def start(self) -> bool:
        """Starts the capture thread and AI processing loop."""
        try:
            logger.info(f"▶ [CameraManager] Starting camera device worker '{self.device_name}' ({self.rtsp_url})...")
            # Start stream reader thread
            self.stream_reader.start()
            # Start background async processing task
            self.processor.start(source_type=self.source_type, rtsp_url=self.rtsp_url if self.source_type == "RTSP" else None)
            return True
        except Exception as e:
            logger.error(f"Failed to start camera device worker '{self.device_name}': {e}")
            return False

    async def stop(self) -> None:
        """Stops the processor and stream reader."""
        try:
            logger.info(f"■ [CameraManager] Stopping camera device worker '{self.device_name}'...")
            await self.processor.stop()
            self.stream_reader.stop()
        except Exception as e:
            logger.warning(f"Error stopping worker '{self.device_name}': {e}")

    def get_status(self) -> dict:
        """Returns live telemetry for this camera."""
        reader_stat = self.stream_reader.get_status()
        return {
            "device_id": str(self.device_id),
            "device_name": self.device_name,
            "rtsp_url": self.rtsp_url,
            "location": self.location,
            "purpose": self.purpose.value,
            "is_active": self.is_active,
            "is_connected": reader_stat.get("is_connected", False),
            "fps": reader_stat.get("fps", 0.0),
            "processed_frames": self.processor.processed_frames,
            "successful_checkins": self.processor.successful_checkins_count,
            "detected_faces": self.processor.detected_faces_count,
            "stranger_alerts": self.processor.stranger_alerts_count,
        }


class CameraManager:
    """
    Centralized Multi-Camera Manager for Enterprise V-Face HRM System.
    Manages dynamic lifecycle of multiple cameras (FaceTime Webcam, Tapo C200 RTSP, Hikvision, Dahua).
    """

    def __init__(self):
        self._workers: Dict[uuid.UUID, DeviceWorker] = {}
        self._lock = threading.Lock()
        self._is_initialized = False

    async def initialize(self) -> None:
        """
        Reads active devices from database on startup, seeds default cameras if empty,
        and initializes workers.
        """
        if self._is_initialized:
            return

        async with AsyncSessionLocal() as db:
            try:
                res = await db.execute(select(Device))
                devices = res.scalars().all()

                # If no devices exist in database yet, seed standard default devices
                if not devices:
                    logger.info("⚡ [CameraManager] No camera devices found in DB. Seeding default camera devices...")
                    default_devs = [
                        Device(
                            id=uuid.uuid4(),
                            device_name="Camera máy tính (Built-in Webcam)",
                            rtsp_url="0",
                            location="Văn phòng chính - Cửa vào A",
                            purpose=DevicePurpose.CHECK_IN,
                            is_active=True
                        ),
                        Device(
                            id=uuid.uuid4(),
                            device_name="Tapo C200 RTSP (Cửa sảnh lễ tân)",
                            rtsp_url=settings.RTSP_URL,
                            location="Sảnh lễ tân Tầng 1",
                            purpose=DevicePurpose.BOTH,
                            is_active=False
                        ),
                        Device(
                            id=uuid.uuid4(),
                            device_name="Camera Cửa Ra B (Check-out Gate)",
                            rtsp_url="rtsp://admin:admin123@192.168.1.101:554/stream1",
                            location="Cổng xuất cảnh - Cửa Ra B",
                            purpose=DevicePurpose.CHECK_OUT,
                            is_active=False
                        ),
                    ]
                    for d in default_devs:
                        db.add(d)
                    await db.commit()
                    devices = default_devs

                # Start workers for active devices
                for dev in devices:
                    if dev.is_active:
                        self.start_worker_for_device(dev)

                self._is_initialized = True
                logger.info(f"✔ [CameraManager] Initialized with {len(self._workers)} running camera workers.")
            except Exception as e:
                logger.error(f"Error initializing CameraManager: {e}", exc_info=True)

    def start_worker_for_device(self, device: Device) -> bool:
        """Creates and starts a worker for a specific Device."""
        with self._lock:
            if device.id in self._workers:
                logger.info(f"Worker for device '{device.device_name}' ({device.id}) is already registered.")
                return True

            worker = DeviceWorker(device)
            success = worker.start()
            self._workers[device.id] = worker
            return success

    async def stop_worker_for_device(self, device_id: uuid.UUID) -> bool:
        """Stops and removes a worker for a device."""
        worker = None
        with self._lock:
            if device_id in self._workers:
                worker = self._workers.pop(device_id)

        if worker:
            await worker.stop()
            return True
        return False

    async def toggle_device(self, db: AsyncSession, device_id: uuid.UUID) -> Tuple[bool, Optional[Device]]:
        """Toggles the is_active state of a device in DB and starts/stops its worker thread."""
        res = await db.execute(select(Device).where(Device.id == device_id))
        device = res.scalar_one_or_none()
        if not device:
            return False, None

        # Toggle state
        device.is_active = not device.is_active
        await db.commit()
        await db.refresh(device)

        if device.is_active:
            self.start_worker_for_device(device)
            logger.info(f"▶ [CameraManager] Started worker for toggled device '{device.device_name}'.")
        else:
            await self.stop_worker_for_device(device.id)
            logger.info(f"■ [CameraManager] Stopped worker for toggled device '{device.device_name}'.")

        return True, device

    def get_device_telemetry(self, device_id: uuid.UUID) -> Optional[dict]:
        """Returns runtime telemetry for a specific device."""
        with self._lock:
            worker = self._workers.get(device_id)
            if worker:
                return worker.get_status()
        return None

    def get_all_statuses(self) -> Dict[str, dict]:
        """Returns telemetry dictionary for all registered workers."""
        with self._lock:
            return {str(dev_id): worker.get_status() for dev_id, worker in self._workers.items()}

    async def shutdown(self) -> None:
        """Gracefully stops all running camera workers."""
        logger.info("■ [CameraManager] Shutting down all camera workers...")
        with self._lock:
            workers = list(self._workers.values())
            self._workers.clear()

        for worker in workers:
            try:
                await worker.stop()
            except Exception as e:
                logger.warning(f"Error stopping worker during shutdown: {e}")


camera_manager = CameraManager()
