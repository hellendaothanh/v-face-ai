# 📱 V-Face Mobile Employee Self-Service (Flutter)

Ứng dụng di động **V-Face Mobile Employee Self-Service** đa nền tảng (**Android & iOS**) được phát triển bằng Flutter và kiến trúc **BLoC Clean Architecture**, tích hợp sâu với hệ sinh thái **V-Face Pro Microservices** (Face AI & Attendance Engine, Core User IAM, PostgreSQL pgvector).

---

## 🌟 1. Các Tính Năng Trọng Tâm (Key Features)

### 👤 1. Xác thực & Nhận diện sinh trắc học (Authentication & Biometrics)
- **1-Click Biometric Face ID Login:** Đăng nhập một chạm bằng khuôn mặt thời gian thực qua camera trước, trích xuất vector 512D ArcFace kết hợp kiểm tra độ sống Anti-Spoofing (MiniFASNetV2).
- **Đăng nhập truyền thống:** Hỗ trợ đăng nhập bằng Tài khoản (Username/Email) và Mật khẩu với cơ chế cấp phát JWT Token (Access & Refresh Tokens) tự động gia hạn.
- **5-Angle Face Enrollment (Đăng ký 5 góc khuôn mặt):** Quy trình hướng dẫn thông minh thu thập 5 góc độ khuôn mặt (*Chính diện, Ngước lên, Cúi xuống, Quay trái, Quay phải*) kèm khung HUD Laser Scanner và thanh tiến trình.

### 📍 2. Chấm công thông minh (Smart Mobile Check-In)
- **Định vị Geofencing GPS:** Tính toán khoảng cách thực tế từ vị trí điện thoại tới tọa độ trụ sở cơ quan (bán kính hợp lệ $\le 500\text{m}$) qua công thức Haversine.
- **Xác thực Wi-Fi Doanh nghiệp:** Tự động đối soát mã BSSID / SSID của mạng nội bộ để đảm bảo nhân viên đang có mặt tại văn phòng.
- **Ghi nhận lịch sử chấm công:** Tra cứu chi tiết thời gian Check-in, Check-out, trạng thái đúng giờ/đi muộn, độ tin cậy nhận diện và ảnh chụp log.

### 📑 3. Quản trị đơn từ nhân sự (HRM Requests & Approvals)
- **Tạo đơn trực tuyến:** Tạo đơn xin nghỉ phép (Full-day / Half-day), giải trình đi muộn / về sớm, đăng ký công tác hiện trường, làm thêm giờ (OT).
- **Theo dõi tiến độ đơn:** Hiển thị trực quan trạng thái phê duyệt (*Chờ duyệt, Đã duyệt, Bị từ chối*) với timeline xử lý.

### 💰 4. Bảng công & Phiếu lương chi tiết (Timesheets & Payroll)
- **Bảng chấm công tháng:** Xem lịch làm việc, số ngày công thực tế, số giờ làm thêm, ngày nghỉ phép đã sử dụng.
- **Phiếu lương điện tử:** Tra cứu chi tiết thu nhập (*Lương cơ bản, phụ cấp, thưởng KPI, tiền làm thêm giờ*) và các khoản khấu trừ (*Bảo hiểm XH, BHYT, thuế TNCN*).

### 🛠️ 5. Hỗ trợ kỹ thuật ITIL & Thư viện bài viết (Service Desk & KB)
- **Tạo Ticket hỗ trợ:** Báo cáo sự cố phần cứng, phần mềm, mạng nội bộ hoặc yêu cầu cấp quyền truy cập.
- **AI Helpdesk Agent:** Tự động chẩn đoán sơ bộ nguyên nhân lỗi và gợi ý giải pháp tức thì.
- **Thư viện tri thức (Knowledge Base):** Tìm kiếm và tra cứu nhanh các quy trình, tài liệu hướng dẫn nội bộ.

---

## 🏗️ 2. Kiến Trúc Dự Án (Architecture & Tech Stack)

Dự án áp dụng **Clean Architecture** kết hợp mô hình quản lý trạng thái **BLoC (Business Logic Component)**:

