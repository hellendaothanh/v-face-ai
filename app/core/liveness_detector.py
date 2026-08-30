import os
import urllib.request
from pathlib import Path
from typing import Optional, Tuple
import cv2
import numpy as np
from loguru import logger

try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False
    ort = None


class FaceLivenessDetector:
    """
    Face Anti-Spoofing & Liveness Detection Module.
    Protects against attendance fraud using printed photos, video replays, or mobile screens.
    
    Combines two advanced methodologies:
    1. Deep Learning: Silent-Face-Anti-Spoofing (MiniFASNetV2) inference via ONNXRuntime (CoreML / CPU).
    2. Computer Vision: 2D FFT Moire Frequency Spectrum, Texture Gradients, and Subsurface Color Gamut Analysis.
    """

    def __init__(
        self,
        model_path: Optional[str] = "./models/anti_spoofing/MiniFASNetV2.onnx",
        threshold: float = 0.35,
        providers: Optional[list] = None
    ):
        self.model_path = model_path
        self.threshold = threshold
        self.providers = providers or ["CoreMLExecutionProvider", "CPUExecutionProvider"]
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self.input_shape: Tuple[int, int] = (80, 80)  # Standard MiniFASNet input (80x80 or 128x128)
        self.is_onnx_ready = False

        self._initialize_model()

    def _initialize_model(self) -> None:
        """Initializes the ONNXRuntime Inference Session if model weights exist."""
        if not HAS_ONNX:
            logger.warning("onnxruntime is not installed. Using pure Computer Vision texture/Moire analyzer.")
            return

        if not self.model_path or not os.path.exists(self.model_path):
            logger.info(
                f"Anti-spoofing ONNX model not found at '{self.model_path}'. "
                f"Using advanced multi-channel Texture & Moire Spectrum analysis as active detector."
            )
            return

        try:
            available_providers = ort.get_available_providers()
            active_providers = [p for p in self.providers if p in available_providers]
            if "CPUExecutionProvider" not in active_providers:
                active_providers.append("CPUExecutionProvider")

            opts = ort.SessionOptions()
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            opts.intra_op_num_threads = 2

            self.session = ort.InferenceSession(
                self.model_path,
                sess_options=opts,
                providers=active_providers
            )
            inputs = self.session.get_inputs()
            self.input_name = inputs[0].name
            shape = inputs[0].shape  # e.g. [1, 3, 80, 80] or [1, 3, 128, 128]
            if len(shape) == 4:
                self.input_shape = (shape[2], shape[3])

            self.is_onnx_ready = True
            logger.info(
                f"Anti-Spoofing ONNX Engine loaded: {self.model_path} | "
                f"Input: {self.input_shape} | Providers: {self.session.get_providers()}"
            )
        except Exception as e:
            logger.warning(f"Could not load ONNX liveness model: {e}. Falling back to Texture/Moire analyzer.")
            self.is_onnx_ready = False

    @staticmethod
    def _analyze_moire_frequency(face_gray: np.ndarray) -> float:
        """
        Analyzes high-frequency 2D FFT Magnitude Spectrum for LCD/OLED screen Moire patterns.
        Applies a gentle Gaussian de-blocking filter to eliminate H.264/H.265 compression grid artifacts on IP cameras.
        """
        try:
            h, w = face_gray.shape
            if h < 32 or w < 32:
                return 0.5

            # Suppress H.264 macroblock compression noise (3x3 Gaussian de-blocking)
            filtered = cv2.GaussianBlur(face_gray, (3, 3), 0.6)

            # 2D Fast Fourier Transform
            dft = cv2.dft(np.float32(filtered), flags=cv2.DFT_COMPLEX_OUTPUT)
            dft_shift = np.fft.fftshift(dft)
            magnitude = 20 * np.log(cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1]) + 1.0)

            # Separate high-frequency vs low-frequency radial energy
            cy, cx = h // 2, w // 2
            r_inner = min(h, w) // 6
            r_outer = min(h, w) // 2

            y, x = np.ogrid[:h, :w]
            dist_from_center = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)

            high_freq_mask = (dist_from_center >= r_inner) & (dist_from_center <= r_outer)
            low_freq_mask = dist_from_center < r_inner

            high_freq_energy = np.mean(magnitude[high_freq_mask]) if np.any(high_freq_mask) else 0.0
            low_freq_energy = np.mean(magnitude[low_freq_mask]) if np.any(low_freq_mask) else 1.0

            ratio = high_freq_energy / (low_freq_energy + 1e-5)
            return float(ratio)
        except Exception:
            return 0.5

    @staticmethod
    def _analyze_color_gamut_reflection(face_bgr: np.ndarray) -> float:
        """
        Analyzes subsurface light scattering and natural skin color gamut vs flat screen glass reflection.
        Optimized color tolerance for IP camera ISP chips and dynamic exposure.
        """
        try:
            hsv = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2HSV)
            ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)

            s_channel = hsv[:, :, 1]
            cr_channel = ycrcb[:, :, 1]
            cb_channel = ycrcb[:, :, 2]

            # Detect intense specular reflections from phone screen glass
            v_channel = hsv[:, :, 2]
            specular_pixels = np.sum(v_channel > 250) / (face_bgr.shape[0] * face_bgr.shape[1])

            cr_cb_diff = np.abs(np.mean(cr_channel) - np.mean(cb_channel))
            sat_std = np.std(s_channel)

            skin_naturalness = 1.0
            if specular_pixels > 0.16:  # High specular reflection from screen glass
                skin_naturalness -= 0.30
            if sat_std < 8.0:  # Monochromatic flat illumination
                skin_naturalness -= 0.20
            if cr_cb_diff < 5.0 or cr_cb_diff > 55.0:  # Unnatural skin chromaticity
                skin_naturalness -= 0.15

            return max(0.10, min(0.95, skin_naturalness))
        except Exception:
            return 0.7

    @staticmethod
    def _analyze_texture_gradient(face_gray: np.ndarray) -> float:
        """
        Analyzes microscopic skin texture gradient vs flat 2D surfaces (printed paper / screens).
        Includes adaptive resolution compensation for remote IP camera streams.
        """
        try:
            h, w = face_gray.shape
            laplacian = cv2.Laplacian(face_gray, cv2.CV_64F)
            sobel_x = cv2.Sobel(face_gray, cv2.CV_64F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(face_gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)

            lap_var = np.var(laplacian)
            grad_mean = np.mean(gradient_mag)

            # Adaptive sensitivity threshold based on face crop size
            min_lap_var = 8.0 if (h < 100 or w < 100) else 14.0
            min_grad = 5.0 if (h < 100 or w < 100) else 8.0

            if lap_var < min_lap_var or grad_mean < min_grad:
                return 0.25  # Overly smooth or blurred texture
            
            score = min(1.0, (lap_var / 200.0) * 0.5 + (grad_mean / 35.0) * 0.5)
            return float(score)
        except Exception:
            return 0.6

    def predict_liveness(
        self,
        cropped_face_image: np.ndarray,
        custom_threshold: Optional[float] = None
    ) -> Tuple[bool, float]:
        """
        Predicts face liveness (Real Person vs 2D Presentation Spoof).
        
        Args:
            cropped_face_image (np.ndarray): BGR face crop bounding box.
            custom_threshold (Optional[float]): Custom evaluation threshold (Default: 0.35).
            
        Returns:
            Tuple[bool, float]:
                - is_real (bool): True if live authentic face, False if spoof presentation.
                - liveness_score (float): Confidence score from 0.0 (Spoof) to 1.0 (Real).
        """
        if cropped_face_image is None or cropped_face_image.size == 0:
            return False, 0.0

        h, w = cropped_face_image.shape[:2]
        if h < 32 or w < 32:
            return False, 0.1

        active_threshold = custom_threshold if custom_threshold is not None else self.threshold

        # ----------------------------------------------------------------------
        # Pipeline 1: Deep Learning Inference (MiniFASNet ONNX)
        # ----------------------------------------------------------------------
        onnx_score = None
        if self.is_onnx_ready and self.session is not None:
            try:
                target_w, target_h = self.input_shape
                resized = cv2.resize(cropped_face_image, (target_w, target_h))
                rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
                
                # ImageNet Normalization
                mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
                std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
                normalized = (rgb - mean) / std

                tensor = np.transpose(normalized, (2, 0, 1))  # HWC -> CHW
                tensor = np.expand_dims(tensor, axis=0)  # [1, 3, H, W]

                outputs = self.session.run(None, {self.input_name: tensor})
                raw_logits = outputs[0][0]

                # Softmax
                exp_logits = np.exp(raw_logits - np.max(raw_logits))
                probs = exp_logits / np.sum(exp_logits)

                if len(probs) == 2:
                    onnx_score = float(probs[1])  # Class 1: Real
                elif len(probs) >= 3:
                    onnx_score = float(probs[1])  # Class 1 is Real in Silent-Face 3-class setup
                else:
                    onnx_score = float(probs[0])
            except Exception as e:
                logger.debug(f"ONNX inference error: {e}")
                onnx_score = None

        # ----------------------------------------------------------------------
        # Pipeline 2: Computer Vision Multi-Factor Analyzer (De-blocked Texture + Moire + Gamut)
        # ----------------------------------------------------------------------
        gray = cv2.cvtColor(cropped_face_image, cv2.COLOR_BGR2GRAY)
        
        moire_ratio = self._analyze_moire_frequency(gray)
        skin_score = self._analyze_color_gamut_reflection(cropped_face_image)
        texture_score = self._analyze_texture_gradient(gray)

        # Combined optical score
        cv_liveness = 0.40 * skin_score + 0.35 * texture_score + 0.25 * (1.0 - min(1.0, max(0.0, (moire_ratio - 0.45) / 0.45)))

        # ----------------------------------------------------------------------
        # Pipeline 3: Fusion (Resolution-Aware Score Weighting)
        # ----------------------------------------------------------------------
        if onnx_score is not None:
            if h < 110 or w < 110:
                # Small face crop (Remote IP camera): Boost Deep Learning weight to 85% to avoid H.264 macroblock bias
                final_score = 0.85 * onnx_score + 0.15 * cv_liveness
            else:
                # Close face crop (Webcam): 70% Deep Learning + 30% CV
                final_score = 0.70 * onnx_score + 0.30 * cv_liveness
        else:
            final_score = cv_liveness

        final_score = float(np.clip(final_score, 0.01, 0.99))
        is_real = bool(final_score >= active_threshold)

        return is_real, round(final_score, 4)


# Global singleton instance
liveness_detector = FaceLivenessDetector(threshold=0.35)
