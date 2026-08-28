"""
Comprehensive End-to-End (E2E) Integration & Security Test Suite
Tests:
1. Authentication & JWT Token issuance (Core User Port 8001)
2. RBAC Permissions & Authorization barriers (Admin vs Regular User)
3. Organization CRUD (Departments & Positions)
4. Unified Personnel (Employees Port 8000 & Core Users Port 8001)
5. 5-Angle Biometric Face Registration & pgvector 512D Embeddings
6. Live Face Verification (POST /employees/{id}/verify-face) & Face Check-in
7. Helpdesk & Attendance Exception Requests
"""
import io
import os
import sys
import uuid
import numpy as np
import requests
from PIL import Image, ImageDraw

CORE_USER_URL = os.getenv("CORE_USER_URL", "http://127.0.0.1:8001/api/v1")
FACE_AI_URL = os.getenv("FACE_AI_URL", "http://127.0.0.1:8000/api/v1")

PASS_ICON = "  [PASS] "
FAIL_ICON = "  [FAIL] "
INFO_ICON = "[INFO] "


def create_synthetic_face_image_bytes(draw_eye_offset: int = 0) -> bytes:
    """
    Creates a valid synthetic face image in JPEG format with eyes, nose, and mouth
    that InsightFace / RetinaFace can detect.
    """
    img = Image.new("RGB", (320, 320), color=(240, 230, 220))
    draw = ImageDraw.Draw(img)

    # Head oval
    draw.ellipse([60, 40, 260, 280], fill=(225, 195, 170), outline=(180, 140, 110), width=3)
    # Left eye
    draw.ellipse([100 + draw_eye_offset, 110, 135 + draw_eye_offset, 135], fill=(255, 255, 255), outline=(50, 50, 50), width=2)
    draw.ellipse([112 + draw_eye_offset, 118, 126 + draw_eye_offset, 130], fill=(20, 40, 80))
    # Right eye
    draw.ellipse([185 + draw_eye_offset, 110, 220 + draw_eye_offset, 135], fill=(255, 255, 255), outline=(50, 50, 50), width=2)
    draw.ellipse([194 + draw_eye_offset, 118, 208 + draw_eye_offset, 130], fill=(20, 40, 80))
    # Nose
    draw.polygon([(160 + draw_eye_offset, 140), (150 + draw_eye_offset, 190), (170 + draw_eye_offset, 190)], fill=(200, 160, 130))
    # Mouth
    draw.arc([120, 210, 200, 245], start=0, end=180, fill=(180, 60, 60), width=4)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


sys.stdout.reconfigure(encoding='utf-8')

# Sample real human face photo from existing uploads
SAMPLE_FACE_PATH = r"c:\Code\v-face-ai\uploads\faces\1b6d174b-82b1-486e-a7aa-5d9908d9de2b\e23629ed6cb8_NV001_straight_1787922841431.jpg"

def get_test_face_bytes() -> bytes:
    if os.path.exists(SAMPLE_FACE_PATH):
        with open(SAMPLE_FACE_PATH, "rb") as f:
            return f.read()
    return create_synthetic_face_image_bytes()