```
mobile/
├── android/                        # Nền tảng Android (v2 Embedding, Kotlin, Gradle 9)
├── ios/                            # Nền tảng iOS (Swift, CocoaPods)
├── assets/
│   ├── images/                     # Hình ảnh, logo ứng dụng
│   └── icons/                      # Biểu tượng vector / SVG
├── lib/
│   ├── main.dart                   # Điểm khởi chạy ứng dụng (Khóa dọc màn hình, Status bar)
│   ├── app.dart                    # Cấu hình MaterialApp, Theme, MultiBlocProvider & Routing
│   ├── core/                       # Thành phần cốt lõi dùng chung
│   │   ├── constants/              # Bảng màu (AppColors), API Endpoints
│   │   ├── network/                # ApiClient (Dio, Interceptors, Auto Refresh Token)
│   │   ├── storage/                # SecureStorageService (FlutterSecureStorage, SharedPreferences)
│   │   └── theme/                  # AppTheme (Dark & Light Material 3 Theme)
│   ├── data/                       # Tầng dữ liệu (Data Layer)
│   │   ├── models/                 # UserModel, AttendanceModel, HRMModel, TicketModel
│   │   └── repositories/           # AuthRepository, AttendanceRepository, HRMRepository, HelpdeskRepository
│   └── presentation/               # Tầng giao diện người dùng (Presentation Layer)
│       ├── blocs/                  # AuthBloc, AttendanceBloc, HRMRequestBloc, HelpdeskBloc
│       ├── screens/                # Màn hình giao diện
│       │   ├── auth/               # LoginScreen (Password & Face ID tabs)
│       │   ├── biometrics/         # FaceEnrollmentScreen (5-Angle HUD Scanner)
│       │   ├── home/               # HomeDashboardScreen (Quick actions, Attendance metrics)
│       │   ├── attendance/         # AttendanceHistoryScreen, MobileCheckInScreen
│       │   ├── requests/           # RequestListScreen, CreateRequestScreen
│       │   ├── timesheet/          # TimesheetScreen, PayrollDetailScreen
│       │   ├── helpdesk/           # TicketListScreen, CreateTicketScreen, KBArticleDetailScreen
│       │   ├── profile/            # ProfileScreen, ChangePasswordScreen
│       │   └── splash_screen.dart  # Màn hình chào khởi động & kiểm tra phiên
│       └── widgets/                # BiometricHudOverlay, StatusBadge, GlassCard, CustomButtons
├── pubspec.yaml                    # Quản lý dependencies & assets
└── README.md                       # Tài liệu hướng dẫn sử dụng
```

---

## ⚙️ 3. Cấu Hình Địa Chỉ Máy Chủ Backend (API Configuration)

