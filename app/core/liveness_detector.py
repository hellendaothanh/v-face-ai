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
    Module Face Anti-Spoofing & Liveness Detection (Chống gian lận chấm công bằng ảnh chụp / màn hình).
    
    Kết hợp 2 phương pháp tiên tiến:
    1. Deep Learning: Mô hình Silent-Face-Anti-Spoofing (MiniFASNetV2) chạy qua ONNXRuntime (CoreML / CPU).
    2. Computer Vision: Phân tích Texture, Moire Frequency Spectrum (2D FFT) và Phổ màu ánh sáng màn hình (HSV/YCrCb).
    """

    def __init__(
        self,
        model_path: Optional[str] = "./models/anti_spoofing/MiniFASNetV2.onnx",
        threshold: float = 0.50,
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
        """Khởi tạo ONNXRuntime Inference Session nếu file weights tồn tại."""
        if not HAS_ONNX:
            logger.warning("onnxruntime is not installed. Using pure Computer Vision texture/Moire analyzer.")
            return

        if not self.model_path or not os.path.exists(self.model_path):
            logger.info(
                f"ℹ️ Anti-spoofing ONNX model not found at '{self.model_path}'. "
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
                f"✔ Anti-Spoofing ONNX Engine loaded: {self.model_path} | "
                f"Input: {self.input_shape} | Providers: {self.session.get_providers()}"
            )
        except Exception as e:
            logger.warning(f"Could not load ONNX liveness model: {e}. Fallback to Texture/Moire analyzer.")
            self.is_onnx_ready = False

    @staticmethod
    def _analyze_moire_frequency(face_gray: np.ndarray) -> float:
        """
        Phân tích phổ tần số cao (2D FFT Magnitude Spectrum) để tìm vân sóng Moire của màn hình LCD/OLED.
        Màn hình điện thoại/máy tính phát ra các xung lưới pixel định kỳ ở dải tần số cao.
        """
        try:
            h, w = face_gray.shape
            if h < 32 or w < 32:
                return 0.5

            # 2D Fast Fourier Transform
            dft = cv2.dft(np.float32(face_gray), flags=cv2.DFT_COMPLEX_OUTPUT)
            dft_shift = np.fft.fftshift(dft)
            magnitude = 20 * np.log(cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1]) + 1.0)

            # Phân tách năng lượng tần số cao vs tần số thấp
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
            # Màn hình phát ra vân lưới Moire khiến tỷ lệ tần số cao tăng bất thường (> 0.65)
            return float(ratio)
        except Exception:
            return 0.5

    @staticmethod
    def _analyze_color_gamut_reflection(face_bgr: np.ndarray) -> float:
        """
        Phân tích độ tán xạ ánh sáng và phản chiếu đặc trưng của da người thật vs màn hình điện thoại:
        - Màn hình điện thoại có độ bão hòa (Saturation) và phát xạ kênh Blue cao bất thường.
        - Da người thật có độ tán xạ dưới da (Subsurface scattering) tạo dải màu ấm mượt trong YCrCb.
        """
        try:
            hsv = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2HSV)
            ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)

            s_channel = hsv[:, :, 1]
            cr_channel = ycrcb[:, :, 1]
            cb_channel = ycrcb[:, :, 2]

            # Kiểm tra vùng quá sáng chói (Specular reflection từ kính điện thoại)
            v_channel = hsv[:, :, 2]
            specular_pixels = np.sum(v_channel > 248) / (face_bgr.shape[0] * face_bgr.shape[1])

            # Da người thật có tỷ lệ Cr/Cb trong khoảng sinh học nhất định
            cr_cb_diff = np.abs(np.mean(cr_channel) - np.mean(cb_channel))
            sat_std = np.std(s_channel)

            # Điểm tự nhiên của da (0.0: rất giống màn hình, 1.0: da thật tự nhiên)
            skin_naturalness = 1.0
            if specular_pixels > 0.08:  # Kính điện thoại phản quang nhiều
                skin_naturalness -= 0.35
            if sat_std < 12.0:  # Màn hình phẳng có biến thiên độ bão hòa thấp
                skin_naturalness -= 0.25
            if cr_cb_diff < 10.0 or cr_cb_diff > 45.0:  # Sai lệch dải màu sinh học
                skin_naturalness -= 0.20

            return max(0.05, min(0.95, skin_naturalness))
        except Exception:
            return 0.7

    @staticmethod
    def _analyze_texture_gradient(face_gray: np.ndarray) -> float:
        """
        Phân tích kết cấu vi mô (Texture gradient) của biểu bì da người vs bề mặt phẳng (giấy in / màn hình).
        """
        try:
            laplacian = cv2.Laplacian(face_gray, cv2.CV_64F)
            sobel_x = cv2.Sobel(face_gray, cv2.CV_64F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(face_gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)

            lap_var = np.var(laplacian)
            grad_mean = np.mean(gradient_mag)

            # Chuẩn hóa về thang điểm [0, 1]
            if lap_var < 15.0 or grad_mean < 8.0:
                return 0.1  # Quá mịn (ảnh chụp màn hình mờ hoặc in giấy kém chất lượng)
            
            score = min(1.0, (lap_var / 250.0) * 0.5 + (grad_mean / 40.0) * 0.5)
            return float(score)
        except Exception:
            return 0.5

    def predict_liveness(self, cropped_face_image: np.ndarray) -> Tuple[bool, float]:
        """
        Dự đoán tính thực thể sống của khuôn mặt (Face Liveness Detection).
        
        Args:
            cropped_face_image (np.ndarray): Khung hình khuôn mặt BGR đã được cắt từ ảnh gốc.
            
        Returns:
            Tuple[bool, float]:
                - is_real (bool): True nếu là người thật, False nếu là ảnh chụp/màn hình điện thoại.
                - liveness_score (float): Điểm tự tin thực thể sống từ 0.0 (Giả mạo) đến 1.0 (Người thật).
        """
        if cropped_face_image is None or cropped_face_image.size == 0:
            return False, 0.0

        h, w = cropped_face_image.shape[:2]
        if h < 40 or w < 40:
            return False, 0.1

        # ----------------------------------------------------------------------
        # Pipeline 1: Deep Learning Inference (MiniFASNet ONNX) nếu đã load
        # ----------------------------------------------------------------------
        onnx_score = None
        if self.is_onnx_ready and self.session is not None:
            try:
                target_w, target_h = self.input_shape
                resized = cv2.resize(cropped_face_image, (target_w, target_h))
                rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
                
                # ImageNet Normalization (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
                std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
                normalized = (rgb - mean) / std

                tensor = np.transpose(normalized, (2, 0, 1))  # HWC -> CHW
                tensor = np.expand_dims(tensor, axis=0)  # Add batch dim [1, 3, H, W]

                outputs = self.session.run(None, {self.input_name: tensor})
                raw_logits = outputs[0][0]  # [fake_score, real_score] or 3-class

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
        # Pipeline 2: Computer Vision Multi-Factor Analyzer (Texture + Moire + Gamut)
        # ----------------------------------------------------------------------
        gray = cv2.cvtColor(cropped_face_image, cv2.COLOR_BGR2GRAY)
        
        moire_ratio = self._analyze_moire_frequency(gray)
        skin_score = self._analyze_color_gamut_reflection(cropped_face_image)
        texture_score = self._analyze_texture_gradient(gray)

        # Tính toán điểm kết hợp quang học
        cv_liveness = 0.40 * skin_score + 0.35 * texture_score + 0.25 * (1.0 - min(1.0, max(0.0, (moire_ratio - 0.4) / 0.4)))

        # ----------------------------------------------------------------------
        # Pipeline 3: Fusion (Hợp nhất điểm số)
        # ----------------------------------------------------------------------
        if onnx_score is not None:
            # 70% Deep Learning + 30% CV Texture/Moire
            final_score = 0.70 * onnx_score + 0.30 * cv_liveness
        else:
            final_score = cv_liveness

        final_score = float(np.clip(final_score, 0.01, 0.99))
        is_real = bool(final_score >= self.threshold)

        return is_real, round(final_score, 4)


# Global singleton instance
liveness_detector = FaceLivenessDetector()
