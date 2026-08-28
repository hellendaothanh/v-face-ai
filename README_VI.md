<div align="center">

# V-Face Pro: Hệ Sinh Thái Microservices Doanh Nghiệp (Face AI, Core User IAM, HRM & Helpdesk)

[🇻🇳 Tiếng Việt](README_VI.md) | [🇬🇧 English](README.md)

---

</div>

**V-Face Pro** là hệ sinh thái Microservices chuẩn Enterprise phục vụ chuyển đổi số doanh nghiệp toàn diện. Hệ thống kết hợp giữa **FastAPI Backend (Python 3.13)** và **React 19 + Tailwind CSS**, tích hợp **PostgreSQL 16 pgvector** (Vector 512D ArcFace), mô hình AI **InsightFace (buffalo_l)**, công nghệ chống gian lận **Anti-Spoofing MiniFASNetV2**, **Phát hiện người lạ (Stranger Alert)**, **Quản lý đa Camera RTSP**, và microservice độc lập **Core User & IAM Service (Port 8001)** làm nền tảng xác thực tập trung, phân quyền RBAC đa cấp, quản lý cơ cấu tổ chức và sẵn sàng tích hợp các phân hệ **HRM** và **Helpdesk**.

---

## 1. 🏗️ Kiến Trúc Hệ Thống Microservices

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts (Port 5173)      │
│  ┌───────────────────────┬──────────────────────┬───────────────────────────────────┐  │
│  │  Realtime Dashboard   │   HRM & Attendance   │   Camera Devices & BI Analytics   │  │
│  │ • 3 View Modes+Fullscr│ • 5-Photo Multi-Face │ • Multi-Device RTSP Switcher      │  │
│  │ • Bounding Box HUD    │ • Đơn từ & Ngoại lệ  │ • Weekly Line / Dept Bar / Hourly │  │
│  └───────────────────────┴──────────────────────┴───────────────────────────────────┘  │
└────────────────────────────▲──────────────────────────────────▲────────────────────────┘
                             │ REST API (Axios)                 │ WebSocket (/ws/attendance)
                             ▼                                  ▼
┌──────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│      Core User & IAM Service (Port 8001)     │   │      Face AI Attendance Service (Port 8000)│
│ ──────────────────────────────────────────── │   │ ────────────────────────────────────────── │
│ • Quản lý JWT Token & Refresh Token (Auth)   │   │ • Quản lý đa luồng Camera RTSP & Webcam    │
│ • Phân quyền vai trò RBAC (Roles/Permissions)│   │ • Trích xuất & So khớp ArcFace 512D        │
│ • Hồ sơ Người dùng & Mã nhân viên dùng chung │   │ • Chống giả mạo MiniFASNetV2 Liveness      │
│ • Cơ cấu Phòng ban (Departments) & Chức vụ   │   │ • Tự học & Cập nhật mẫu mặt tự động (>95%) │
│ • Nền tảng Identity cho HRM & Helpdesk       │   │ • Báo động người lạ & WebSocket thời gian  │
└──────────────────────┬───────────────────────┘   └─────────────────────┬──────────────────────┘
                       │                                                 │
                       ▼                                                 ▼
┌────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│     PostgreSQL 16 + pgvector Database  │   │            Local File Storage             │
│ • Users, Profiles, Roles, Permissions  │   │ • 5 Đăng ký góc mặt (.jpg)                │
│ • Sơ đồ Phòng ban, Chức vụ, Cấp bậc    │   │ • Ảnh chụp Snapshot thời gian thực        │
│ • HNSW Vector Index (<=>), Điểm danh   │   │ • Trọng số AI: InsightFace & MiniFASNet   │
└────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 2. 🚀 Khởi Động Nhanh & Điều Khiển Hệ Thống

Hệ thống cung cấp kịch bản điều khiển tự động hóa hoàn chỉnh cho cả **Windows PowerShell** (`service.ps1`) và **Linux/macOS Bash** (`service.sh`) cùng `Makefile`.

### 2.1. Bảng lệnh điều khiển chính

| Thao tác | Windows PowerShell (`service.ps1`) | Linux/macOS (`service.sh`) | Lệnh `make` | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| **Bật tất cả** | `.\service.ps1 start` | `./service.sh start` | `make start` | Tự động chạy DB, Core User, Face AI & Frontend |
| **Tắt tất cả** | `.\service.ps1 stop` | `./service.sh stop` | `make stop` | Tắt an toàn toàn bộ tiến trình hệ thống |
| **Khởi động lại** | `.\service.ps1 restart` | `./service.sh restart` | `make restart` | Khởi động lại toàn bộ services |
| **Kiểm tra trạng thái** | `.\service.ps1 status` | `./service.sh status` | `make status` | Kiểm tra PID, Ports (8001, 8000, 5173, 5432) |
| **Xem realtime logs** | `.\service.ps1 logs` | `./service.sh logs` | `make logs` | Xem stream log của tất cả các service |

### 2.2. Điều khiển chi tiết từng Microservice

```powershell
# Ví dụ trên Windows PowerShell:
.\service.ps1 start core-user      # Bật riêng Core User Service (Port 8001)
.\service.ps1 logs core-user       # Xem trực tiếp log của Core User Service
.\service.ps1 restart backend      # Khởi động lại Face AI Backend (Port 8000)
.\service.ps1 start frontend       # Khởi động Web App React (Port 5173)
```

