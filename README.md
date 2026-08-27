# V-Face: Hệ thống Chấm công & Giám sát Thông minh bằng AI

Hệ thống Full-stack (FastAPI Backend + React Frontend) cho giải pháp chấm công nhận diện khuôn mặt thời gian thực, tích hợp **PostgreSQL pgvector** (vector 512 chiều), thư viện AI **InsightFace** (ArcFace + RetinaFace) tối ưu cho **Apple Silicon M4**, **Module Luồng Camera RTSP (Tapo C200)** và **Giao diện Dashboard Realtime WebSocket**.

---

## 1. Kiến trúc Hệ thống Tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│              React 18 + Vite + Tailwind CSS                 │
│   (Dashboard Realtime WS, Quản lý Nhân viên, Lịch sử)      │
└───────────────▲──────────────────────────────▲──────────────┘
                │ REST API (Axios)             │ WebSocket (/ws/attendance)
                ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Async Web Framework                 │
│ ─────────────────────────────────────────────────────────── │
│ • Multi-threaded RTSP Stream Reader (Tapo C200, No-delay)   │
│ • VideoStreamProcessor (Frame-skip 1/5f, Face Filter 80x80)│
│ • InsightFace AI Engine (ArcFace 512D + CoreML/MPS/NEON)    │
│ • Cooldown 5 phút (Debounce chống spam chấm công)           │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│    PostgreSQL 16 + pgvector │  │    Local File Storage      │
│  • HNSW Cosine Index (<=>)  │  │  • Uploaded Face Vectors   │
│  • Latency < 5ms (512-dim)  │  │  • Camera Check-in Snaps   │
└─────────────────────────────┘  └────────────────────────────┘
```

---

## 2. Quản lý Dịch vụ với Script Tự động (Khuyên dùng)

Hệ thống cung cấp script quản lý tiện lợi `service.sh` và `Makefile` để bật/tắt, khởi động lại và xem logs các service mà không cần mở nhiều cửa sổ terminal.

### 2.1. Lệnh cơ bản

| Thao tác | Dùng `service.sh` | Dùng `make` | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Khởi động toàn bộ** | `./service.sh start` | `make start` | Tự động bật DB, Backend & Frontend |
| **Dừng toàn bộ** | `./service.sh stop` | `make stop` | Tắt an toàn Backend & Frontend |
| **Khởi động lại** | `./service.sh restart` | `make restart` | Restart toàn bộ services |
| **Kiểm tra trạng thái** | `./service.sh status` | `make status` | Hiển thị PID, port & tình trạng container |
| **Xem realtime logs** | `./service.sh logs` | `make logs` | Stream log của cả Backend & Frontend |

### 2.2. Điều khiển riêng lẻ từng thành phần

```bash
# Quản lý riêng Backend (Port 8000)
./service.sh start backend     # hoặc: make start-backend
./service.sh stop backend      # hoặc: make stop-backend
./service.sh restart backend
./service.sh logs backend      # Xem log file: logs/backend.log

# Quản lý riêng Frontend (Port 5173)
./service.sh start frontend    # hoặc: make start-frontend
./service.sh stop frontend     # hoặc: make stop-frontend
./service.sh restart frontend
./service.sh logs frontend     # Xem log file: logs/frontend.log

# Quản lý Database (Postgres pgvector)
./service.sh start db
./service.sh stop db
```

---

## 3. Khởi chạy Thủ công (Dành cho Development / Debug)

Nếu bạn muốn chạy từng dịch vụ trực tiếp trên terminal để debug:

### Bước 1: Khởi động Cơ sở dữ liệu PostgreSQL + pgvector
```bash
docker compose up -d
```

### Bước 2: Chạy Backend (FastAPI + AI Engine)
```bash
# Kích hoạt môi trường ảo
source venv/bin/activate

# Cài đặt thư viện nếu chưa cài
pip install -r requirements.txt

# Khởi chạy Backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/attendance`

### Bước 3: Chạy Frontend (React + Vite + Tailwind CSS)
Mở một Terminal mới:
```bash
cd frontend

# Cài đặt packages
npm install

# Khởi chạy Frontend Dev Server
npm run dev
```
- **Frontend Web**: `http://localhost:5173`

---

## 4. Các Màn hình Chức năng trên Frontend

1. **Dashboard Realtime (Màn hình 1)**:
   - Tự động mở kết nối WebSocket `ws://localhost:8000/ws/attendance`.
   - Nhận diện sự kiện điểm danh từ Camera Tapo C200 đẩy về tức thì kèm ảnh crop thumbnail Base64.
   - Đẩy bản ghi mới nhất lên đầu danh sách mà không cần reload trang.
   - Thẻ hiển thị nổi bật người điểm danh gần nhất kèm độ chính xác (Confidence Score %).
   - Nút bật/tắt nhanh luồng Camera RTSP.

2. **Quản lý Nhân viên (Màn hình 2)**:
   - Danh sách nhân viên phân trang kèm trạng thái số lượng vector khuôn mặt đã đăng ký.
   - Modal thêm nhân viên mới (mã NV, họ tên, email, phòng ban, vị trí).
   - Modal upload 1 hoặc nhiều ảnh chân dung (.jpg, .png, .webp) gửi `FormData` lên API `POST /api/v1/employees/{id}/register-face` để trích xuất vector 512 chiều.

3. **Lịch sử Chấm công (Màn hình 3)**:
   - Bảng tra cứu lịch sử chấm công chi tiết.
   - Bộ lọc theo ngày (Từ ngày - Đến ngày), lọc theo Mã nhân viên và Phòng ban.
   - Hiển thị loại chấm công (`AUTO` / `CHECK_IN` / `CHECK_OUT`), độ tin cậy AI và thiết bị ghi nhận.
