# 📱 V-Face Mobile: Tài Liệu Thiết Kế & Hướng Dẫn Triển Khai (Android / iOS)

**Phiên bản:** 1.0.0  
**Framework:** Flutter 3.x (Dart 3.x)  
**Kiến trúc:** Clean Architecture + BLoC State Management  
**Hệ thống Backend tích hợp:** V-Face Pro Microservices Ecosystem (FastAPI 8000 & 8001, PostgreSQL 16 + pgvector)

---

## 1. Tổng Quan Hệ Thống (System Overview)

Ứng dụng **V-Face Mobile (Employee Self-Service)** là ứng dụng di động đa nền tảng (Android & iOS) cung cấp giải pháp tự phục vụ toàn diện cho cán bộ nhân viên trong hệ sinh thái V-Face:
- **Chấm công sinh trắc học di động (Geofenced Mobile Check-in):** Nhận diện khuôn mặt với công nghệ chống giả mạo (Anti-Spoofing), kết hợp kiểm tra vị trí địa lý (GPS Haversine trong bán kính quy định) và nhận diện BSSID Wi-Fi doanh nghiệp.
- **Tự quản lý sinh trắc học 5 góc (Self-Service Biometrics Hub):** Tự thu thập và cập nhật 5 góc khuôn mặt phục vụ trích xuất vector đặc trưng 512D ArcFace.
- **Quản lý Đơn từ & Phép (HRM Requests):** Đăng ký nghỉ phép, xin đi muộn/về sớm, làm việc ngoài hiện trường/công tác, đăng ký làm thêm giờ (OT).
- **Ca làm việc, Bảng công & Bảng lương (Timesheet & Payroll):** Tra cứu ca làm việc, lịch sử vào/ra thực tế, và chi tiết bảng lương từng kỳ.
- **ITIL Service Desk & Helpdesk:** Gửi yêu cầu hỗ trợ sự cố IT/thiết bị, trao đổi với kỹ thuật viên, đánh giá mức độ hài lòng (CSAT), tra cứu cẩm nang xử lý sự cố (Knowledge Base).

---

