import os
import platform
import threading
import time
from typing import Any, Literal, Optional, Tuple, Union
from loguru import logger
import numpy as np
import cv2


class CameraStreamReader:
    """
    High-performance multi-threaded Video Stream Grabber supporting both:
    1. Built-in MacBook Webcam (FaceTime HD on Apple Silicon via AVFoundation)
    2. IP Camera RTSP Stream (Tapo C200 via FFMPEG)

    Drains frames in a dedicated background thread to guarantee zero-latency buffer and auto-reconnects.
    """

    def __init__(
        self,
        source_type: Literal["WEBCAM", "RTSP"] = "WEBCAM",
        webcam_index: int = 0,
        rtsp_url: Optional[str] = None,
        device_id: str = "CAM_01",
        target_fps: int = 15,
        **kwargs: Any
    ):
        self.source_type = source_type
        self.webcam_index = webcam_index
        self.rtsp_url = rtsp_url or ""
        self.device_id = device_id
        self.target_fps = target_fps

        self._cap: Optional[cv2.VideoCapture] = None
        self._thread: Optional[threading.Thread] = None
        self._is_running = False
        self._lock = threading.Lock()

        # Frame buffer (only stores the latest frame)
        self._latest_frame: Optional[np.ndarray] = None
        self._last_frame_time: float = 0.0

        # Diagnostics & stats
        self.total_frames_read = 0
        self.is_connected = False
        self.fps = 0.0
        self._reconnect_interval = 3.0  # seconds

    def start(self) -> bool:
        """Starts the background frame capture thread."""
        if self._is_running:
            logger.info(f"Stream reader for {self.device_id} is already running.")
            return True

        self._is_running = True
        self._thread = threading.Thread(
            target=self._capture_loop,
            name=f"Capture-{self.source_type}-{self.device_id}",
            daemon=True
        )
        self._thread.start()
        logger.info(
            f"Started Camera Capture thread for device '{self.device_id}' "
            f"[Source: {self.source_type} - {self.webcam_index if self.source_type == 'WEBCAM' else self.rtsp_url}]."
        )
        return True

    def stop(self) -> None:
        """Stops the stream capture thread and releases camera resources."""
        self._is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._release_cap()
        logger.info(f"Stopped Camera Capture thread for device '{self.device_id}'.")

    def _open_capture(self) -> bool:
        """Initializes cv2.VideoCapture depending on whether it's Webcam or RTSP."""
        self._release_cap()

        try:
            if self.source_type == "WEBCAM":
                logger.info(f"Opening local Webcam (Index: {self.webcam_index})...")
                # On macOS use AVFoundation, on Windows use DirectShow for fast, reliable webcam capture
                if platform.system() == "Darwin":
                    self._cap = cv2.VideoCapture(self.webcam_index, cv2.CAP_AVFOUNDATION)
                elif platform.system() == "Windows":
                    self._cap = cv2.VideoCapture(self.webcam_index, cv2.CAP_MSMF)
                    if not self._cap or not self._cap.isOpened():
                        self._cap = cv2.VideoCapture(self.webcam_index)
                else:
                    self._cap = cv2.VideoCapture(self.webcam_index)

                # Set optimal resolution (e.g. 1280x720)
                if self._cap and self._cap.isOpened():
                    self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                    self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    self.is_connected = True
                    logger.info(f"Successfully connected to Webcam ({self.device_id}).")
                    return True
                else:
                    logger.warning(f"Could not open Webcam index {self.webcam_index}.")
                    self.is_connected = False
                    return False

            else:  # RTSP Stream (Tapo C200)
                logger.info(f"Opening RTSP Stream: {self.rtsp_url}...")
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
                self._cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                if self._cap and self._cap.isOpened():
                    self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    self.is_connected = True
                    logger.info(f"Successfully connected to RTSP Stream ({self.device_id}).")
                    return True
                else:
                    logger.warning(f"Failed to open RTSP stream ({self.device_id}).")
                    self.is_connected = False
                    return False

        except Exception as e:
            self.is_connected = False
            logger.error(f"Error opening camera source ({self.source_type}): {e}")
            return False

    def _release_cap(self) -> None:
        with self._lock:
            if self._cap:
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
            self.is_connected = False

    def _capture_loop(self) -> None:
        """Continuous background loop for reading frames."""
        fps_count = 0
        fps_start_time = time.time()

        while self._is_running:
            try:
                if not self.is_connected or self._cap is None or not self._cap.isOpened():
                    if not self._open_capture():
                        time.sleep(self._reconnect_interval)
                        continue

                ret, frame = self._cap.read()
                if not ret or frame is None:
                    logger.warning(f"Lost video frame on {self.device_id}. Re-opening in {self._reconnect_interval}s...")
                    self.is_connected = False
                    self._release_cap()
                    time.sleep(self._reconnect_interval)
                    continue

                # For local Webcam, flip horizontally for natural mirror viewing (turn left -> moves left)
                if self.source_type == "WEBCAM":
                    frame = cv2.flip(frame, 1)

                # Atomic update of latest frame
                with self._lock:
                    self._latest_frame = frame
                    self._last_frame_time = time.time()
                    self.total_frames_read += 1

                # FPS calculation
                fps_count += 1
                elapsed = time.time() - fps_start_time
                if elapsed >= 1.0:
                    self.fps = round(fps_count / elapsed, 1)
                    fps_count = 0
                    fps_start_time = time.time()

                # Small yield to prevent CPU pegging on fast webcams
                if self.source_type == "WEBCAM":
                    time.sleep(0.005)
            except Exception as e:
                logger.warning(f"Exception in camera capture loop ({self.device_id}): {e}")
                self.is_connected = False
                self._release_cap()
                time.sleep(self._reconnect_interval)

        self._release_cap()

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """
        Retrieves the latest available frame without blocking.
        Returns (has_frame, frame_bgr, timestamp).
        """
        with self._lock:
            if self._latest_frame is None:
                return False, None, 0.0
            return True, self._latest_frame.copy(), self._last_frame_time
