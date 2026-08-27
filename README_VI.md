<div align="center">

# V-Face Pro: Hệ Thống Chấm Công & Quản Trị Nhân Sự (HRM) Bằng AI Nhận Diện Khuôn Mặt

[🇻🇳 Tiếng Việt](README_VI.md) | [🇬🇧 English](README.md)

---

</div>

Hệ thống Full-stack Enterprise (**FastAPI Backend + React Frontend**) tích hợp **PostgreSQL pgvector** (Vector 512D ArcFace), mô hình AI **InsightFace (buffalo_l)** tối ưu hóa cho phần cứng **Apple Silicon M4**, công nghệ **Anti-Spoofing MiniFASNet**, **Phát hiện người lạ (Stranger Alert)**, **Quản lý thiết bị Camera tập trung đa luồng**, **Xử lý ngoại lệ đơn từ** và **Dashboard phân tích biểu đồ BI (Recharts)**.

---

## 1. 🏗️ Kiến Trúc Hệ Thống Tổng Quan

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts                  │
│  ┌───────────────────────┬──────────────────────┬───────────────────────────────────┐  │
│  │  Realtime Dashboard   │   HRM & Attendance   │   Camera Devices & BI Analytics   │  │
│  │ • 3 View Modes+Fullscr│ • 5-Photo Multi-Face │ • Multi-Device RTSP Switcher      │  │
│  │ • Bounding Box HUD    │ • Đơn từ & Ngoại lệ  │ • Weekly Line / Dept Bar / Hourly │  │
│  └───────────────────────┴──────────────────────┴───────────────────────────────────┘  │
└────────────────────────────▲──────────────────────────────────▲────────────────────────┘
                             │ REST API (Axios)                 │ WebSocket (/ws/attendance)
                             ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Async Backend Framework (Port 8000)                     │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ • CameraManager: Quản lý đa luồng (Multi-threading) độc lập cho từng Camera RTSP/Webcam│
│ • StreamProcessor: Xử lý nhận diện song song nhiều người cùng lúc (asyncio.gather)     │
│ • Anti-Spoofing: MiniFASNetV2 ONNX + Fourier Moire (Chống gian lận ảnh/màn hình)       │
│ • Auto Face Update: Tự động cập nhật vector mới khi nhận diện đạt độ tin cậy > 95%     │
│ • Stranger Detector: Bộ đếm 3 khung hình nhận diện người lạ < 70% + Còi báo động       │
│ • Exception Calculator: Tự động đối chiếu đơn nghỉ phép/công tác/đi trễ khi tính công  │
│ • TrueType Font Engine: Render tên nhân viên tiếng Việt có dấu trực tiếp trên Canvas   │
└────────────────────────────┬──────────────────────────────────┬────────────────────────┘
                             │                                  │
                             ▼                                  ▼
┌────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│     PostgreSQL 16 + pgvector Database  │   │            Local File Storage             │
│ • HNSW Cosine Distance Index (<=>)     │   │ • 5 Đăng ký góc mặt (.jpg)                │
│ • Employees, FaceFeatures, Devices     │   │ • Ảnh chụp Snapshot thời gian thực        │
│ • AttendanceRecords, Requests (Đơn từ) │   │ • Trọng số AI: InsightFace & MiniFASNet   │
└────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 2. 🚀 Khởi Động Nhanh Hệ Thống (Khuyên Dùng)