## 2. Sơ Đồ Kiến Trúc Kết Nối (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│             V-Face Mobile Client (Flutter - Android / iOS)             │
│  ┌───────────────────────┬──────────────────────┬───────────────────┐  │
│  │   Face AI Check-in    │   HRM & Timesheet    │   ITIL Helpdesk   │  │
│  │ • Liveness Pose HUD   │ • Leave / OT / Trips │ • Ticket Tracking │  │
│  │ • GPS & Wi-Fi Check   │ • Payroll Breakdown  │ • CSAT & KB Wiki  │  │
│  └───────────────────────┴──────────────────────┴───────────────────┘  │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ HTTPS (JWT Bearer Token)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   API Gateway / Reverse Proxy (Nginx)                  │
│                     https://api.vface.vn (or Host IP)                  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│  Core User & IAM Service (Port 8001)  │ │ Face AI Backend (Port 8000)  │
│ ───────────────────────────────────── │ │ ──────────────────────────── │
│ • POST /api/v1/auth/login             │ │ • POST /attendance/mobile-   │
│ • POST /api/v1/auth/face-token        │ │        checkin               │
│ • GET  /api/v1/auth/me                │ │ • POST /employees/{id}/      │
│ • POST /api/v1/auth/change-password   │ │        register-face         │
│ • GET/POST /api/v1/helpdesk/tickets   │ │ • GET  /api/v1/requests      │
│ • GET  /api/v1/helpdesk/kb/articles   │ │ • GET  /api/v1/payroll/*     │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 3. Đặc Tả Chi Tiết Các Module Ứng Dụng

### 3.1. Module Xác Thực (Authentication & Security)
- **Đăng nhập mật khẩu (`POST /api/v1/auth/login`)**:
  - Hỗ trợ tài khoản Username hoặc Email.
  - Lưu trữ `access_token` và `refresh_token` an toàn vào `flutter_secure_storage` (iOS Keychain / Android EncryptedSharedPreferences).
  - Tự động bắt mã lỗi `401 Unauthorized` qua Dio Interceptor để tự làm mới token qua `POST /api/v1/auth/refresh`.
- **Đăng nhập 1-Chạm Face ID (`POST /api/v1/auth/face-login`)**:
  - Chụp khuôn mặt từ camera trước, gửi base64/file ảnh lên Backend để nhận diện và cấp trực tiếp JWT Token.
- **Bảo mật sinh trắc học máy (Local Biometric Lock)**:
  - Cho phép người dùng bật tính năng mở khóa app nhanh bằng Face ID / Vân tay của thiết bị điện thoại.

### 3.2. Module Chấm Công Thông Minh (Smart Geofenced Check-In)
- **Luồng hoạt động (`POST /api/v1/attendance/mobile-checkin`)**:
  1. **Bước 1 (Định vị & Mạng)**: Lấy tọa độ GPS (`latitude`, `longitude`, `accuracy`) qua thư viện `geolocator` và lấy BSSID Wi-Fi qua `network_info_plus`.
  2. **Bước 2 (Chụp ảnh & Liveness Guide)**: Giao diện Camera trước với khung Oval HUD, hướng dẫn người dùng giữ thẳng mặt và thực hiện thử thách cử chỉ cơ bản.
  3. **Bước 3 (Gửi dữ liệu)**: Tạo Multipart/JSON payload gồm `image`, `latitude`, `longitude`, `wifi_bssid`, `device_id`.
  4. **Bước 4 (Phản hồi)**: Hiển thị hộp thoại kết quả: Tên nhân viên, thời gian chấm, độ chính xác nhận diện, trạng thái đúng giờ/đi muộn.

### 3.3. Module Tự Thu Thập Sinh Trắc Học (Self-Service Biometrics Hub)
- **Quy trình 5 góc chụp (`POST /api/v1/employees/{id}/register-face`)**:
  - Hướng dẫn trực quan từng bước:
    - Góc 1: Chính diện (`0°`)
    - Góc 2: Ngước lên trên (`+15°`)
    - Góc 3: Cúi xuống dưới (`-15°`)
    - Góc 4: Quay sang trái (`-30°`)
    - Góc 5: Quay sang phải (`+30°`)
  - Sau khi đủ 5 ảnh, app gửi trọn bộ ảnh lên server để trích xuất 5 vector đặc trưng 512D lưu trữ vào PostgreSQL pgvector HNSW index.
- **Thử nghiệm đối soát (Live Verification)**: Cho phép nhân viên tự thử nghiệm độ nhận diện (`POST /api/v1/employees/{id}/verify-face`) để biết điểm tin cậy (similarity score).

### 3.4. Module Quản Lý Đơn Từ & Nghỉ Phép (HRM Requests)
- **Danh sách đơn**: Lọc theo trạng thái `Tất cả`, `Chờ duyệt (Pending)`, `Đã duyệt (Approved)`, `Từ chối (Rejected)`.
- **Tạo đơn mới (`POST /api/v1/requests`)**:
  - Hỗ trợ các loại đơn:
    - `leave_full` (Nghỉ cả ngày) / `leave_half` (Nghỉ nửa ngày)
    - `late_excuse` (Giải trình đi muộn) / `early_excuse` (Xin về sớm)
    - `business_trip` (Đi công tác / Ra ngoài hiện trường)
    - `overtime` (Đăng ký làm ngoài giờ OT)
  - Nhập thời gian bắt đầu, kết thúc, lý do, và đính kèm ảnh chụp/tài liệu.

### 3.5. Module Lịch Ca, Bảng Công & Bảng Lương (Timesheet & Payroll)
- **Lịch công**: Hiển thị dạng lịch biểu tháng trực quan. Ngày có chấm công hợp lệ hiển thị màu xanh lá, đi muộn màu cam, vắng mặt màu đỏ.
- **Bảng lương cá nhân (`GET /api/v1/payroll/records`)**:
  - Lương cơ bản, Ngày công chuẩn, Ngày công thực tế.
  - Phụ cấp, Giờ làm thêm (OT hệ số 1.5x), Khấu trừ đi muộn.
  - Thực lĩnh (Net Salary) kèm biểu đồ phân tích trực quan.

### 3.6. Module ITIL Service Desk & Helpdesk
- **Quản lý Ticket (`GET & POST /api/v1/helpdesk/tickets`)**:
  - Tạo yêu cầu hỗ trợ với độ ưu tiên SLA động (P1 đến P4) và gắn thẻ ngữ cảnh (`#camera`, `#iam`, `#hardware`, `#attendance`).
  - Chat/bình luận 2 chiều với nhân viên IT hỗ trợ.
  - Đánh giá chất lượng phục vụ CSAT (1 đến 5 sao).
- **Knowledge Base (KB Wiki)**:
  - Tra cứu các bài viết xử lý lỗi thường gặp được định dạng Markdown rõ ràng.

---

## 4. Cấu Trúc Thư Mục Ứng Dụng Flutter (`mobile/`)

```
mobile/
├── pubspec.yaml
├── lib/
│   ├── main.dart                      # Điểm khởi chạy ứng dụng
│   ├── app.dart                       # MaterialApp, Routing & Theme Configuration
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart     # Định nghĩa toàn bộ API URLs
│   │   │   └── app_colors.dart        # Bảng màu chủ đạo V-Face
│   │   ├── network/
│   │   │   ├── api_client.dart        # Cấu hình Dio & Base Options
│   │   │   ├── auth_interceptor.dart  # Tự động inject JWT & Refresh Token
│   │   │   └── api_response.dart      # Standard Response Wrapper
│   │   ├── storage/
│   │   │   └── secure_storage.dart    # Quản lý Token & Session
│   │   ├── theme/
│   │   │   └── app_theme.dart         # Material 3 Dark/Light Themes
│   │   └── utils/
│   │       ├── location_helper.dart   # Lấy GPS & Haversine Distance
│   │       └── network_helper.dart    # Lấy BSSID Wi-Fi
│   ├── data/
│   │   ├── models/
│   │   │   ├── auth_model.dart        # User, Token, Role models
│   │   │   ├── attendance_model.dart  # Checkin result, history models
│   │   │   ├── request_model.dart     # HRM Leave/OT Request models
│   │   │   ├── payroll_model.dart     # Payroll breakdown models
│   │   │   └── helpdesk_model.dart    # ITIL Ticket & KB Article models
│   │   └── repositories/
│   │       ├── auth_repository.dart
│   │       ├── attendance_repository.dart
│   │       ├── hrm_repository.dart
│   │       └── helpdesk_repository.dart
│   ├── presentation/
│   │   ├── blocs/
│   │   │   ├── auth/                  # AuthBloc, AuthEvent, AuthState
│   │   │   ├── attendance/            # AttendanceBloc (Check-in & Geofence)
│   │   │   ├── requests/              # RequestBloc (Tạo & Xem đơn)
│   │   │   ├── payroll/               # PayrollBloc
│   │   │   └── helpdesk/              # HelpdeskBloc
│   │   ├── screens/
│   │   │   ├── splash_screen.dart     # Màn hình chờ & kiểm tra phiên
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart  # Đăng nhập mật khẩu
│   │   │   │   └── face_login_screen.dart # Đăng nhập 1-Click Face ID
│   │   │   ├── main_navigation_screen.dart # Bottom Navigation Bar
│   │   │   ├── home/
│   │   │   │   └── home_dashboard_screen.dart # Trang chủ, phím tắt & trạng thái
│   │   │   ├── attendance/
│   │   │   │   ├── mobile_checkin_screen.dart # Màn hình chụp mặt chấm công + GPS
│   │   │   │   └── attendance_history_screen.dart # Lịch sử chấm công
│   │   │   ├── biometrics/
│   │   │   │   └── face_enrollment_screen.dart # Tự đăng ký 5 góc chụp
│   │   │   ├── requests/
│   │   │   │   ├── request_list_screen.dart
│   │   │   │   └── create_request_screen.dart
│   │   │   ├── timesheet/
│   │   │   │   ├── timesheet_calendar_screen.dart
│   │   │   │   └── payroll_detail_screen.dart
│   │   │   ├── helpdesk/
│   │   │   │   ├── ticket_list_screen.dart
│   │   │   │   ├── create_ticket_screen.dart
│   │   │   │   └── kb_article_screen.dart
│   │   │   └── profile/
│   │   │       ├── profile_screen.dart
│   │   │       └── change_password_screen.dart
│   │   └── widgets/
│   │       ├── biometric_hud_overlay.dart # Khung Oval quét mặt & radar animation
│   │       ├── custom_button.dart
│   │       ├── custom_text_field.dart
│   │       └── status_badge.dart
└── README.md
```

---

## 5. Hướng Dẫn Cấu Hình & Chạy Ứng Dụng

### 5.1. Yêu cầu môi trường
- Flutter SDK $\ge 3.24.0$
- Dart SDK $\ge 3.5.0$
- Android Studio / VS Code với extension Flutter & Dart
- Xcode (nếu chạy trên macOS để build iOS)

### 5.2. Các bước cài đặt & chạy
```bash
# 1. Di chuyển vào thư mục mobile
cd mobile

# 2. Tải toàn bộ packages & dependencies
flutter pub get

# 3. Chạy ứng dụng trên máy ảo hoặc thiết bị thật
flutter run
```

### 5.3. Cấu hình địa chỉ Server Backend
Trong file [`lib/core/constants/api_endpoints.dart`](file:///C:/Code/v-face-ai/mobile/lib/core/constants/api_endpoints.dart):
- Chạy qua Emulator Android: Mặc định trỏ về `http://10.0.2.2:8000` và `http://10.0.2.2:8001`
- Chạy qua Thiết bị thật / Mạng LAN: Trỏ về địa chỉ IP máy chủ của bạn (VD: `http://192.168.1.50:8000` hoặc Domain `https://api.vface.ai`)
