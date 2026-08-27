import io
import os
from typing import List, Optional, Tuple
from loguru import logger
import numpy as np
from PIL import Image, ImageOps
import cv2

from app.core.config import settings
from app.core.exceptions import (
    InvalidImageFormatException,
    MultipleFacesDetectedException,
    NoFaceDetectedException,
)


class ExtractedFace:
    """Represents a single face detected with bounding box, landmark keypoints, embedding, and quality metrics."""
    def __init__(
        self,
        embedding: list[float],
        detection_score: float,
        bbox: list[int],
        kps: Optional[np.ndarray] = None,
        blur_score: float = 0.0,
        face_crop: Optional[np.ndarray] = None
    ):
        self.embedding = embedding
        self.detection_score = float(detection_score)
        self.bbox = [int(v) for v in bbox]
        self.kps = kps
        self.blur_score = float(blur_score)
        self.face_crop = face_crop

    @property
    def is_blurry(self) -> bool:
        """Returns True if the face image fails the Laplacian variance blur threshold."""
        return self.blur_score < settings.CAMERA_BLUR_THRESHOLD


class FaceEngine:
    """
    Singleton AI Service for Face Detection, Quality Assessment, and Feature Extraction.
    Uses InsightFace (RetinaFace for detection, ArcFace for 512-D embedding).
    Configured with CoreMLExecutionProvider / CPUExecutionProvider for Apple Silicon (M4).
    """

    _instance: Optional["FaceEngine"] = None

    def __new__(cls) -> "FaceEngine":
        if cls._instance is None:
            cls._instance = super(FaceEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def initialize(self) -> None:
        if getattr(self, "_initialized", False):
            return

        logger.info(f"Initializing InsightFace model '{settings.FACE_MODEL_NAME}'...")
        logger.info(f"Target Execution Providers: {settings.FACE_MODEL_PROVIDERS}")

        try:
            import insightface
            from insightface.app import FaceAnalysis

            # Initialize FaceAnalysis with providers
            # On Apple Silicon M4, CoreMLExecutionProvider or CPUExecutionProvider with ARM NEON will be used
            self.app = FaceAnalysis(
                name=settings.FACE_MODEL_NAME,
                providers=settings.FACE_MODEL_PROVIDERS,
                allowed_modules=["detection", "recognition"]
            )
            # Prepare models with detection resolution (ctx_id=0 or -1 for CPU/CoreML)
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            self._initialized = True
            logger.info("InsightFace engine initialized successfully.")
        except Exception as e:
            logger.warning(
                f"Failed to initialize with providers {settings.FACE_MODEL_PROVIDERS}. "
                f"Falling back to default CPU provider. Error: {e}"
            )
            try:
                import insightface
                from insightface.app import FaceAnalysis

                self.app = FaceAnalysis(
                    name=settings.FACE_MODEL_NAME,
                    providers=["CPUExecutionProvider"],
                    allowed_modules=["detection", "recognition"]
                )
                self.app.prepare(ctx_id=0, det_size=(640, 640))
                self._initialized = True
                logger.info("InsightFace initialized successfully with CPU fallback.")
            except Exception as ex:
                logger.error(f"Critical error initializing InsightFace model: {ex}")
                raise

    @staticmethod
    def estimate_blur_score(image: np.ndarray) -> float:
        """
        Calculates sharpness/blur metric using the Variance of Laplacian algorithm.
        Higher score = sharper image.
        Lower score (< 50-80) = motion blur or low-light smear.
        """
        if image is None or image.size == 0:
            return 0.0

        # Convert to Grayscale if image is 3-channel
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Compute Laplacian and return variance
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        return round(variance, 2)

    @classmethod
    def is_face_blurred(
        cls,
        face_crop: np.ndarray,
        threshold: Optional[float] = None
    ) -> Tuple[bool, float]:
        """
        Determines if the face region is blurry.
        Returns: (is_blurred: bool, blur_score: float)
        """
        thresh = threshold if threshold is not None else settings.CAMERA_BLUR_THRESHOLD
        score = cls.estimate_blur_score(face_crop)
        return (score < thresh, score)

    @staticmethod
    def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
        """
        Converts raw image bytes to an RGB numpy array (cv2 BGR format as expected by InsightFace).
        Handles EXIF orientation tags automatically.
        """
        try:
            pil_image = Image.open(io.BytesIO(image_bytes))
            # Auto-rotate image based on EXIF tag (critical for smartphone photos)
            pil_image = ImageOps.exif_transpose(pil_image)

            # Convert to RGB if RGBA or Grayscale
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            np_image = np.array(pil_image)
            # Convert RGB to BGR for OpenCV / InsightFace compatibility
            bgr_image = cv2.cvtColor(np_image, cv2.COLOR_RGB2BGR)
            return bgr_image
        except Exception as e:
            logger.error(f"Error decoding image bytes: {e}")
            raise InvalidImageFormatException("Cannot decode image. Unsupported or corrupted file format.")

    def extract_faces_from_bgr(
        self,
        bgr_image: np.ndarray,
        min_score: Optional[float] = None,
        min_blur_score: Optional[float] = None
    ) -> List[ExtractedFace]:
        """
        Detects faces, evaluates blur variance, and extracts 512-dim ArcFace embeddings from BGR image.
        If min_blur_score is provided, blurry faces will be skipped to prevent false recognitions.
        """
        if not getattr(self, "_initialized", False):
            self.initialize()

        min_detection_score = min_score or settings.FACE_DETECTION_MIN_SCORE
        faces = self.app.get(bgr_image)

        results: List[ExtractedFace] = []
        img_h, img_w = bgr_image.shape[:2]

        for face in faces:
            score = float(face.det_score) if hasattr(face, "det_score") else 1.0
            if score < min_detection_score:
                continue

            bbox = [int(v) for v in face.bbox] if hasattr(face, "bbox") else [0, 0, 0, 0]
            x1, y1, x2, y2 = bbox

            # Crop face bounding box safely
            cx1 = max(0, min(img_w - 1, x1))
            cy1 = max(0, min(img_h - 1, y1))
            cx2 = max(0, min(img_w, x2))
            cy2 = max(0, min(img_h, y2))
            face_crop = bgr_image[cy1:cy2, cx1:cx2]

            # Compute Motion Blur / Sharpness score
            blur_score = self.estimate_blur_score(face_crop)

            # Filter out motion blurred faces if min_blur_score threshold is applied
            if min_blur_score is not None and blur_score < min_blur_score:
                logger.debug(
                    f"Skipping face with motion blur: variance={blur_score:.1f} < threshold={min_blur_score:.1f}"
                )
                continue

            # Ensure embedding exists and normalize (L2 norm)
            if hasattr(face, "embedding") and face.embedding is not None:
                emb = face.embedding
                # L2 normalize
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm

                embedding_list = emb.tolist()
                kps = face.kps if hasattr(face, "kps") else None

                results.append(ExtractedFace(
                    embedding=embedding_list,
                    detection_score=score,
                    bbox=bbox,
                    kps=kps,
                    blur_score=blur_score,
                    face_crop=face_crop
                ))

        # Sort faces by bounding box area (largest face first)
        results.sort(
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
            reverse=True
        )
        return results

    def extract_single_face(
        self,
        image_bytes: bytes,
        require_single_face: bool = True
    ) -> ExtractedFace:
        """
        Extracts face from an uploaded image.
        - If require_single_face is True (for face registration): throws error if 0 or >1 face detected.
        - If require_single_face is False (for check-in): takes the largest face detected.
        """
        bgr_image = self.decode_image_bytes(image_bytes)
        detected_faces = self.extract_faces_from_bgr(bgr_image)

        if not detected_faces:
            raise NoFaceDetectedException("Không tìm thấy khuôn mặt rõ nét trong ảnh.")

        if require_single_face and len(detected_faces) > 1:
            raise MultipleFacesDetectedException(len(detected_faces))

        return detected_faces[0]


face_engine = FaceEngine()
