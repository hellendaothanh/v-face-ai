<div align="center">

# V-Face Pro: Hệ Sinh Thái Microservices Doanh Nghiệp (Face AI, Core User IAM, HRM & Helpdesk)

[Tiếng Việt](README_VI.md) | [English](README.md)

---

</div>

**V-Face Pro** là hệ sinh thái Microservices chuẩn Enterprise phục vụ chuyển đổi số doanh nghiệp toàn diện. Hệ thống kết hợp giữa **FastAPI Backend (Python 3.13)** và **React 19 + Tailwind CSS**, vận hành trên nền tảng động cơ **AI ArcFace Core v1.4.0** (mô hình **InsightFace buffalo_l** trích xuất vector 512D, cơ sở dữ liệu **PostgreSQL 16 pgvector HNSW Index**), công nghệ chống gian lận **Anti-Spoofing MiniFASNetV2 Liveness**, **Phát hiện người lạ (Stranger Alert)**, **Quản lý đa Camera RTSP**, và microservice độc lập **Core User & IAM Service (Port 8001)** làm nền tảng xác thực tập trung, phân quyền RBAC đa cấp, quản lý cơ cấu tổ chức và sẵn sàng tích hợp các phân hệ **HRM** và **Helpdesk**.

---

## 1. Kiến Trúc Hệ Thống Microservices

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts (Port 3000)      │
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

<div align="center">

![Bàn làm việc Giám sát & Chấm công Realtime](docs/screenshots/dashboard.png)
*Hình 1: Không gian Bàn làm việc Giám sát Điểm danh & Luồng Camera Realtime của V-Face Pro*

</div>

---

## 2. Hướng Dẫn Khởi Động & Điều Khiển Dịch Vụ

Hệ thống cung cấp kịch bản điều khiển tự động hóa hoàn chỉnh cho cả **Windows PowerShell** (`service.ps1`), **Linux/macOS Bash** (`service.sh`) và `Makefile`.

### 2.1. Bảng lệnh điều khiển chính

| Thao tác | Windows PowerShell (`service.ps1`) | Linux/macOS (`service.sh`) | Lệnh `make` | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| **Khởi động toàn bộ** | `.\service.ps1 start` | `./service.sh start` | `make start` | Tự động chạy PostgreSQL, Core User, Face AI & Frontend |
| **Dừng toàn bộ** | `.\service.ps1 stop` | `./service.sh stop` | `make stop` | Dừng an toàn toàn bộ tiến trình hệ thống |
| **Khởi động lại** | `.\service.ps1 restart` | `./service.sh restart` | `make restart` | Khởi động lại toàn bộ services |
| **Kiểm tra trạng thái** | `.\service.ps1 status` | `./service.sh status` | `make status` | Kiểm tra PID, Listening Ports (8001, 8000, 3000, 5432) |
| **Xem logs thời gian thực**| `.\service.ps1 logs` | `./service.sh logs` | `make logs` | Xem stream log của tất cả các service |

### 2.2. Điều khiển chi tiết từng Microservice

```powershell
# Windows PowerShell:
.\service.ps1 start core-user      # Khởi động riêng Core User Service (Port 8001)
.\service.ps1 logs core-user       # Xem trực tiếp log của Core User Service
.\service.ps1 restart backend      # Khởi động lại Face AI Backend (Port 8000)
.\service.ps1 start frontend       # Khởi động Web App React (Port 3000)
```

```bash
# Linux / macOS:
./service.sh start core-user       # Khởi động riêng Core User Service (Port 8001)
./service.sh logs core-user        # Xem trực tiếp log của Core User Service
./service.sh restart backend       # Khởi động lại Face AI Backend (Port 8000)
./service.sh start frontend        # Khởi động Web App React (Port 3000)
```

---

## 3. Danh Mục Dịch Vụ & Tài Liệu API