```bash
# Ví dụ trên Linux / macOS:
./service.sh start core-user       # Bật riêng Core User Service (Port 8001)
./service.sh logs core-user        # Xem trực tiếp log của Core User Service
./service.sh restart backend       # Khởi động lại Face AI Backend (Port 8000)
./service.sh start frontend        # Khởi động Web App React (Port 5173)
```

---

## 3. 🌐 Danh Mục Dịch Vụ & Tài Liệu API

| Dịch vụ | Port | Địa chỉ Base URL | Tài liệu Swagger API | Vai trò |
| :--- | :---: | :--- | :--- | :--- |
| **Core User & IAM** | `8001` | `http://localhost:8001` | [http://localhost:8001/docs](http://localhost:8001/docs) | Xác thực JWT, RBAC, Quản lý User, Cơ cấu tổ chức |
| **Face AI Attendance** | `8000` | `http://localhost:8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Nhận diện khuôn mặt, Stream Camera, Chấm công |
| **Frontend Web App** | `5173` | `http://localhost:5173` | - | Giao diện Dashboard, Giám sát và Quản trị |

### Tài khoản Quản trị viên khởi tạo mặc định:
- **Tên đăng nhập / Email:** `admin` / `admin@vface.ai`
- **Mật khẩu ban đầu:** `admin123`
- **Mã nhân viên:** `EMP000`
- **Vai trò:** `superadmin` (Toàn quyền hệ thống)

---

## 4. 🌟 Các Phân Hệ & Tính Năng Nổi Bật

### 4.1. 🔑 Phân Hệ Core User & IAM (`services/core-user` - Port 8001)
- **Quản lý Định danh & Phiên đăng nhập (IAM)**: Cấp phát JWT Access Token và Refresh Token, băm mật khẩu chuẩn `bcrypt`.
- **Phân quyền vai trò chi tiết (RBAC)**: Định nghĩa 14+ Permissions cấp độ module (`core_user`, `attendance`, `hrm`, `helpdesk`) và cấu hình 5 Roles mặc định (`superadmin`, `hr_manager`, `dept_manager`, `it_support`, `employee`).
- **Hồ sơ Người dùng (User & Profile)**: Mã nhân viên chuẩn hóa (`user_code`), thông tin cá nhân, CCCD/CMND, avatar, liên hệ.
- **Cơ cấu Tổ chức Doanh nghiệp**: Quản lý cây Phòng ban cha - con (Departments), gán Trưởng phòng (Manager), chức danh và cấp bậc (Positions & Levels).

### 4.2. 👁️ Phân Hệ Face AI Chấm Công (`app/` - Port 8000)
- **AI ArcFace 512D**: Nhận diện siêu tốc với pgvector HNSW Index.
- **Anti-Spoofing MiniFASNetV2**: Chống gian lận qua hình ảnh chụp hoặc video phát lại từ màn hình điện thoại.
- **Cơ chế Tự học (Auto Face Update)**: Tự động bổ sung vector khuôn mặt mới khi nhân viên điểm danh đạt độ tin cậy $\ge 95\%$.
- **Cảnh báo Người lạ (Stranger Alert)**: Phát hiện khuôn mặt lạ trong 3 khung hình liên tiếp, kích hoạt còi hú và cảnh báo WebSocket.
- **Quản lý Đa Camera RTSP**: Xử lý đa luồng độc lập cho từng Camera lối vào/lối ra.

---

## 5. 📡 Tóm Tắt Danh Mục Endpoints API

### Core User & IAM Endpoints (Port 8001)
- `POST /api/v1/auth/login` - Đăng nhập tài khoản & Nhận JWT Tokens
- `POST /api/v1/auth/refresh` - Cấp mới Access Token bằng Refresh Token
- `GET /api/v1/auth/me` - Lấy thông tin tài khoản, danh sách Roles và Permissions
- `POST /api/v1/auth/change-password` - Đổi mật khẩu
- `GET /api/v1/users` - Danh sách người dùng (tìm kiếm, lọc theo phòng ban, trạng thái)
- `POST /api/v1/users` - Tạo người dùng mới và phân vai trò
- `GET /api/v1/rbac/roles` - Quản lý danh sách vai trò và gán quyền
- `GET /api/v1/rbac/permissions` - Danh sách toàn bộ quyền hạn hệ thống
- `GET /api/v1/organization/departments` - Danh sách phòng ban
- `GET /api/v1/organization/positions` - Danh sách chức vụ

### Face AI & Chấm Công Endpoints (Port 8000)
- `GET /api/v1/employees` - Danh sách hồ sơ khuôn mặt nhân viên
- `POST /api/v1/employees/{id}/register-face` - Đăng ký mẫu khuôn mặt 512D
- `GET /api/v1/attendance` - Lịch sử điểm danh và lọc dữ liệu
- `POST /api/v1/attendance/check-in` - Chấm công thủ công qua ảnh
- `GET /api/v1/devices` - Quản lý thiết bị Camera RTSP
- `GET /api/v1/analytics/summary` - Báo cáo chỉ số KPI chấm công
- `WS /ws/attendance` - Luồng WebSocket cập nhật điểm danh thời gian thực

---

## 6. 📄 Bản Quyền & Đóng Góp

Phát triển với ❤️ vì mục tiêu tự động hóa và quản trị thông minh cho doanh nghiệp. Sử dụng các công nghệ mã nguồn mở [InsightFace](https://github.com/deepinsight/insightface), [pgvector](https://github.com/pgvector/pgvector), [FastAPI](https://fastapi.tiangolo.com/) và [React](https://react.dev/).
