# Design Specification: User Profile & Password Management Feature (Tài Khoản Của Tôi)

## 1. Overview
Provide a dedicated, full-screen **"Tài Khoản Của Tôi" (My Account)** module in the V-Face AI web application that empowers every authenticated user (Standard Employees, Managers, IT Support, HR, and Administrators) to:
1. View their complete enterprise identity (User Code, Username, Assigned Roles, Department, Position, Face AI status).
2. Update their personal profile information (Full Name, Phone Number, Email) with bidirectional sync between Core User IAM and Face AI Employee rosters.
3. Change their account password securely with current password validation and real-time strength/matching feedback.
4. Inspect their registered 5-angle biometric face templates and trigger live verification checks.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│              Frontend: React 19 Component (`UserProfileManager.jsx`)                    │
│  ┌───────────────────────┬───────────────────────────────┬──────────────────────────┐  │
│  │   Hero Identity Card  │   Personal Information Form   │  Security & Password Form│  │
│  │ • Full Name & Avatar  │ • Full Name, Phone, Email     │ • Old Password           │  │
│  │ • Roles & Org Badges  │ • Read-only: Code, Dept, Pos  │ • New & Confirm Password │  │
│  └───────────────────────┴───────────────────────────────┴──────────────────────────┘  │
└────────────────────────────▲──────────────────────────────────▲────────────────────────┘
                             │                                  │
                             ▼                                  ▼
┌──────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│      Core User & IAM Service (Port 8001)     │   │      Face AI Attendance Service (Port 8000)│
│ ──────────────────────────────────────────── │   │ ────────────────────────────────────────── │
│ • `GET /api/v1/auth/me` (Profile, Roles)     │   │ • `GET /api/v1/employees?search=user_code` │
│ • `PUT /api/v1/users/{id}/profile`           │   │ • `PUT /api/v1/employees/{id}` (Sync info) │
│ • `POST /api/v1/auth/change-password`        │   │ • `POST /api/v1/employees/{id}/verify-face`│
└──────────────────────────────────────────────┘   └────────────────────────────────────────────┘
```

---

## 3. UI Component Design (`UserProfileManager.jsx`)

### 3.1. Layout Structure
- **Section 1: Hero Identity Banner**
  - Gradient badge with user avatar initials.
  - Full Name, Username, and User Code (`NV001`).
  - Active Role Pills (e.g. `Employee`, `Dept Manager`, `Superadmin`).
  - Department and Position metadata tags.
- **Section 2: Personal Profile Editor (Grid 2-column)**
  - Editable Inputs:
    - Họ và tên (`full_name`)
    - Số điện thoại (`phone_number`)
    - Email liên hệ (`email`)
  - Read-Only Security Metadata:
    - Mã nhân viên (`user_code`)
    - Tên đăng nhập (`username`)
    - Phòng ban (`department`)
    - Chức vụ (`position`)
    - Ngày khởi tạo tài khoản (`created_at`)
  - Action Button: **"Lưu Thay Đổi Hồ Sơ"** (Save Profile Changes).
- **Section 3: Account Security & Password Management**
  - Mật khẩu hiện tại (`old_password`) with visibility toggle.
  - Mật khẩu mới (`new_password`) with visibility toggle and min-length validation (6+ chars).
  - Xác nhận mật khẩu mới (`confirm_password`) with matching indicator.
  - Action Button: **"Cập Nhật Mật Khẩu"** (Update Password).
- **Section 4: Biometric Face AI Status Card**
  - Number of registered face templates in `pgvector` (e.g., `5/5 góc mặt đã nạp`).
  - Quick button to launch the **Live Face Verification Modal**.

---

## 4. API Endpoints Specification

### 4.1. Core User IAM Microservice (Port 8001)
1. **`GET /api/v1/auth/me`**
   - Returns logged-in user profile, role list, permissions, department, and position.
2. **`PUT /api/v1/users/{user_id}/profile`**
   - Request Body: `{"full_name": str, "phone_number": str}`
   - Authorization: `current_user.id == user_id` or `user:update` permission.
3. **`POST /api/v1/auth/change-password`**
   - Request Body: `{"old_password": str, "new_password": str}`
   - Authorization: Requires authenticated Bearer token.
   - Validates old password hash with bcrypt; updates `hashed_password` on success.

### 4.2. Face AI Attendance Microservice (Port 8000)
1. **`GET /api/v1/employees?search={user_code}`**
   - Retrieves linked face AI employee record and registered face feature counts.
2. **`PUT /api/v1/employees/{emp_id}`**
   - Syncs updated `full_name` and `phone_number` to maintain unified personnel data consistency.

---

## 5. Security & RBAC Considerations
- Every user can update their **own** personal information and password without needing elevated admin privileges.
- Admin-restricted fields (such as `user_code`, `roles`, `is_active`, `department_id`, `position_id`) are immutable from the My Account tab and can only be altered by authorized administrators via `UnifiedHRHub`.
- Password change mandates verifying the `old_password` before hashing the `new_password`.