| Dịch vụ | Cổng (Port) | Base URL | Swagger Docs | Chức năng chính |
| :--- | :---: | :--- | :--- | :--- |
| **Core User & IAM** | `8001` | `http://localhost:8001` | [http://localhost:8001/docs](http://localhost:8001/docs) | Xác thực JWT, RBAC, Quản lý User, Cơ cấu tổ chức |
| **Face AI Attendance** | `8000` | `http://localhost:8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Nhận diện khuôn mặt, Stream Camera, Chấm công |
| **Frontend Web App** | `3000` | `http://localhost:3000` | - | Giao diện Dashboard, Giám sát và Quản trị |

### Tài khoản Quản trị viên mặc định:
- **Tên đăng nhập / Email:** `admin` / `admin@vface.ai`
- **Mật khẩu ban đầu:** `admin123`
- **Mã nhân viên:** `EMP000`
- **Vai trò:** `superadmin` (Toàn quyền hệ thống)

---

## 4. Các Phân Hệ & Tính Năng Chi Tiết

### 4.1. Giám Sát Sức Khỏe Hệ Thống (System Health Matrix)
- **Theo dõi độ trễ & Uptime thời gian thực**: Màn hình `System Health Matrix` cho phép theo dõi trực quan trạng thái hoạt động (Live/Dead), độ trễ phản hồi (Latency tính bằng ms), và phiên bản của từng microservice độc lập.
- **Kiểm soát toàn diện các thành phần**:
  - **Core User & IAM Service (Port 8001)**: Giám sát phản hồi API xác thực, tải người dùng và trạng thái phân quyền.
  - **Face AI Attendance Backend (Port 8000)**: Theo dõi tình trạng kết nối AI Engine (InsightFace warm-up) và camera worker pool.
  - **PostgreSQL 16 pgvector (Port 5432)**: Kiểm tra trạng thái kết nối cơ sở dữ liệu và extension vector HNSW.
  - **Realtime WebSocket Server**: Đảm bảo luồng sự kiện `/ws/attendance` hoạt động ổn định.

### 4.2. Hệ Thống ITIL Helpdesk & Service Desk (`services/core-user` - Port 8001)
- **Quản lý sự cố chuẩn ITIL (Incident & Service Request)**: Tạo và theo dõi vòng đời Ticket (`Open` ➜ `In Progress` ➜ `Resolved` ➜ `Closed`).
- **Ma trận SLA tự động 4 cấp (P1 đến P4)**:
  - Phân cấp ưu tiên tự động dựa trên mức độ **Tác động (Impact)** và **Khẩn cấp (Urgency)**: `P1 - Critical` (SLA < 1h), `P2 - High` (SLA < 4h), `P3 - Medium` (SLA < 8h), `P4 - Low` (SLA < 24h).
- **Hệ thống thẻ phân loại ngữ cảnh**: Gắn thẻ danh mục sự cố đa chiều (`#camera`, `#network`, `#iam`, `#hardware`, `#attendance`) giúp phân luồng xử lý nhanh cho đội ngũ IT.
- **Nhật ký kỹ thuật & Đánh giá hài lòng CSAT**: Hỗ trợ trao đổi bình luận giữa người dùng và chuyên viên IT, kèm đánh giá sao CSAT (1-5 sao) sau khi đóng Ticket.
- **Cơ sở tri thức (Knowledge Base)**: Kho giải pháp tự phục vụ (Self-service) với trình soạn thảo Markdown, hỗ trợ tìm kiếm và phân loại bài viết.

### 4.3. Quản Lý Đơn Từ & Ngoại Lệ Chấm Công (HRM Exceptions)
- **Đa dạng loại đơn từ nhân sự**:
  - **Nghỉ phép cả ngày / Nghỉ nửa ngày (Full/Half-day Leave)**: Phép năm, phép ốm, việc riêng có hưởng lương/không lương.
  - **Đi công tác (Business Trip / On-site)**: Đăng ký chấm công ngoại vi khi làm việc tại văn phòng khách hàng hoặc công trường.
  - **Giải trình đi muộn / Về sớm (Late / Early Excuse)**: Bổ sung lý do phát sinh sự cố giao thông, cá nhân để miễn trừ phạt chuyên cần.
  - **Đăng ký làm thêm giờ (Overtime - OT)**: Ghi nhận giờ làm việc ngoài giờ chuẩn.
- **Quy trình phê duyệt phân cấp (Approval Workflow)**: Trưởng phòng (Department Manager) và HR Manager có quyền phê duyệt (`Approved`) hoặc từ chối (`Rejected`) kèm ghi chú phản hồi.
- **Báo cáo tổng hợp ngày (Daily Summary)**: Thống kê tức thì tỷ lệ nhân sự có mặt, vắng mặt, đi công tác và các trường hợp đang chờ duyệt.

### 4.4. Đăng Nhập Sinh Trắc Học Face ID 1-Chạm (`app/` - Port 8000 & `services/core-user` - Port 8001)
- **Đăng nhập đa phương thức**: Cho phép người dùng chuyển đổi linh hoạt giữa Mật khẩu truyền thống và **Face ID AI 1-Chạm**.
- **Giao diện HUD Sinh trắc học Trực quan**: Khung quét webcam trực tiếp với khung oval căn chỉnh khuôn mặt, vạch quét quang học và kích hoạt camera mượt mà.
- **Quy trình bảo mật 3 lớp**:
  1. **Chống giả mạo Anti-Spoofing Liveness (MiniFASNetV2 ONNX)**: Tự động loại bỏ ảnh in giấy, màn hình điện thoại và video tái tạo (ngưỡng tin cậy $<0.35$).
  2. **Trích xuất 512D ArcFace & So khớp đa mẫu pgvector**: Tìm kiếm vector có khoảng cách Cosine Distance (`<=>`) gần nhất trong 5 góc mặt đã đăng ký.
  3. **Ủy quyền Token liên microservice**: Gọi tự động sang Core User Service (`POST /api/v1/auth/face-token`) để phát hành cặp JWT Access/Refresh Token chuẩn.
- **Tự động chuyển hướng**: Khi xác thực thành công, hệ thống chào mừng đích danh nhân viên và chuyển thẳng vào Dashboard.

<div align="center">

![Đăng nhập Sinh trắc học Face ID 1-Chạm](docs/screenshots/login_face_id.png)
*Hình 2: Đăng nhập Sinh trắc học Face ID 1-Chạm kết hợp HUD Chống giả mạo Liveness & Chuyển ngôn ngữ*

</div>

### 4.5. Trung Tâm Quản Trị Nhân Sự & Sinh Trắc Học Tập Trung (`UnifiedHRHub` - Cổng 3000 & 8001)

Phân hệ **Unified HR Hub** tập trung hóa toàn bộ nghiệp vụ quản trị nhân sự, trích xuất sinh trắc học và phân quyền bảo mật IAM qua 3 tab chức năng trực quan:

<div align="center">

![Trung tâm Quản trị Nhân sự & Sinh trắc học](docs/screenshots/hr_hub.png)
*Hình 3: Giao diện Trung tâm Quản trị Nhân sự & Sinh trắc học (Hồ sơ, Mẫu Vector 512D & Đồng bộ IAM)*

</div>

#### Tab 1: Hồ Sơ Nhân Sự & Danh Sách Face AI 512D (Personnel & Face AI 512D Roster)
- **Quản lý danh bạ nhân sự**: Tra cứu hồ sơ nhanh, bộ lọc phòng ban, trạng thái làm việc và liên kết dữ liệu định danh với tài khoản Core User IAM.
- **Thu thập sinh trắc 5 góc độ (5 Templates / Nhân sự)**: Quy trình thu thập 5 góc mặt tiêu chuẩn (Chính diện 0°, Hướng lên +15°, Hướng xuống -15°, Nghiêng trái -30°, và Nghiêng phải +30°) kèm chỉ dẫn trực quan.
- **Modal kiểm tra sinh trắc trực tiếp (Live Verification Modal)**: Cho phép chụp thử và so khớp tức thì với kho vector `PostgreSQL pgvector` để kiểm tra độ tin cậy (`confidence %`) và khoảng cách Cosine Similarity (`POST /api/v1/employees/{id}/verify-face`).

#### Tab 2: Vai Trò & Phân Quyền Hạt Nhân RBAC (RBAC Roles & Granular Permissions)
- **Ma trận 14 mã quyền nguyên tử**: Phân quyền chi tiết theo từng nghiệp vụ (`User`, `Attendance`, `Camera`, `RBAC`, `Organization`, `Helpdesk`).
- **Bảo mật chống leo thang đặc quyền**: Ngăn chặn tài khoản cấp dưới tự gán quyền quản trị, bảo vệ vai trò hệ thống bất biến (`superadmin`).

#### Tab 3: Cơ Cấu Tổ Chức & Chức Danh (Organizational Structure)
- **Quản lý sơ đồ tổ chức**: Quản lý danh mục Phòng ban (`Departments`), Chức danh (`Positions`) và theo dõi số lượng nhân sự trực thuộc từng đơn vị.

### 4.6. Phân Hệ Face AI & Giám Sát Camera Realtime (AI ArcFace Core v1.4.0 - Cổng 8000)
- **Động cơ AI ArcFace Core v1.4.0**: Tích hợp mô hình nhận diện **InsightFace (buffalo_l)** trích xuất vector 512 chiều, kết hợp cơ sở dữ liệu **PostgreSQL 16 pgvector HNSW Index** cho tốc độ so khớp mili-giây.
- **Cơ chế tự học (Auto Face Update / Continuous Learning)**: Tự động trích xuất và cập nhật vector khuôn mặt phụ trợ khi nhân viên điểm danh đạt độ tin cậy $\ge 95\%$.
- **Chế độ xem Stream linh hoạt (Camera View Modes)**:
  - **3 Tỉ lệ khung hình**: `Standard` (4:3 chuẩn nét), `Wide` (16:9 mở rộng), và `Cinema` (21:9 màn ảnh rộng).
  - **HUD Bounding Box & Fullscreen**: Khung nhận diện hiển thị tên, mã nhân viên, độ tương đồng % và trạng thái check-in thời gian thực.
- **Cơ chế chống Anti-Spam & Debounce cảnh báo người lạ (Stranger Threat)**:
  - **Ngưỡng phát hiện người lạ**: Nhận diện khuôn mặt có độ tương đồng $< 70\%$.
  - **Bộ lọc 3 khung hình liên tiếp (3-Frame Counter)**: Ngăn chặn cảnh báo giả do người đi lướt qua hoặc bóng mờ chuyển động.
  - **Bộ đệm Cooldown 60 giây (Debounce Anti-Spam)**: Tránh spam còi hú báo động liên tục và tối ưu băng thông WebSocket.

### 4.7. Thanh Điều Khiển Header Thông Minh & Tinh Gọn Theo Ngữ Cảnh
- **Cơ chế hiển thị Camera theo ngữ cảnh**: Thanh Header chỉ tự động hiển thị cụm điều khiển Camera (`[PC Webcam] / [IP Cam]` và nút `[Bật / Tắt Camera]`) **duy nhất tại màn hình Giám sát Chấm công (Realtime Dashboard)**, đồng thời tự động ẩn đi trên các màn hình quản trị, báo cáo, ca kíp & tiền lương để giữ giao diện luôn thoáng mắt và tập trung.
- **Tiện ích định danh & Ngôn ngữ toàn cục**: Đổi nhanh ngôn ngữ (`[EN] / [VI]`), đèn LED báo trạng thái kết nối máy chủ API thời gian thực, avatar người dùng và nút Đăng xuất 1-chạm.

### 4.8. Quản Lý Hồ Sơ Cá Nhân, Sinh Trắc Học Tự Phục Vụ & Mật Khẩu (My Account Self-Service)
- **Giao diện toàn màn hình trực quan ("Tài Khoản Của Tôi")**: Dành riêng một tab trên thanh điều hướng Sidebar cho phép mọi người dùng đã đăng nhập tự quản lý hồ sơ cá nhân và sinh trắc học.
- **Thẻ định danh nổi bật (Hero Identity Banner)**: Hiển thị avatar ký tự viết tắt, Tên tài khoản, Mã nhân viên/User code, Huy hiệu chức danh phòng ban, các huy hiệu vai trò RBAC (`superadmin`, `admin`, `hr_manager`, v.v.), và đồng hồ đếm số lượng vector Face AI đã nạp (`5/5 mẫu`).
- **Phân hệ Sinh Trắc Học & Tự Xác Thực Khuôn Mặt (Self-Service Face AI Hub)**:
  - **Modal Tự Kiểm Tra Xác Thực Trực Tiếp**: Nhân viên có thể tự bật webcam cá nhân để kiểm tra độ khớp sinh trắc học với 5 vector 512D lưu trong PostgreSQL pgvector (`POST /api/v1/employees/{id}/verify-face`) mà không cần nhờ HR hỗ trợ.
  - **Modal Tự Nạp 5 Mẫu Góc Mặt**: Hướng dẫn 5 góc xoay mặt chuẩn (Chính diện 0°, Ngẩng +15°, Cúi -15°, Nghiêng trái -30°, Nghiêng phải +30°) giúp nhân viên tự chụp webcam hoặc tải ảnh để cập nhật mẫu mặt mọi lúc.
  - **Tự động liên kết hồ sơ Face AI**: Cung cấp nút tạo và liên kết nhanh hồ sơ sinh trắc học cho tài khoản Core User IAM mới.
- **Tự cập nhật thông tin cá nhân**: Cho phép chỉnh sửa Họ và tên, Số điện thoại với cơ chế tự động đồng bộ 2 chiều giữa Core User IAM và Face AI Employee. Khóa các trường nhạy cảm như Email và Mã nhân viên để đảm bảo toàn vẹn dữ liệu.
- **Tự đổi mật khẩu bảo mật (Self-service Password Change)**:
  - Xác thực mật khẩu cũ an toàn.
  - Kiểm tra độ dài mật khẩu mới (tối thiểu 6 ký tự) và so khớp mật khẩu xác nhận.
  - Hỗ trợ nút bật/tắt ẩn hiện mật khẩu và mã hóa một chiều bằng thuật toán `bcrypt`.

### 4.9. Phân Quyền Đa Lớp Chuẩn Doanh Nghiệp Zero-Trust (RBAC & ABAC Data Scoping)
- **Mô hình bảo mật 3 lớp (Defense-in-Depth Authorization)**:
  - **Lớp 1 (Gateway / Core IAM)**: Kiểm tra chữ ký số JWT, thời hạn Token (Expiration), và trạng thái tài khoản kích hoạt.
  - **Lớp 2 (Hạt nhân Atomic RBAC)**: Quản lý quyền theo 14 mã quyền nguyên tử (`RequirePermission(...)`, `require_permissions(...)`). Tự động trích xuất các quyền từ các vai trò gán vào User.
  - **Lớp 3 (Phân vùng dữ liệu ABAC Row-Level Security)**:
    - `Superadmin` và `HR Manager`: Toàn quyền tra cứu hồ sơ nhân sự trên toàn hệ thống.
    - `Trưởng Phòng (Department Manager)`: Hệ thống tự động khóa phạm vi truy vấn `department_id == current_user.department_id`, **ngăn chặn tuyệt đối việc xem dữ liệu nhân viên thuộc phòng ban khác**.
- **Ma trận chống leo thang đặc quyền (Anti-Privilege Escalation)**:
  - Người dùng không có quyền quản trị tối cao không thể tạo hoặc chỉnh sửa Role chứa các quyền vượt quá quyền hạn của chính họ.
  - Ngăn chặn người dùng cấp dưới tự ý gán vai trò `superadmin` cho tài khoản khác.
  - Khóa bất biến vai trò hệ thống mặc định (`superadmin` không thể bị sửa hoặc xóa).
  - Chống người dùng tự xóa tài khoản của chính mình và chống tài khoản cấp dưới xóa tài khoản Superadmin.

### 4.10. Hỗ Trợ Đa Ngôn Ngữ Toàn Diện (Full i18n Localization)
- **Chuyển đổi ngôn ngữ tức thì**: Hỗ trợ chuyển đổi 2 chiều mượt mà giữa **Tiếng Việt (`[VI]`)** và **Tiếng Anh (`[EN]`)** tại Header toàn cục và màn hình Đăng nhập.
- **Bản địa hóa 100% giao diện**: Dịch chuẩn hóa toàn bộ nhãn biểu mẫu, bảng dữ liệu, thông điệp hướng dẫn HUD sinh trắc học, thông báo lỗi toast và định dạng ngày giờ theo vùng địa lý.

### 4.11. Tiện Ích Giao Diện Nút Cuộn Lên Đầu Trang Thông Minh (Smart Up-to-Top Button)
- **Thiết kế Glassmorphism & Neon Glow**: Nút nổi tròn bo góc mềm mại (`fixed bottom-7 right-7 z-50`) với viền dạ quang Indigo phản chiếu trên nền tối.
- **Vòng tròn SVG đo lường tiến độ cuộn trang (Scroll Progress Meter)**: Đo lường chính xác phần trăm trang đã cuộn và hiển thị vòng cung sáng quanh icon mũi tên.
- **Cơ chế ẩn/hiện thông minh & Vi tương tác (Micro-animations)**:
  - Tự động ẩn khi ở đầu trang và chỉ hiển thị khi cuộn xuống quá `240px`.
  - Hiển thị Tooltip Badge báo tiến độ `% • Lên đầu trang` khi rê chuột.
  - Hiệu ứng cuộn mượt mà (`smooth scroll`) đưa người dùng về đầu trang ngay lập tức khi click.

---

## 5. Danh Mục Endpoints API

### Core User, IAM & Helpdesk Endpoints (Port 8001)
- `POST /api/v1/auth/login` - Đăng nhập tài khoản & Nhận JWT Tokens
- `POST /api/v1/auth/face-token` - Cấp phát JWT token cho người dùng đã xác minh Face ID
- `POST /api/v1/auth/refresh` - Cấp mới Access Token bằng Refresh Token
- `GET /api/v1/auth/me` - Lấy thông tin tài khoản, danh sách Roles và Permissions
- `POST /api/v1/auth/change-password` - Đổi mật khẩu
- `GET /api/v1/users` - Danh sách người dùng (tìm kiếm, lọc theo phòng ban, trạng thái)
- `POST /api/v1/users` - Tạo người dùng mới và phân vai trò
- `GET /api/v1/rbac/roles` - Quản lý danh sách vai trò và gán quyền
- `GET /api/v1/rbac/permissions` - Danh sách toàn bộ quyền hạn hệ thống
- `GET /api/v1/organization/departments` - Danh sách phòng ban
- `GET /api/v1/organization/positions` - Danh sách chức vụ
- `GET /api/v1/helpdesk/tickets` - Danh sách & bộ lọc Ticket hỗ trợ ITIL
- `POST /api/v1/helpdesk/tickets` - Gửi yêu cầu hỗ trợ / Báo cáo sự cố mới
- `PATCH /api/v1/helpdesk/tickets/{id}` - Cập nhật trạng thái và giải pháp xử lý
- `POST /api/v1/helpdesk/tickets/{id}/comments` - Thêm bình luận trao đổi kỹ thuật
- `POST /api/v1/helpdesk/tickets/{id}/feedback` - Gửi đánh giá hài lòng CSAT
- `GET /api/v1/helpdesk/kb/categories` - Danh mục bài viết tri thức KB
- `GET /api/v1/helpdesk/kb/articles` - Tra cứu các bài viết giải pháp chuẩn
- `POST /api/v1/helpdesk/kb/articles` - Đăng bài viết tri thức mới
- `PUT /api/v1/helpdesk/kb/articles/{id}` - Chỉnh sửa bài viết tri thức
- `DELETE /api/v1/helpdesk/kb/articles/{id}` - Xóa bài viết tri thức
- `POST /api/v1/helpdesk/kb/articles/{id}/helpful` - Đánh giá bài viết hữu ích
- `GET /health` - Kiểm tra sức khỏe microservice Core User & IAM

### Face AI, HRM & Quản Trị Doanh Nghiệp Endpoints (Port 8000)
- `POST /api/v1/auth/face-login` - Đăng nhập Face ID 1-chạm kết hợp Anti-Spoofing & IAM Token Proxy
- `GET /api/v1/employees` - Danh sách hồ sơ khuôn mặt nhân viên
- `POST /api/v1/employees/{id}/register-face` - Đăng ký mẫu khuôn mặt 512D (5 góc độ)
- `POST /api/v1/employees/{id}/verify-face` - Xác minh trực tiếp mẫu mặt với kho pgvector
- `GET /api/v1/attendance` - Lịch sử điểm danh và bộ lọc đa tiêu chí
- `POST /api/v1/attendance/check-in` - Chấm công thủ công qua ảnh upload
- `POST /api/v1/attendance/mobile-checkin` - Điểm danh di động định vị GPS Haversine & xác thực Wi-Fi BSSID
- `GET /api/v1/shifts` - Danh sách ca làm việc (Ca tiêu chuẩn, Ca gãy, Ca xoay, Ca đêm)
- `POST /api/v1/shifts` - Tạo mới ca làm việc (Hỗ trợ cấu hình ca gãy và chu kỳ ca xoay)
- `POST /api/v1/shifts/auto-match` - Thuật toán tự động so khớp ca tối ưu theo giờ check-in thực tế
- `POST /api/v1/shifts/assignments` - Phân bổ ca làm việc cho nhân viên
- `POST /api/v1/payroll/calculate` - Động cơ tự động tính bảng công và tiền lương hàng tháng
- `GET /api/v1/payroll/records` - Tra cứu dữ liệu bảng lương đã tính theo tháng/năm
- `GET /api/v1/payroll/export-csv` - Xuất bảng lương dạng file CSV (UTF-8 BOM)
- `GET /api/v1/reports/attendance/export` - Xuất báo cáo chấm công đa định dạng (Excel `.xlsx`, PDF `.pdf`, CSV `.csv`)
- `GET /api/v1/reports/violations/export` - Xuất báo cáo sự cố an ninh & vi phạm đồ bảo hộ PPE
- `POST /api/v1/notifications/ott/test` - Bắn thử nghiệm cảnh báo OTT tức thời (Telegram Bot / Slack / Zalo)
- `GET /api/v1/notifications/ott/history` - Lịch sử ghi nhận và nhật ký kiểm toán OTT thời gian thực
- `POST /api/v1/devices/{id}/trigger-relay` - Kích hoạt đóng ngắt Relay cổng Barrier & bộ mã hóa Wiegand 26-bit Hex
- `GET /api/v1/requests` - Danh sách đơn từ & ngoại lệ chấm công HRM
- `POST /api/v1/requests` - Tạo đơn xin nghỉ phép, công tác, giải trình
- `PUT /api/v1/requests/{id}/approve` - Phê duyệt đơn từ nhân sự
- `PUT /api/v1/requests/{id}/reject` - Từ chối đơn từ nhân sự
- `GET /api/v1/requests/daily-summary` - Báo cáo tổng hợp ngoại lệ trong ngày
- `GET /api/v1/devices` - Quản lý danh sách và trạng thái telemetry Camera
- `PUT /api/v1/devices/{id}/toggle` - Bật/Tắt nhanh luồng camera từ xa
- `GET /api/v1/analytics/summary` - Báo cáo chỉ số KPI chấm công
- `GET /api/v1/analytics/weekly-punctuality` - Dữ liệu biểu đồ đúng giờ theo tuần
- `GET /api/v1/analytics/department-lateness` - Dữ liệu biểu đồ đi muộn theo phòng ban
- `GET /api/v1/analytics/hourly-density` - Dữ liệu biểu đồ mật độ lưu lượng theo giờ
- `WS /ws/attendance` - Luồng WebSocket cập nhật điểm danh & cảnh báo người lạ realtime
- `GET /health` - Kiểm tra sức khỏe microservice Face AI Backend

---

## 6. Bộ Kiểm Thử Tự Động (Testing Suites)

### 6.1. Kiểm Thử Toàn Diện 16 Module Hệ Thống Microservices & Sinh Trắc Học (`tests/test_e2e_full_system.py`)
Chạy bộ kiểm thử tự động toàn diện kiểm tra bảo mật Zero-Trust, RBAC, ABAC Data Scoping, chống leo thang đặc quyền, cơ cấu tổ chức, đồng bộ danh tính, đăng ký 5 góc mặt, xác minh realtime, Helpdesk, Đăng nhập Face ID, Đổi mật khẩu, Phân ca làm việc, Tính lương tự động, IoT Smart Access, Xuất báo cáo đa dạng và Cổng thông báo OTT Bot:

```powershell
# Windows
.\venv\Scripts\python.exe tests/test_e2e_full_system.py

# Linux / macOS
./venv/bin/python tests/test_e2e_full_system.py
```

**Kết quả kiểm thử (72/72 Tests PASS - 100% Pass Rate)**:
- **Module 1**: Authentication & JWT (`/auth/login`, `/auth/me`, xác thực token)
- **Module 2**: RBAC Roles & Authorization (Danh sách vai trò, vai trò admin, 14 atomic permissions)
- **Module 3**: Organization Structure (CRUD Phòng ban & Chức vụ)
- **Module 4**: Unified Personnel & IAM Sync (Đồng bộ hồ sơ Face AI Employee $\leftrightarrow$ Core User IAM)
- **Module 5**: 5-Angle Face Registration & pgvector (Trích xuất và lưu trữ 5 vector đặc trưng)
- **Module 6**: Live Face Verification & Attendance (`/verify-face`, `/attendance/check-in`)
- **Module 7**: ITIL Helpdesk & Service Tickets (Tạo ticket, AI phản hồi tự động giải pháp)
- **Module 8**: 1-Click Biometric Face ID Login (`POST /auth/face-login`, cấp JWT, xác minh `/auth/me`)
- **Module 9**: My Account Profile Update & Password Change (`PUT /users/{id}/profile`, `POST /auth/change-password`)
- **Module 10**: Zero-Trust Security, ABAC Data Scoping & Anti-Privilege Escalation (Chống leo thang đặc quyền, bảo vệ vai trò `superadmin` bất biến, kiểm soát truy cập phạm vi phòng ban ABAC, chống tự xóa tài khoản)
- **Module 11**: Work Shifts & Multi-Shift Roster Scheduling (CRUD ca làm việc, phân ca, thời gian ân hạn)
- **Module 12**: Automated Timesheet & Payroll Engine (Tính lương Gross/Net, phụ cấp OT 1.5x, khấu trừ đi muộn)
- **Module 13**: IoT Smart Access & Mobile Geofencing (Kích hoạt Relay mở cửa, bộ mã hóa Wiegand 26-bit Hex, chấm công GPS Haversine)
- **Module 14**: Enterprise Multi-Format Report Export (Xuất bảng tính Excel `.xlsx` với openpyxl, tài liệu PDF `.pdf` với reportlab, CSV `.csv`)
- **Module 15**: OTT Bot Notification Gateway (Bắn cảnh báo Telegram Bot, Slack Webhook, Zalo OA & nhật ký kiểm toán)
- **Module 16**: Advanced Shift Scheduling & Auto-Matching (Ca gãy Split Shift, Ca xoay Rotating, thuật toán khớp ca tự động)

### 6.2. Kiểm Thử Giao Diện Frontend (Playwright)
- **Kiểm thử luồng giao diện (Navigation & CRUD)**: Đảm bảo chuyển đổi mượt mà qua các Tab mà không phát sinh lỗi JavaScript (`ReferenceError`, `TypeError`).
- **Kiểm tra tính toàn vẹn đa ngôn ngữ (i18n Integrity)**: Đảm bảo khi chọn Tiếng Anh thì không bị lẫn chuỗi Tiếng Việt.
- **Kiểm toán bảo mật (Security & Secret Leak Audit)**: Quét mã nguồn và file cấu hình để đảm bảo không lưu mật khẩu hay API keys trên Git.

```powershell
# Chạy Playwright test trên Windows
.\service.ps1 test

# Hoặc trên Linux/macOS
./service.sh test
```

---

## 7. Bảo Mật & Quản Lý Cấu Hình

- **File môi trường**: Tất cả file `.env`, `.env.*`, `secrets.json`, chứng chỉ SSL (`*.pem`, `*.key`, `*.cert`) và logs/ảnh upload đều được cấu hình trong `.gitignore` để ngăn chặn rò rỉ lên repository.
- **Dữ liệu mẫu**: Sử dụng `.env.example` và địa chỉ URL mẫu (`rtsp://admin:password@192.168.1.100:554/stream1`) cho các ví dụ cấu hình.

---

## 8. Lộ Trình Phát Triển & Tính Năng Đã Hoàn Thành (Feature Roadmap)

Kiến trúc V-Face Pro đã hoàn thành toàn diện các hạng mục chiến lược:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        V-FACE PRO ENTERPRISE FEATURE ROADMAP                            │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ Giai đoạn 1: AI & Sinh trắc │ Giai đoạn 2: HRM & Tiền lương│ Giai đoạn 3: Access Control & IoT │
│ [x] Nhận diện PPE / Khẩu trang│ [x] Xếp ca kíp đa ca/ca gãy│ [x] Điều khiển Relay Cổng Barrier  │
│ [x] Liveness bằng cử chỉ   │ [x] Tính lương tự động hóa │ [x] Bộ mã hóa Wiegand 26-bit Hex  │
│ [x] Batch Multi-Face RTSP  │ [x] Xuất báo cáo Excel/PDF │ [x] Đo lường Telemetry & MQTT     │
│ [x] Báo động người lạ (WS) │ [x] So khớp ca tự động     │ [x] Điểm danh GPS Geofencing (500m)│
└──────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

- **[x] Giai đoạn 1 (AI & Sinh Trắc Học Nâng Cao)**: Cảnh báo đeo khẩu trang & mũ bảo hộ PPE, xác thực cử chỉ liveness chống giả mạo chủ động, nhận diện khuôn mặt 512D ArcFace độ chính xác cao và báo động người lạ thời gian thực qua WebSocket.
- **[x] Giai đoạn 2 (Quản Trị HRM, Ca Kíp & Tự Động Hóa Tính Lương)**: Quản lý ca kíp linh hoạt (Ca tiêu chuẩn, Ca gãy Split Shift, Ca xoay vòng Rotating), tự động tính bảng công và tiền lương (phụ cấp OT 1.5x, trừ phạt đi muộn, lương thực nhận), xuất báo cáo đa định dạng (Excel `.xlsx`, PDF `.pdf`, CSV).
- **[x] Giai đoạn 3 (Kiểm Soát Ra Vào Vật Lý & IoT Access Control)**: Điều khiển đóng ngắt Relay cổng Barrier/Turnstile, bộ tạo luồng bit Wiegand 26-bit Hex tiêu chuẩn công nghiệp và tích hợp truyền thông telemetry MQTT.
- **[x] Giai đoạn 4 (Chấm Công Di Động & Cổng Thông Báo OTT)**: Chấm công di động định vị bán kính GPS Haversine (500m) & ràng buộc mạng Wi-Fi văn phòng, cùng hệ thống thông báo tự động đa kênh OTT Bot (Telegram, Slack, Zalo).

---

## 9. Bản Quyền & Giấy Phép

Dự án được xây dựng dựa trên các công nghệ mã nguồn mở: [InsightFace](https://github.com/deepinsight/insightface), [pgvector](https://github.com/pgvector/pgvector), [FastAPI](https://fastapi.tiangolo.com/), [openpyxl](https://openpyxl.readthedocs.io/), [ReportLab](https://www.reportlab.com/), [Playwright](https://playwright.dev/) và [React](https://react.dev/).

