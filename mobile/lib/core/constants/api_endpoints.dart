class ApiEndpoints {
  // Có thể đổi thành domain Reverse Proxy (VD: https://api.vface.vn)
  // Mặc định Emulator Android dùng 10.0.2.2 để kết nối máy tính host
  static const String coreUserBaseUrl = "http://192.168.1.7:8001";
  static const String faceAiBaseUrl = "http://192.168.1.7:8000";

  // --- Auth & IAM Endpoints (Port 8001) ---
  static const String login = "$coreUserBaseUrl/api/v1/auth/login";
  static const String refreshToken = "$coreUserBaseUrl/api/v1/auth/refresh";
  static const String me = "$coreUserBaseUrl/api/v1/auth/me";
  static const String changePassword = "$coreUserBaseUrl/api/v1/auth/change-password";
  static const String updateProfile = "$coreUserBaseUrl/api/v1/users";

  // --- Face AI Endpoints (Port 8000) ---
  static const String faceLogin = "$faceAiBaseUrl/api/v1/auth/face-login";
  static const String mobileCheckIn = "$faceAiBaseUrl/api/v1/attendance/mobile-checkin";
  static const String registerFace = "$faceAiBaseUrl/api/v1/employees"; // + /{id}/register-face
  static const String verifyFace = "$faceAiBaseUrl/api/v1/employees"; // + /{id}/verify-face
  static const String attendanceHistory = "$faceAiBaseUrl/api/v1/attendance";

  // --- HRM Requests & Shifts ---
  static const String requests = "$faceAiBaseUrl/api/v1/requests";
  static const String shifts = "$faceAiBaseUrl/api/v1/shifts";
  static const String payrollRecords = "$faceAiBaseUrl/api/v1/payroll/records";

  // --- ITIL Helpdesk & KB (Port 8001) ---
  static const String helpdeskTickets = "$coreUserBaseUrl/api/v1/helpdesk/tickets";
  static const String helpdeskKB = "$coreUserBaseUrl/api/v1/helpdesk/kb/articles";
}