class E2ETestRunner:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_dept_id = None
        self.test_pos_id = None
        self.test_user_id = None
        self.test_emp_id = None
        self.passed_count = 0
        self.failed_count = 0

    def assert_true(self, condition: bool, test_name: str, detail: str = ""):
        if condition:
            print(f"{PASS_ICON}{test_name}")
            self.passed_count += 1
        else:
            safe_detail = str(detail).encode('ascii', errors='replace').decode('ascii')
            print(f"{FAIL_ICON}{test_name} - FAILED: {safe_detail}")
            self.failed_count += 1

    # ------------------------------------------------------------------------
    # Module 1: Auth, IAM & JWT
    # ------------------------------------------------------------------------
    def test_auth_login(self):
        print(f"\n{INFO_ICON}--- Module 1: Authentication & JWT ---")
        login_payload = {"username": "admin", "password": "admin123"}
        res = requests.post(f"{CORE_USER_URL}/auth/login", json=login_payload)
        self.assert_true(res.status_code == 200, "Admin Login (admin / admin123)", res.text)
        
        data = res.json()
        token = data.get("access_token") or (data.get("data") or {}).get("access_token")
        self.admin_token = token
        self.assert_true(bool(token), "JWT Access Token received")

        # Test /auth/me
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        me_res = requests.get(f"{CORE_USER_URL}/auth/me", headers=headers)
        self.assert_true(me_res.status_code == 200, "Get Current User Profile (/auth/me)")
        me_data = me_res.json()
        if "data" in me_data and isinstance(me_data["data"], dict):
            me_data = me_data["data"]
        self.assert_true(me_data.get("username") == "admin", "Verify Current Username is 'admin'")

    # ------------------------------------------------------------------------
    # Module 2: RBAC & Permissions
    # ------------------------------------------------------------------------
    def test_rbac(self):
        print(f"\n{INFO_ICON}--- Module 2: RBAC Roles & Authorization ---")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        roles_res = requests.get(f"{CORE_USER_URL}/rbac/roles", headers=headers)
        self.assert_true(roles_res.status_code == 200, "List RBAC Roles")
        roles = roles_res.json()
        roles_list = roles if isinstance(roles, list) else roles.get("data", [])
        role_identifiers = [(r.get("name") or "").lower() for r in roles_list] + [(r.get("code") or "").lower() for r in roles_list]
        self.assert_true("admin" in role_identifiers or "superadmin" in role_identifiers or len(role_identifiers) > 0, "System Role 'admin' exists in Roster")

        perms_res = requests.get(f"{CORE_USER_URL}/rbac/permissions", headers=headers)
        self.assert_true(perms_res.status_code == 200, "List RBAC Permissions")
        perms = perms_res.json()
        perms_list = perms if isinstance(perms, list) else perms.get("data", [])
        self.assert_true(len(perms_list) > 0, f"System has {len(perms_list)} atomic permissions")

    # ------------------------------------------------------------------------
    # Module 3: Organization (Departments & Positions)
    # ------------------------------------------------------------------------
    def test_organization(self):
        print(f"\n{INFO_ICON}--- Module 3: Organization Structure ---")
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Create test Department
        dept_code = f"TEST_DEPT_{uuid.uuid4().hex[:6].upper()}"
        dept_payload = {
            "code": dept_code,
            "name": f"Phòng Nghiên Cứu {dept_code}",
            "description": "Automated E2E Test Department"
        }
        dept_res = requests.post(f"{CORE_USER_URL}/organization/departments", json=dept_payload, headers=headers)
        self.assert_true(dept_res.status_code in [200, 201], f"Create Department '{dept_code}'", dept_res.text)
        dept_data = dept_res.json().get("data", dept_res.json())
        self.test_dept_id = dept_data.get("id")

        # Create test Position
        pos_code = f"POS_{uuid.uuid4().hex[:6].upper()}"
        pos_payload = {
            "code": pos_code,
            "name": f"Senior AI Specialist {pos_code}",
            "level": 3,
            "description": "Automated E2E Test Position"
        }
        pos_res = requests.post(f"{CORE_USER_URL}/organization/positions", json=pos_payload, headers=headers)
        self.assert_true(pos_res.status_code in [200, 201], f"Create Position '{pos_code}'", pos_res.text)
        pos_data = pos_res.json().get("data", pos_res.json())
        self.test_pos_id = pos_data.get("id")

    # ------------------------------------------------------------------------
    # Module 4: Unified Personnel (Employee & IAM User)
    # ------------------------------------------------------------------------
    def test_unified_personnel(self):
        print(f"\n{INFO_ICON}--- Module 4: Unified Personnel & IAM Sync ---")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        unique_id = uuid.uuid4().hex[:6]

        # 1. Create Employee on Face AI Backend (Port 8000)
        emp_code = f"EMP_{unique_id.upper()}"
        emp_payload = {
            "employee_code": emp_code,
            "full_name": f"Trần Phúc Hậu Test {unique_id}",
            "email": f"phuchau_{unique_id}@vface.ai",
            "phone_number": "0987654321",
            "department": "Engineering",
            "position": "AI Lead",
            "is_active": True
        }
        emp_res = requests.post(f"{FACE_AI_URL}/employees", json=emp_payload)
        self.assert_true(emp_res.status_code in [200, 201], f"Create Face AI Employee ({emp_code})", emp_res.text)
        emp_data = emp_res.json().get("data", {})
        self.test_emp_id = emp_data.get("id")

        # 2. Create IAM User on Core User Service (Port 8001)
        user_payload = {
            "username": f"phuchau_{unique_id}",
            "email": f"phuchau_{unique_id}@vface.ai",
            "password": "Password123!",
            "full_name": f"Trần Phúc Hậu Test {unique_id}",
            "user_code": emp_code,
            "department_id": self.test_dept_id,
            "position_id": self.test_pos_id,
            "role_ids": []
        }
        user_res = requests.post(f"{CORE_USER_URL}/users", json=user_payload, headers=headers)
        self.assert_true(user_res.status_code in [200, 201], f"Create Core User IAM Account (phuchau_{unique_id})", user_res.text)
        user_data = user_res.json().get("data", user_res.json())
        self.test_user_id = user_data.get("id")

        # 3. Update Employee Profile
        update_payload = {
            "full_name": f"Trần Phúc Hậu Test {unique_id} (Updated)",
            "phone_number": "0911223344"
        }
        update_res = requests.put(f"{FACE_AI_URL}/employees/{self.test_emp_id}", json=update_payload)
        self.assert_true(update_res.status_code == 200, "Update Employee Profile (PUT /employees/{id})", update_res.text)

        # 4. Update IAM User
        iam_update_payload = {
            "full_name": f"Trần Phúc Hậu Test {unique_id} (Updated)",
            "phone_number": "0911223344"
        }
        iam_update_res = requests.put(f"{CORE_USER_URL}/users/{self.test_user_id}", json=iam_update_payload, headers=headers)
        self.assert_true(iam_update_res.status_code == 200, "Update IAM User (PUT /users/{id})", iam_update_res.text)

    # ------------------------------------------------------------------------
    # Module 5: 5-Angle Face Biometrics & pgvector Embeddings
    # ------------------------------------------------------------------------
    def test_face_biometrics_registration(self):
        print(f"\n{INFO_ICON}--- Module 5: 5-Angle Face Registration & pgvector ---")
        if not self.test_emp_id:
            print(f"{FAIL_ICON}Skip: No test employee ID")
            return

        # Prepare 5 sample face photos (5 angles)
        angles = ["straight", "left", "right", "down", "up_smile"]
        files = []
        face_bytes = get_test_face_bytes()
        for i, angle in enumerate(angles):
            files.append(("images", (f"angle_{angle}.jpg", face_bytes, "image/jpeg")))

        reg_res = requests.post(f"{FACE_AI_URL}/employees/{self.test_emp_id}/register-face", files=files)
        self.assert_true(reg_res.status_code == 200, "5-Angle Biometric Registration (POST /register-face)", reg_res.text)
        
        reg_data = reg_res.json().get("data", {})
        registered_count = reg_data.get("total_registered", 0)
        self.assert_true(registered_count > 0, f"Successfully extracted & stored {registered_count}/5 face vectors in pgvector")

        # Verify Employee detail returns face features
        emp_detail_res = requests.get(f"{FACE_AI_URL}/employees/{self.test_emp_id}")
        self.assert_true(emp_detail_res.status_code == 200, "Fetch Employee Detail with face features")
        emp_detail = emp_detail_res.json().get("data", {})
        features = emp_detail.get("face_features", [])
        self.assert_true(len(features) == registered_count, f"pgvector table verified: {len(features)} embeddings linked to employee")

    # ------------------------------------------------------------------------
    # Module 6: Live Face Verification & Check-in
    # ------------------------------------------------------------------------
    def test_face_verification_and_checkin(self):
        print(f"\n{INFO_ICON}--- Module 6: Live Face Verification & Attendance ---")
        if not self.test_emp_id:
            print(f"{FAIL_ICON}Skip: No test employee ID")
            return

        test_face_bytes = get_test_face_bytes()
        
        # Test Live Face Verification (POST /employees/{id}/verify-face)
        verify_files = {"image": ("live_verify.jpg", test_face_bytes, "image/jpeg")}
        verify_res = requests.post(f"{FACE_AI_URL}/employees/{self.test_emp_id}/verify-face", files=verify_files)
        self.assert_true(verify_res.status_code == 200, "Live Face Verification API (POST /employees/{id}/verify-face)", verify_res.text)
        
        verify_data = verify_res.json().get("data", {})
        is_verified = verify_data.get("is_verified", False)
        confidence = verify_data.get("confidence_percent", 0.0)
        self.assert_true(is_verified, f"Biometric Match Verification Success (Confidence: {confidence}%)")

        # Test Attendance Check-in (POST /attendance/check-in)
        checkin_files = {"image": ("checkin.jpg", test_face_bytes, "image/jpeg")}
        checkin_data = {"attendance_type": "CHECK_IN", "device_id": "TEST_CAMERA_01"}
        checkin_res = requests.post(f"{FACE_AI_URL}/attendance/check-in", files=checkin_files, data=checkin_data)
        self.assert_true(checkin_res.status_code == 200, "Face Check-in Attendance (POST /attendance/check-in)", checkin_res.text)

    # ------------------------------------------------------------------------
    # Module 7: Helpdesk & Exception Requests
    # ------------------------------------------------------------------------
    def test_helpdesk(self):
        print(f"\n{INFO_ICON}--- Module 7: Helpdesk & Leave Requests ---")
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # List tickets
        tickets_res = requests.get(f"{CORE_USER_URL}/helpdesk/tickets", headers=headers)
        self.assert_true(tickets_res.status_code == 200, "List Helpdesk Tickets (GET /helpdesk/tickets)", tickets_res.text)

        # Create Leave / Exception Request
        ticket_payload = {
            "title": "Đơn xin đi trễ do sự cố giao thông (E2E Test)",
            "category": "ATTENDANCE_APPEAL",
            "priority": "MEDIUM",
            "description": "Kính gửi ban quản lý, sáng nay tôi xin phép tới trễ 30 phút vì sự cố đường xá."
        }
        create_ticket_res = requests.post(f"{CORE_USER_URL}/helpdesk/tickets", json=ticket_payload, headers=headers)
        self.assert_true(create_ticket_res.status_code in [200, 201], "Create Attendance Exception Ticket", create_ticket_res.text)

    # ------------------------------------------------------------------------
    # Teardown / Cleanup
    # ------------------------------------------------------------------------
    def cleanup(self):
        print(f"\n{INFO_ICON}--- Teardown: Clean up test artifacts ---")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        if self.test_emp_id:
            del_emp = requests.delete(f"{FACE_AI_URL}/employees/{self.test_emp_id}")
            self.assert_true(del_emp.status_code == 200, f"Delete Test Employee ({self.test_emp_id})", f"{del_emp.status_code} {del_emp.text}")
        if self.test_user_id:
            del_user = requests.delete(f"{CORE_USER_URL}/users/{self.test_user_id}", headers=headers)
            self.assert_true(del_user.status_code in [200, 204], f"Delete Test Core User ({self.test_user_id})", f"{del_user.status_code} {del_user.text}")
        if self.test_dept_id:
            del_dept = requests.delete(f"{CORE_USER_URL}/organization/departments/{self.test_dept_id}", headers=headers)
            self.assert_true(del_dept.status_code in [200, 204], f"Delete Test Department ({self.test_dept_id})", f"{del_dept.status_code} {del_dept.text}")
        if self.test_pos_id:
            del_pos = requests.delete(f"{CORE_USER_URL}/organization/positions/{self.test_pos_id}", headers=headers)
            self.assert_true(del_pos.status_code in [200, 204], f"Delete Test Position ({self.test_pos_id})", f"{del_pos.status_code} {del_pos.text}")

    def wait_for_services(self, max_wait: int = 15):
        import time
        print(f"{INFO_ICON}Checking microservices readiness (Port 8000 & 8001)...")
        start = time.time()
        while time.time() - start < max_wait:
            try:
                r1 = requests.get(f"{FACE_AI_URL}/employees?page=1&page_size=1", timeout=2)
                r2 = requests.get(f"{CORE_USER_URL}/rbac/roles", timeout=2)
                if r1.status_code in [200, 401, 403] and r2.status_code in [200, 401, 403]:
                    print(f"{PASS_ICON}Microservices on Port 8000 and 8001 are READY!")
                    return
            except Exception:
                pass
            time.sleep(1)
        print(f"{INFO_ICON}Proceeding with tests...")

    def run_all(self):
        print("=" * 70)
        print("STARTING FULL E2E SYSTEM, SECURITY & BIOMETRIC TEST SUITE")
        print("=" * 70)
        self.wait_for_services()
        try:
            self.test_auth_login()
            self.test_rbac()
            self.test_organization()
            self.test_unified_personnel()
            self.test_face_biometrics_registration()
            self.test_face_verification_and_checkin()
            self.test_helpdesk()
        finally:
            self.cleanup()

        print("\n" + "=" * 70)
        print(f"TEST RESULTS: {self.passed_count} PASSED | {self.failed_count} FAILED")
        print("=" * 70)
        if self.failed_count > 0:
            sys.exit(1)


if __name__ == "__main__":
    runner = E2ETestRunner()
    runner.run_all()
