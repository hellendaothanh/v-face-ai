#!/usr/bin/env python3
"""
Tự động tải mô hình Deep Learning Face Anti-Spoofing (MiniFASNetV2-SE ONNX).
"""

import os
import ssl
import urllib.request

MODEL_DIR = "./models/anti_spoofing"
MODEL_PATH = os.path.join(MODEL_DIR, "MiniFASNetV2.onnx")

# Direct ONNX weight links
MODEL_URLS = [
    "https://raw.githubusercontent.com/facenox/face-antispoof-onnx/main/models/best_model_quantized.onnx",
    "https://raw.githubusercontent.com/facenox/face-antispoof-onnx/main/models/best_model.onnx",
    "https://github.com/facenox/face-antispoof-onnx/raw/main/models/best_model.onnx",
]


def download_model():
    os.makedirs(MODEL_DIR, exist_ok=True)
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 50000:
        print(f"✔ Mô hình Anti-Spoofing đã tồn tại tại: {MODEL_PATH} ({os.path.getsize(MODEL_PATH) / 1024 / 1024:.2f} MB)")
        return True

    print("🚀 Đang tải mô hình Anti-Spoofing MiniFASNetV2-SE ONNX...")
    ctx = ssl._create_unverified_context()

    for url in MODEL_URLS:
        try:
            print(f"  -> Thử tải từ: {url}")
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, context=ctx, timeout=60) as response, open(MODEL_PATH, "wb") as out_file:
                out_file.write(response.read())

            if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 50000:
                print(f"✔ Tải thành công! Đã lưu tại: {MODEL_PATH} ({os.path.getsize(MODEL_PATH) / 1024 / 1024:.2f} MB)")
                return True
        except Exception as e:
            print(f"  ⚠️ Thất bại ({e}), đang thử mirror tiếp theo...")

    print("ℹ️ Bạn có thể tải file MiniFASNetV2.onnx và lưu vào: " + MODEL_PATH)
    return False


if __name__ == "__main__":
    download_model()
