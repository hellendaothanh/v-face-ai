#!/usr/bin/env python3
"""
Test Script: Face Liveness Detection & Anti-Spoofing Benchmark
Sử dụng:
    python test_liveness.py                                      # Chạy tự động với mẫu thử nghiệm
    python test_liveness.py --image path/to/face.jpg            # Kiểm tra 1 ảnh bất kỳ
    python test_liveness.py --real real.jpg --spoof spoof.jpg    # So sánh 2 ảnh người thật vs ảnh chụp màn hình
"""

import argparse
import os
import sys
import cv2
import numpy as np

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.liveness_detector import liveness_detector
from app.services.face_engine import face_engine


def print_banner():
    print("=" * 70)
    print("  🛡️  V-FACE ANTI-SPOOFING & LIVENESS DETECTION BENCHMARK")
    print("      Phát hiện giả mạo bằng ảnh chụp / màn hình điện thoại")
    print("=" * 70)


def evaluate_image(image_path: str, label: str = "Test Image"):
    if not os.path.exists(image_path):
        print(f"❌ Không tìm thấy file: {image_path}")
        return None

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        print(f"❌ Không thể đọc ảnh: {image_path}")
        return None

    print(f"\n📂 Đang xử lý: [{label}] -> '{image_path}' ({img_bgr.shape[1]}x{img_bgr.shape[0]} px)")

    # 1. Phát hiện vị trí khuôn mặt bằng InsightFace
    face_engine.initialize()
    faces = face_engine.extract_faces_from_bgr(img_bgr, min_score=0.6)

    if not faces:
        print("⚠️ Không phát hiện thấy khuôn mặt nào trong ảnh. Thử kiểm tra toàn bộ khung hình...")
        face_crop = img_bgr
    else:
        face = faces[0]
        x1, y1, x2, y2 = face.bbox
        h_f, w_f = img_bgr.shape[:2]
        crop_x1 = max(0, int(x1))
        crop_y1 = max(0, int(y1))
        crop_x2 = min(w_f, int(x2))
        crop_y2 = min(h_f, int(y2))
        face_crop = img_bgr[crop_y1:crop_y2, crop_x1:crop_x2]
        print(f"   ✔ Đã cắt khuôn mặt (Kích thước: {face_crop.shape[1]}x{face_crop.shape[0]} px)")

    # 2. Chạy Face Liveness Detection
    is_real, score = liveness_detector.predict_liveness(face_crop)

    # 3. Phân tích chi tiết các chỉ số quang học
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    moire = liveness_detector._analyze_moire_frequency(gray)
    skin = liveness_detector._analyze_color_gamut_reflection(face_crop)
    texture = liveness_detector._analyze_texture_gradient(gray)

    # In kết quả đánh giá
    status_text = "🟢 [NGƯỜI THẬT - HỢP LỆ]" if is_real else "🔴 [CẢNH BÁO: ẢNH CHỤP / MÀN HÌNH - GIẢ MẠO]"
    
    print("-" * 70)
    print(f"  Kết quả phân tích:        {status_text}")
    print(f"  Điểm thực thể sống (Score): {score * 100:.2f}% (Ngưỡng yêu cầu: {liveness_detector.threshold * 100:.1f}%)")
    print(f"  • Độ tự nhiên màu da (Skin):  {skin * 100:.1f}%")
    print(f"  • Kết cấu vi mô (Texture):    {texture * 100:.1f}%")
    print(f"  • Tỷ lệ vân Moire màn hình:   {moire:.3f} (Vân màn hình > 0.65)")
    print("-" * 70)

    return {
        "label": label,
        "is_real": is_real,
        "score": score,
        "skin": skin,
        "texture": texture,
        "moire": moire
    }


def create_synthetic_samples():
    """Tạo 2 ảnh mẫu mô phỏng (1 da thật tự nhiên vs 1 màn hình chứa lưới pixel Moire & phản quang)."""
    os.makedirs("./uploads/test_samples", exist_ok=True)
    real_path = "./uploads/test_samples/sample_real_face.jpg"
    spoof_path = "./uploads/test_samples/sample_screen_spoof.jpg"

    # Mẫu 1: Da thật (Độ dốc gradient mềm, tán xạ ánh sáng tự nhiên)
    real_img = np.zeros((200, 200, 3), dtype=np.uint8)
    for y in range(200):
        for x in range(200):
            # Da ấm sinh học (B: 120-140, G: 140-165, R: 190-220)
            real_img[y, x] = [130 + (x % 15), 150 + (y % 15), 205 + ((x + y) % 15)]
    # Thêm nhiễu biểu bì tự nhiên
    noise = np.random.normal(0, 3, (200, 200, 3)).astype(np.uint8)
    real_img = cv2.add(real_img, noise)
    cv2.imwrite(real_path, real_img)

    # Mẫu 2: Màn hình điện thoại (Lưới Moire sọc ngang dọc định kỳ + Vết chói Specular)
    spoof_img = np.zeros((200, 200, 3), dtype=np.uint8)
    for y in range(200):
        for x in range(200):
            # Lưới sọc pixel LCD/OLED
            grid_val = 40 if (x % 4 == 0 or y % 4 == 0) else 0
            spoof_img[y, x] = [160 + grid_val, 130 + grid_val, 180 + grid_val]
    # Thêm đốm sáng phản quang màn hình kính (Specular reflection)
    cv2.circle(spoof_img, (100, 100), 30, (255, 255, 255), -1)
    cv2.imwrite(spoof_path, spoof_img)

    return real_path, spoof_path


def main():
    print_banner()

    parser = argparse.ArgumentParser(description="V-Face Face Liveness Detection Test")
    parser.add_argument("--image", type=str, help="Đường dẫn đến 1 ảnh bất kỳ để kiểm tra")
    parser.add_argument("--real", type=str, help="Đường dẫn đến ảnh người thật")
    parser.add_argument("--spoof", type=str, help="Đường dẫn đến ảnh chụp/màn hình")
    args = parser.parse_args()

    if args.image:
        evaluate_image(args.image, label="Ảnh chỉ định")
    elif args.real and args.spoof:
        evaluate_image(args.real, label="1. ẢNH NGƯỜI THẬT")
        evaluate_image(args.spoof, label="2. ẢNH MÀN HÌNH / ẢNH CHỤP")
    else:
        print("\n⚡ Chưa truyền tham số ảnh. Đang tự động kiểm tra ảnh mẫu...")
        
        # Tìm ảnh có sẵn trong thư mục uploads
        existing_faces = []
        if os.path.exists("./uploads/faces"):
            for root, _, files in os.walk("./uploads/faces"):
                for f in files:
                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                        existing_faces.append(os.path.join(root, f))

        if existing_faces:
            evaluate_image(existing_faces[0], label="Ảnh chân dung đã đăng ký")
        
        # Tạo và kiểm tra mẫu mô phỏng
        real_sample, spoof_sample = create_synthetic_samples()
        evaluate_image(real_sample, label="Mẫu da thật (Natural Skin Diffusion)")
        evaluate_image(spoof_sample, label="Mẫu màn hình điện thoại (LCD Moire Grid + Reflection)")

    print("\n" + "=" * 70)
    print("  ✔ HOÀN TẤT THỬ NGHIỆM LIVENESS DETECTION")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