Địa chỉ kết nối microservices được quản lý tập trung tại file:  
👉 [`lib/core/constants/api_endpoints.dart`](file:///C:/Code/v-face-ai/mobile/lib/core/constants/api_endpoints.dart)

```dart
class ApiEndpoints {
  // Máy chủ IAM & Core User (Cổng 8001)
  static const String coreUserBaseUrl = "http://192.168.1.7:8001";
  
  // Máy chủ Face AI & Attendance (Cổng 8000)
  static const String faceAiBaseUrl = "http://192.168.1.7:8000";
  ...
}
```

### 💡 Lưu ý kết nối mạng:
1. **Kết nối qua cáp USB (Khuyên dùng khi Dev):**  
   Kích hoạt tính năng chuyển tiếp cổng qua `adb` để điện thoại kết nối trực tiếp đến `127.0.0.1`:
   ```powershell
   adb reverse tcp:8000 tcp:8000
   adb reverse tcp:8001 tcp:8001
   ```
2. **Kết nối qua mạng Wi-Fi LAN:**  
   Đảm bảo máy tính và điện thoại cùng kết nối vào một mạng Wi-Fi và cập nhật `192.168.1.x` là địa chỉ IP nội bộ của máy tính chủ.

---

## 🚀 4. Hướng Dẫn Cài Đặt & Chạy Ứng Dụng (Getting Started)

### Yêu cầu môi trường:
- **Flutter SDK:** $\ge 3.24.0$ (Khuyên dùng Flutter 3.27+ / 3.47+)
- **Dart SDK:** $\ge 3.5.0$
- **Android SDK:** Compile SDK version 37, NDK 28.2
- **Java/JDK:** OpenJDK 17 trở lên

### Các bước thực hiện:

```powershell
# 1. Di chuyển vào thư mục mobile
cd mobile

# 2. Cài đặt các thư viện phụ thuộc
flutter pub get

# 3. Kiểm tra thiết bị kết nối
flutter devices

# 4. Chạy ứng dụng trên điện thoại
flutter run
```

---

## 🔑 5. Danh Sách Tài Khoản Mẫu Để Kiểm Thử (Default Accounts)

Hệ thống đã nạp sẵn dữ liệu kiểm thử với các vai trò RBAC khác nhau:

| Tài khoản (Username) | Mật khẩu (Password) | Họ và tên | Chức danh / Phòng ban | Vai trò (Role) |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | **`admin123`** | System Administrator | Tổng Giám Đốc (CEO) | `superadmin` |
| **`cto_hai`** | **`Password@123`** | Trần Quang Hải | Giám Đốc Công Nghệ (CTO) | `superadmin` |
| **`hr_mai`** | **`Password@123`** | Lê Tuyết Mai | Giám Đốc Nhân Sự (HR) | `hr_manager` |
| **`ai_hung`** | **`Password@123`** | Phạm Quốc Hùng | Trưởng Nhóm AI & Vision | `dept_manager` |
| **`dev_nam`** | **`Password@123`** | Đỗ Hoàng Nam | Kỹ Sư Phần Mềm (Senior Dev) | `employee` |

---

## 🛡️ 6. Các Quyền Ứng Dụng Yêu Cầu (Device Permissions)

Ứng dụng yêu cầu các quyền trên thiết bị trong [AndroidManifest.xml](file:///c:/Code/v-face-ai/mobile/android/app/src/main/AndroidManifest.xml) & `Info.plist`:
- `CAMERA`: Quét khuôn mặt chấm công, đăng ký Face ID 5 góc và chụp ảnh minh chứng.
- `USE_BIOMETRIC` / `USE_FINGERPRINT`: Xác thực sinh trắc học thiết bị khi mở app.
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`: Định vị Geofencing GPS khi chấm công di động.
- `ACCESS_WIFI_STATE` / `ACCESS_NETWORK_STATE`: Kiểm tra BSSID/SSID mạng Wi-Fi cơ quan.
- `INTERNET`: Giao tiếp API RESTful tới hệ thống microservices.

---

## 🔧 7. Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQs)

| Vấn đề | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **`Build failed due to use of deleted Android v1 embedding`** | Thiếu cấu hình v2 embedding | Đã được chuẩn hóa lại toàn bộ [android/](file:///c:/Code/v-face-ai/mobile/android) với Kotlin và Gradle 9. |
| **`Package ndk not found`** | Thiếu NDK cho camera/biometric plugin | Cài đặt NDK bản `28.2.13676358` qua công cụ `android.exe sdk install "ndk/28.2.13676358"`. |
| **`Đăng nhập báo sai mật khẩu dù thông tin đúng`** | Xung đột kiểu dữ liệu User ID UUID | Đã chuẩn hóa `id: String` trong `UserModel` để đọc chuỗi UUID từ backend IAM. |
| **`Không kết nối được server từ điện thoại`** | Khác mạng LAN hoặc Firewall chặn | Chạy lệnh `adb reverse tcp:8000 tcp:8000` và `adb reverse tcp:8001 tcp:8001` khi cắm cáp USB. |
| **`Face Login báo không nhận diện`** | Khuôn mặt chưa được đăng ký | Vào **Hồ sơ cá nhân > Đăng ký khuôn mặt AI (Face ID)** để thu thập 5 góc khuôn mặt trước khi đăng nhập. |