Hệ thống được trang bị kịch bản tự động hóa [service.sh](file:///Users/hautp/Documents/Projects/v-face/service.sh) và `Makefile`:

### 2.1. Lệnh điều khiển chính

| Lệnh `service.sh` | Lệnh `make` | Chức năng |
| :--- | :--- | :--- |
| `./service.sh start` | `make start` | Tự động khởi chạy Database, Backend & Frontend |
| `./service.sh stop` | `make stop` | Tắt an toàn toàn bộ tiến trình |
| `./service.sh restart` | `make restart` | Khởi động lại toàn bộ dịch vụ |
| `./service.sh status` | `make status` | Kiểm tra PID, Port (8000, 5173, 5432) & tình trạng luồng |
| `./service.sh logs` | `make logs` | Xem stream log của cả Backend & Frontend |

### 2.2. Điều khiển riêng lẻ từng thành phần

```bash
# Quản lý Backend (Port 8000)
./service.sh restart backend
./service.sh logs backend      # Xem file log: logs/backend.log

# Quản lý Frontend (Port 5173)
./service.sh restart frontend
./service.sh logs frontend     # Xem file log: logs/frontend.log

# Quản lý PostgreSQL pgvector (Docker)
./service.sh restart db
```

---

## 3. 💻 Khởi Chạy Thủ Công (Dành cho Lập Trình Viên)

### Bước 1: Khởi động Cơ sở dữ liệu PostgreSQL + pgvector
```bash
docker compose up -d
```

### Bước 2: Khởi chạy Backend FastAPI
```bash
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/attendance`

### Bước 3: Khởi chạy Frontend React
```bash
cd frontend
npm install
npm run dev
```
- **Web App**: `http://localhost:5173`

---

## 4. 🌟 Các Nhóm Tính Năng Nổi Bật

### 4.1. 🖥️ Dashboard Giám Sát Trực Tiếp (Realtime Live Monitor)
- **3 Chế độ hiển thị linh hoạt + Toàn màn hình**:
  - **Tiêu chuẩn (Standard - 5/7)**: Cân đối giữa màn hình camera và bảng điểm danh.
  - **Mở rộng (Wide - 8/4)**: Màn hình camera chiếm 2/3 không gian làm việc.
  - **Toàn cảnh (Cinema - 12/12)**: Luồng camera trải rộng 100% chiều ngang phía trên; Thẻ nhận diện gần nhất & Bảng điểm danh đặt song song bên dưới.
  - **Fullscreen (`Maximize2`)**: Trình chiếu quầy lễ tân hoặc màn hình phòng bảo vệ.
- **HUD Bounding Box AI thời gian thực**:
  - 🟢 **Khung Xanh Lá**: Nhận diện đúng nhân viên + Mã NV + Tên tiếng Việt có dấu.
  - ✨ **Khung Vàng (Gold)**: Tự động học & cập nhật mẫu khuôn mặt mới nhất (`> 95%`).
  - 🟡 **Khung Cam (Amber)**: Nhân viên vừa điểm danh (Cooldown 5 phút chống spam).
  - 🔴 **Khung Đỏ (Stranger)**: Cảnh báo người lạ chưa có trong hồ sơ công ty.
  - 🚨 **Khung Đỏ Chớp Nháy**: Chặn hành vi gian lận (Anti-Spoofing).

### 4.2. 🛡️ Chống Giả Mạo (Anti-Spoofing) & Cảnh Báo Người Lạ (Stranger Alert)
- **Liveness Detection (MiniFASNetV2 + Moire FFT)**: Nhận diện và từ chối các hành vi đưa ảnh in, ảnh điện thoại hoặc iPad trước camera để chấm công hộ.
- **Stranger Alert**: Khi phát hiện người lạ xuất hiện liên tục trong 3 khung hình, hệ thống lập tức phát còi cảnh báo an ninh và bắn sự kiện WebSocket kèm ảnh chụp tức thì.

### 4.3. 👥 Đăng Ký Đa Mẫu & Tự Động Học Diện Mạo (Auto Face Update)
- **Đăng ký 5 góc mặt**: Hỗ trợ nạp 5 ảnh chân dung (Chính diện, Nghiêng trái, Nghiêng phải, Cúi nhẹ, Cười) giúp AI nhận diện cực nhạy từ mọi góc quay camera.
- **Tự học liên tục (Continuous Self-Learning)**: Khi nhân viên điểm danh với độ tin cậy $\ge 95\%$, hệ thống tự trích xuất vector mới nhất để lưu vào database, giúp hệ thống "tự thích nghi" khi nhân viên đổi kiểu tóc, đeo kính hoặc già đi theo thời gian.

### 4.4. 📝 Quản Lý Đơn Từ & Xử Lý Ngoại Lệ Chấm Công
- **Hỗ trợ 4 loại đơn**:
  1. `HALF_DAY_LEAVE_AM`: Nghỉ nửa ngày sáng (Tính 0.5 công).
  2. `HALF_DAY_LEAVE_PM`: Nghỉ nửa ngày chiều (Tính 0.5 công).
  3. `BUSINESS_TRIP`: Đi công tác ngoài giờ (Tính 1.0 công).
  4. `LATE_EXCUSE`: Giải trình đi trễ / về sớm có lý do (Tính 1.0 công, miễn trừ phạt).
- **Quy trình Duyệt/Từ chối**: Quản lý có thể xem lý do, ngày áp dụng và duyệt đơn trực tiếp.
- **Tự động tính công**: Đối chiếu đơn hợp lệ khi tổng hợp báo cáo ngày.

### 4.5. 📹 Quản Lý Thiết Bị Camera Tập Trung (CameraManager)
- **Quản lý đa luồng (Multi-threading)**: Kết nối đồng thời nhiều Camera RTSP (Tapo C200, Hikvision, Dahua) và Webcam FaceTime HD.
- **Bật/Tắt luồng từ xa**: Nút gạt Live Switch điều khiển trực tiếp trạng thái tiến trình backend qua API `PUT /api/v1/devices/{id}/toggle`.
- **Phân loại cổng**: Cấu hình mục đích cho từng camera: `CHECK_IN` (Cổng vào), `CHECK_OUT` (Cổng ra), `BOTH` (Hai chiều).

### 4.6. 📊 Dashboard Biểu Đồ Phân Tích Chuyên Sâu (HRM BI - Recharts)
- 📈 **LineChart**: Xu hướng tỷ lệ đi làm đúng giờ của 7/14/30 ngày gần nhất.
- 📊 **BarChart**: Thống kê số lượt đi muộn và tỷ lệ đi muộn của từng phòng ban.
- 🌊 **AreaChart**: Mật độ nhân viên chấm công theo các khung giờ 30 phút trong ngày.
- 📌 **Chỉ số KPI**: Tỷ lệ đúng giờ tuần, tổng lượt check-in hôm nay, khung giờ cao điểm, phòng ban chuyên cần nhất.

---

## 5. 📡 Danh Sách Endpoint REST API

| Nhóm | Phương thức | Endpoint | Mô tả |
| :--- | :---: | :--- | :--- |
| **Nhân viên** | `GET` | `/api/v1/employees` | Lấy danh sách nhân viên phân trang |
| | `POST` | `/api/v1/employees` | Thêm nhân viên mới |
| | `POST` | `/api/v1/employees/{id}/register-face` | Đăng ký vector khuôn mặt từ ảnh tải lên |
| | `DELETE` | `/api/v1/employees/{id}` | Xóa nhân viên |
| **Điểm danh** | `GET` | `/api/v1/attendance` | Tra cứu lịch sử chấm công |
| | `POST` | `/api/v1/attendance/check-in` | Chấm công qua ảnh tải lên |
| **Đơn từ** | `GET` | `/api/v1/requests` | Lấy danh sách đơn từ ngoại lệ |
| | `POST` | `/api/v1/requests` | Tạo đơn xin nghỉ / công tác / đi trễ |
| | `PUT` | `/api/v1/requests/{id}/approve` | Duyệt đơn |
| | `PUT` | `/api/v1/requests/{id}/reject` | Từ chối đơn |
| | `GET` | `/api/v1/requests/daily-summary` | Tổng hợp công theo ngày dựa trên đơn từ |
| **Thiết bị** | `GET` | `/api/v1/devices` | Lấy danh sách camera & telemetry |
| | `POST` | `/api/v1/devices` | Thêm camera RTSP / Webcam mới |
| | `PUT` | `/api/v1/devices/{id}/toggle` | Bật/Tắt luồng camera thời gian thực |
| | `PUT` | `/api/v1/devices/{id}` | Cập nhật cấu hình camera |
| | `DELETE` | `/api/v1/devices/{id}` | Xóa camera |
| **Phân tích BI**| `GET` | `/api/v1/analytics/weekly-punctuality` | Tỷ lệ đúng giờ 7 ngày gần nhất (LineChart) |
| | `GET` | `/api/v1/analytics/department-lateness`| Thống kê đi muộn theo phòng ban (BarChart) |
| | `GET` | `/api/v1/analytics/hourly-density` | Mật độ check-in theo khung giờ (AreaChart) |
| | `GET` | `/api/v1/analytics/summary` | Tổng hợp chỉ số KPI quản trị |
| **Camera & WS**| `GET` | `/api/v1/camera/status` | Tình trạng luồng video & chẩn đoán AI |
| | `GET` | `/api/v1/camera/video_feed` | Luồng video MJPEG kèm Bounding Box HUD |
| | `WS` | `/ws/attendance` | WebSocket bắn sự kiện check-in & cảnh báo |

---

## 6. ⚙️ Cấu Hình Môi Trường (.env)

| Biến môi trường | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `POSTGRES_SERVER` | `127.0.0.1` | Địa chỉ máy chủ PostgreSQL |
| `POSTGRES_PORT` | `5432` | Cổng kết nối cơ sở dữ liệu |
| `POSTGRES_USER` / `PASSWORD` | `postgres` / `postgres123` | Thông tin đăng nhập DB |
| `POSTGRES_DB` | `vface_db` | Tên Database |
| `FACE_MODEL_NAME` | `buffalo_l` | Mô hình InsightFace (ArcFace 512D) |
| `CAMERA_BLUR_THRESHOLD` | `15.0` | Ngưỡng lọc nhòe chuyển động |
| `CAMERA_MIN_FACE_SIZE` | `60` | Kích thước khuôn mặt tối thiểu (px) |
| `CAMERA_SIMILARITY_THRESHOLD`| `0.58` | Ngưỡng chấp thuận nhận diện khuôn mặt |
| `LIVENESS_THRESHOLD` | `0.50` | Ngưỡng xác thực thực thể sống Anti-Spoofing |
| `STRANGER_CONFIDENCE_THRESHOLD`| `0.70` | Ngưỡng cảnh báo người lạ |
| `STRANGER_CONSECUTIVE_FRAMES` | `3` | Số khung hình liên tiếp kích hoạt cảnh báo người lạ |
| `STRANGER_COOLDOWN_SECONDS` | `60` | Thời gian cooldown chống spam cảnh báo người lạ |
