import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    final loc = Localizations.of<AppLocalizations>(context, AppLocalizations);
    if (loc != null) return loc;
    final currentLocale = Localizations.maybeLocaleOf(context) ?? const Locale('vi', 'VN');
    return AppLocalizations(currentLocale);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  bool get isVietnamese => locale.languageCode.startsWith('vi');

  static final Map<String, Map<String, String>> _localizedValues = {
    'vi': {
      // General & Common
      'app_name': 'V-Face Enterprise',
      'app_tagline': 'Cổng Thông Tin & Chấm Công Doanh Nghiệp',
      'splash_subtitle': 'Nền Tảng Quản Trị Chấm Công & Nhân Sự',
      'confirm': 'Xác nhận',
      'cancel': 'Hủy',
      'retry': 'Thử lại',
      'back': 'Quay lại',
      'close': 'Đóng',
      'submit': 'Gửi',
      'save': 'Lưu',
      'delete': 'Xóa',
      'success': 'Thành công',
      'error': 'Lỗi',
      'warning': 'Cảnh báo',
      'or': 'HOẶC',

      // Navigation Bar
      'nav_home': 'Tổng quan',
      'nav_attendance': 'Bảng công',
      'nav_requests': 'Đơn từ',
      'nav_helpdesk': 'Hỗ trợ',
      'nav_profile': 'Tài khoản',

      // Auth Screen
      'login_title': 'Đăng Nhập',
      'login_username_hint': 'Tên đăng nhập hoặc Email',
      'login_password_hint': 'Mật khẩu',
      'login_btn': 'Đăng Nhập',
      'login_face_id_btn': 'Đăng Nhập Sinh Trắc Học Face ID',
      'login_empty_fields': 'Vui lòng nhập tài khoản và mật khẩu',
      'login_failed': 'Đăng nhập thất bại. Vui lòng kiểm tra lại.',

      // Face Login Screen
      'face_login_title': '1-Chạm Face ID',
      'face_login_instruction': 'Đặt khuôn mặt vào trong khung Oval',
      'face_login_processing': 'Đang nhận diện & kiểm tra liveness...',
      'camera_init_failed': 'Không thể khởi động camera',
      'photo_capture_error': 'Lỗi khi chụp ảnh, vui lòng thử lại',

      // Face Enrollment Screen
      'face_enroll_title': 'Tự Đăng Ký 5 Góc',
      'face_enroll_complete': 'Hoàn Tất Đăng Ký',
      'face_enroll_success_desc': 'Đã trích xuất và cập nhật thành công 5 vector ArcFace vào hệ thống.',
      'face_enroll_fail_desc': 'Không thể lưu dữ liệu khuôn mặt. Vui lòng thử lại.',
      'server_connect_error': 'Lỗi khi kết nối đến máy chủ lưu trữ.',
      'angle_front': 'Chính diện (0°)',
      'angle_front_inst': 'Nhìn thẳng vào tâm camera',
      'angle_up': 'Ngước lên (+15°)',
      'angle_up_inst': 'Hơi ngước cằm lên trên ⬆️',
      'angle_down': 'Cúi xuống (-15°)',
      'angle_down_inst': 'Hơi cúi cằm xuống dưới ⬇️',
      'angle_left': 'Quay trái (-30°)',
      'angle_left_inst': 'Hơi nghiêng mặt sang trái ⬅️',
      'angle_right': 'Quay phải (+30°)',
      'angle_right_inst': 'Hơi nghiêng mặt sang phải ➡️',

      // Change Password Screen
      'change_password_title': 'Đổi Mật Khẩu',
      'old_password_label': 'Mật khẩu hiện tại',
      'new_password_label': 'Mật khẩu mới',
      'confirm_password_label': 'Xác nhận mật khẩu mới',
      'update_password_btn': 'Cập Nhật Mật Khẩu',
      'fill_all_fields': 'Vui lòng điền đầy đủ các trường',
      'password_mismatch': 'Mật khẩu xác nhận không khớp',
      'change_password_success': 'Đổi mật khẩu thành công!',
      'change_password_fail': 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ.',

      // Home Dashboard
      'greeting': 'Xin chào',
      'default_role': 'Chuyên viên',
      'default_dept': 'Công nghệ',
      'today_shift': 'Ca 08:30 - 17:30',
      'time_in': 'Giờ vào',
      'time_out': 'Giờ ra',
      'status': 'Trạng thái',
      'status_on_time': 'Đúng giờ',
      'status_late': 'Đi muộn',
      'status_absent': 'Vắng mặt',
      'status_recorded': 'Đã ghi nhận',
      'status_unrecorded': 'Chưa ghi nhận',
      'status_approved': 'Đã duyệt',
      'status_pending': 'Chờ duyệt',
      'status_rejected': 'Từ chối',
      'quick_actions': 'Chức Năng Nhanh',
      'action_checkin': 'Chấm Công',
      'action_create_request': 'Tạo Đơn',
      'action_payroll': 'Bảng Lương',
      'action_face_enroll': 'Khuôn Mặt',
      'recent_history': 'Lịch Sử Gần Đây',
      'records_count': 'bản ghi',
      'no_recent_records': 'Chưa có lượt chấm công nào được ghi nhận.',
      'valid_checkin': 'Hợp lệ',
      'device_prefix': 'Thiết bị',

      // Attendance History & Checkin
      'attendance_history_title': 'Bảng Chấm Công',
      'no_attendance_history': 'Chưa có lịch sử chấm công',
      'no_attendance_sub': 'Các lượt chấm công sẽ xuất hiện tại đây',
      'load_history_error': 'Không thể tải lịch sử chấm công từ máy chủ.',
      'checkin_screen_title': 'Điểm Danh Di Động',
      'tablet_mode': 'Chế Độ Máy Tính Bảng',
      'hud_align_face': 'Đặt khuôn mặt trong khung & Nhìn thẳng',
      'hud_processing': 'Đang xác thực Geofencing GPS & Face AI...',
      'checkin_success_title': 'Chấm Công Thành Công!',
      'checkin_fail_title': 'Chấm Công Thất Bại',
      'checkin_now': 'Bây giờ',
      'gps_distance': 'Khoảng cách GPS',
      'connection_error_desc': 'Không thể kết nối đến máy chủ hoặc vị trí ngoài vùng cho phép.',

      // Requests Screen
      'requests_title': 'Quản Lý Đơn Từ & Phép',
      'create_request_btn': 'Tạo Đơn Mới',
      'create_request_title': 'Tạo Đơn Phê Duyệt',
      'no_requests': 'Chưa có đơn từ nào',
      'no_requests_sub': 'Bấm "Tạo Đơn Mới" để gửi đơn xin nghỉ, công tác, giải trình...',
      'request_type': 'Loại Yêu Cầu',
      'req_half_am': 'Nghỉ phép nửa ngày (Sáng: 08:30 - 12:00)',
      'req_half_pm': 'Nghỉ phép nửa ngày (Chiều: 13:30 - 17:30)',
      'req_business': 'Đăng ký công tác / Ra ngoài làm việc',
      'req_late': 'Giải trình đi muộn / Về sớm có lý do',
      'request_title_label': 'Tiêu Đề Đơn',
      'request_title_hint': 'VD: Giải trình đi muộn do sự cố giao thông...',
      'start_date': 'Ngày Bắt Đầu',
      'end_date': 'Ngày Kết Thúc',
      'reason_label': 'Lý Do Chi Tiết',
      'reason_hint': 'Mô tả lý do cụ thể gửi cấp quản lý xem xét...',
      'submit_request_btn': 'Gửi Yêu Cầu Phê Duyệt',
      'submit_request_success': 'Gửi đơn phê duyệt thành công!',
      'submit_request_error': 'Lỗi khi gửi đơn lên máy chủ',
      'fill_required_fields': 'Vui lòng điền đầy đủ tiêu đề, lý do và ngày áp dụng',
      'approved_by_label': 'Duyệt',

      // Helpdesk & KB Screen
      'helpdesk_title': 'Hỗ Trợ & Kho Tri Thức',
      'tab_tickets': 'Phiếu Hỗ Trợ',
      'tab_kb': 'Kho Tri Thức (KB)',
      'create_ticket_btn': 'Tạo Ticket Mới',
      'create_ticket_title': 'Tạo Yêu Cầu Hỗ Trợ IT',
      'ticket_type_label': 'Loại Yêu Cầu',
      'ticket_urgency_label': 'Mức Độ Ưu Tiên & Khẩn Cấp',
      'ticket_title_label': 'Tiêu Đề Sự Cố / Yêu Cầu',
      'ticket_title_hint': 'VD: Lỗi camera cửa chính không nhận diện Face ID...',
      'ticket_desc_label': 'Mô Tả Chi Tiết Sự Cố',
      'ticket_desc_hint': 'Mô tả cụ thể thời gian, vị trí thiết bị, lỗi hiển thị hoặc yêu cầu cấp quyền...',
      'submit_ticket_btn': 'Gửi Yêu Cầu Hỗ Trợ',
      'submit_ticket_success': 'Tạo phiếu hỗ trợ IT thành công!',
      'submit_ticket_error': 'Lỗi khi tạo ticket. Vui lòng thử lại!',
      'fill_ticket_fields': 'Vui lòng điền tiêu đề và mô tả sự cố',
      'search_kb_hint': 'Tìm kiếm hướng dẫn, mẹo, xử lý sự cố...',
      'no_tickets': 'Chưa có yêu cầu hỗ trợ nào',
      'no_tickets_sub': 'Tạo ticket mới nếu bạn gặp sự cố kỹ thuật',
      'no_articles': 'Không tìm thấy bài viết nào',
      'load_tickets_error': 'Không thể tải danh sách phiếu hỗ trợ.',
      'load_kb_error': 'Không thể tải bài viết hướng dẫn KB.',
      'ticket_type_incident': 'Sự cố kỹ thuật (Incident)',
      'ticket_type_service': 'Yêu cầu dịch vụ / Cấp quyền (Service Request)',
      'ticket_type_problem': 'Báo cáo vấn đề lặp lại (Problem)',
      'urgency_low': 'Thấp (P4) - Không gấp',
      'urgency_medium': 'Bình thường (P3) - Cần hỗ trợ trong ngày',
      'urgency_high': 'Cao (P2) - Ảnh hưởng nhiều nhân sự',
      'urgency_critical': 'Khẩn cấp (P1) - Dừng toàn bộ hệ thống',

      // Ticket Detail & Comments
      'ticket_detail_title': 'Chi Tiết Phiếu Hỗ Trợ',
      'priority_prefix': 'Mức độ ưu tiên',
      'issue_content_header': 'Nội dung sự cố',
      'assigned_tech_prefix': 'Kỹ thuật viên phụ trách',
      'resolution_header': 'Kết quả xử lý sự cố',
      'discussion_header': 'Nhật Ký & Trao Đổi IT',
      'no_discussion_yet': 'Chưa có trao đổi nào. Bạn có thể gửi câu hỏi bên dưới.',
      'reply_hint': 'Nhập tin nhắn phản hồi IT...',
      'send_reply_error': 'Lỗi khi gửi phản hồi',

      // KB Article Detail
      'kb_detail_title': 'Kho Tri Thức & Hướng Dẫn',
      'views_count': 'lượt xem',
      'helpful_count': 'hữu ích',
      'was_helpful_question': 'Bài viết này có giúp ích cho bạn không?',
      'voted_helpful': 'Đã Đánh Giá Hữu Ích',
      'vote_helpful_btn': 'Có, Rất Hữu Ích!',
      'vote_helpful_thanks': 'Cảm ơn bạn đã đánh giá bài viết hữu ích!',

      // Payroll Screen
      'payroll_title': 'Phiếu Lương Điện Tử',
      'month_format': 'Tháng',
      'net_salary': 'THỰC LĨNH (NET SALARY)',
      'income_section': 'Thu Nhập & Công Tác',
      'base_salary': 'Lương cơ bản',
      'standard_days': 'Ngày công chuẩn',
      'actual_days': 'Ngày công thực tế',
      'ot_hours': 'Làm thêm giờ (OT)',
      'ot_pay': 'Tiền ngoài giờ (OT Pay)',
      'allowances': 'Phụ cấp chức vụ / ăn trưa',
      'deductions_section': 'Khoản Khấu Trừ',
      'insurances': 'Bảo hiểm bắt buộc (BHXH, BHYT)',
      'other_deductions': 'Khấu trừ khác',
      'no_payroll_data': 'Chưa có dữ liệu bảng lương cho tháng này.',
      'days_unit': 'ngày',
      'hours_unit': 'giờ',

      // Profile & Settings
      'profile_title': 'Tài Khoản & Cá Nhân',
      'employee_code_prefix': 'Mã',
      'setting_face_enroll': 'Cập nhật sinh trắc học khuôn mặt',
      'setting_face_enroll_sub': 'Dữ liệu góc nghiêng nhận diện',
      'setting_change_password': 'Đổi mật khẩu tài khoản',
      'setting_change_password_sub': 'Cập nhật mật khẩu định kỳ',
      'setting_device_biometrics': 'Xác thực sinh trắc học máy',
      'setting_device_biometrics_sub': 'Vân tay / Face Unlock thiết bị',
      'setting_language': 'Ngôn ngữ hiển thị',
      'setting_language_sub': 'Tiếng Việt / English',
      'logout_btn': 'Đăng Xuất',
      'logout_confirm_title': 'Xác nhận đăng xuất',
      'logout_confirm_desc': 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      'select_language_title': 'Chọn Ngôn Ngữ Hiển Thị',
      'lang_vi': 'Tiếng Việt (Vietnamese)',
      'lang_en': 'English (Tiếng Anh)',
    },

    'en': {
      // General & Common
      'app_name': 'V-Face Enterprise',
      'app_tagline': 'Enterprise Workforce & Attendance Portal',
      'splash_subtitle': 'Workforce Management & Biometrics Platform',
      'confirm': 'Confirm',
      'cancel': 'Cancel',
      'retry': 'Retry',
      'back': 'Back',
      'close': 'Close',
      'submit': 'Submit',
      'save': 'Save',
      'delete': 'Delete',
      'success': 'Success',
      'error': 'Error',
      'warning': 'Warning',
      'or': 'OR',

      // Navigation Bar
      'nav_home': 'Overview',
      'nav_attendance': 'Timesheet',
      'nav_requests': 'Requests',
      'nav_helpdesk': 'Helpdesk',
      'nav_profile': 'Account',

      // Auth Screen
      'login_title': 'Sign In',
      'login_username_hint': 'Username or Email',
      'login_password_hint': 'Password',
      'login_btn': 'Sign In',
      'login_face_id_btn': 'Face ID Biometric Sign In',
      'login_empty_fields': 'Please enter username and password',
      'login_failed': 'Authentication failed. Please verify credentials.',

      // Face Login Screen
      'face_login_title': '1-Touch Face ID',
      'face_login_instruction': 'Position face inside the Oval frame',
      'face_login_processing': 'Verifying face & liveness check...',
      'camera_init_failed': 'Failed to initialize camera',
      'photo_capture_error': 'Error capturing photo, please retry',

      // Face Enrollment Screen
      'face_enroll_title': 'Self-Enroll 5 Angles',
      'face_enroll_complete': 'Registration Complete',
      'face_enroll_success_desc': 'Successfully extracted and registered 5 ArcFace vector angles.',
      'face_enroll_fail_desc': 'Unable to save biometric data. Please try again.',
      'server_connect_error': 'Connection error with biometrics server.',
      'angle_front': 'Frontal View (0°)',
      'angle_front_inst': 'Look directly at camera center',
      'angle_up': 'Tilt Up (+15°)',
      'angle_up_inst': 'Tilt chin slightly upward ⬆️',
      'angle_down': 'Tilt Down (-15°)',
      'angle_down_inst': 'Tilt chin slightly downward ⬇️',
      'angle_left': 'Turn Left (-30°)',
      'angle_left_inst': 'Turn face slightly to the left ⬅️',
      'angle_right': 'Turn Right (+30°)',
      'angle_right_inst': 'Turn face slightly to the right ➡️',

      // Change Password Screen
      'change_password_title': 'Change Password',
      'old_password_label': 'Current Password',
      'new_password_label': 'New Password',
      'confirm_password_label': 'Confirm New Password',
      'update_password_btn': 'Update Password',
      'fill_all_fields': 'Please fill in all password fields',
      'password_mismatch': 'New password confirmation does not match',
      'change_password_success': 'Password updated successfully!',
      'change_password_fail': 'Failed to change password. Check your current password.',

      // Home Dashboard
      'greeting': 'Welcome back',
      'default_role': 'Specialist',
      'default_dept': 'Engineering',
      'today_shift': 'Shift 08:30 - 17:30',
      'time_in': 'Time In',
      'time_out': 'Time Out',
      'status': 'Status',
      'status_on_time': 'On Time',
      'status_late': 'Late',
      'status_absent': 'Absent',
      'status_recorded': 'Recorded',
      'status_unrecorded': 'Not Recorded',
      'status_approved': 'Approved',
      'status_pending': 'Pending',
      'status_rejected': 'Rejected',
      'quick_actions': 'Quick Services',
      'action_checkin': 'Check-In',
      'action_create_request': 'New Request',
      'action_payroll': 'Payroll',
      'action_face_enroll': 'Face ID',
      'recent_history': 'Recent Records',
      'records_count': 'records',
      'no_recent_records': 'No attendance records logged today.',
      'valid_checkin': 'Valid',
      'device_prefix': 'Device',

      // Attendance History & Checkin
      'attendance_history_title': 'Attendance Log',
      'no_attendance_history': 'No attendance history found',
      'no_attendance_sub': 'Your clock-in records will appear here',
      'load_history_error': 'Unable to fetch attendance log from server.',
      'checkin_screen_title': 'Mobile Check-In',
      'tablet_mode': 'Tablet Kiosk Mode',
      'hud_align_face': 'Position face inside the frame & Look directly',
      'hud_processing': 'Verifying GPS Geofencing & Face AI...',
      'checkin_success_title': 'Check-In Successful!',
      'checkin_fail_title': 'Check-In Failed',
      'checkin_now': 'Just now',
      'gps_distance': 'GPS Distance',
      'connection_error_desc': 'Cannot connect to server or location outside geofence.',

      // Requests Screen
      'requests_title': 'Leave & Attendance Requests',
      'create_request_btn': 'New Request',
      'create_request_title': 'Submit HR Request',
      'no_requests': 'No requests filed yet',
      'no_requests_sub': 'Tap "New Request" to apply for leave, business trips, or explanations...',
      'request_type': 'Request Category',
      'req_half_am': 'Half-day Leave (Morning: 08:30 - 12:00)',
      'req_half_pm': 'Half-day Leave (Afternoon: 13:30 - 17:30)',
      'req_business': 'Business Trip / Offsite Assignment',
      'req_late': 'Late Arrival / Early Departure Justification',
      'request_title_label': 'Request Title',
      'request_title_hint': 'e.g., Traffic delay justification...',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      'reason_label': 'Detailed Reason',
      'reason_hint': 'Describe the specific justification for manager review...',
      'submit_request_btn': 'Submit for Approval',
      'submit_request_success': 'Request submitted successfully!',
      'submit_request_error': 'Failed to submit request to server',
      'fill_required_fields': 'Please fill in title, reason, and effective dates',
      'approved_by_label': 'Approved by',

      // Helpdesk & KB Screen
      'helpdesk_title': 'IT Helpdesk & Knowledge Base',
      'tab_tickets': 'Support Tickets',
      'tab_kb': 'Knowledge Base',
      'create_ticket_btn': 'Create New Ticket',
      'create_ticket_title': 'Create IT Support Ticket',
      'ticket_type_label': 'Request Type',
      'ticket_urgency_label': 'Urgency & Impact Level',
      'ticket_title_label': 'Issue / Request Title',
      'ticket_title_hint': 'e.g., Main gate camera not recognizing face...',
      'ticket_desc_label': 'Detailed Issue Description',
      'ticket_desc_hint': 'Provide specific time, device location, error text, or permission details...',
      'submit_ticket_btn': 'Submit Support Ticket',
      'submit_ticket_success': 'IT support ticket created successfully!',
      'submit_ticket_error': 'Failed to create ticket. Please retry!',
      'fill_ticket_fields': 'Please enter issue title and description',
      'search_kb_hint': 'Search solutions, troubleshooting guides...',
      'no_tickets': 'No support tickets found',
      'no_tickets_sub': 'Create a ticket if you experience any technical issues',
      'no_articles': 'No articles found matching criteria',
      'load_tickets_error': 'Unable to load support tickets from server.',
      'load_kb_error': 'Unable to load knowledge base articles.',
      'ticket_type_incident': 'Technical Incident',
      'ticket_type_service': 'Service Request / Access',
      'ticket_type_problem': 'Recurring Problem Report',
      'urgency_low': 'Low (P4) - Normal Priority',
      'urgency_medium': 'Medium (P3) - Same Day Support',
      'urgency_high': 'High (P2) - Department Impact',
      'urgency_critical': 'Critical (P1) - Complete Outage',

      // Ticket Detail & Comments
      'ticket_detail_title': 'Ticket Details',
      'priority_prefix': 'Priority Level',
      'issue_content_header': 'Issue Details',
      'assigned_tech_prefix': 'Assigned Technician',
      'resolution_header': 'Resolution Summary',
      'discussion_header': 'Activity Log & Discussion',
      'no_discussion_yet': 'No messages yet. Send a message to IT below.',
      'reply_hint': 'Type reply to IT technician...',
      'send_reply_error': 'Error sending reply message',

      // KB Article Detail
      'kb_detail_title': 'Knowledge Base & Guides',
      'views_count': 'views',
      'helpful_count': 'helpful',
      'was_helpful_question': 'Was this article helpful to you?',
      'voted_helpful': 'Marked Helpful',
      'vote_helpful_btn': 'Yes, Very Helpful!',
      'vote_helpful_thanks': 'Thank you for your feedback!',

      // Payroll Screen
      'payroll_title': 'Electronic Pay Slip',
      'month_format': 'Month',
      'net_salary': 'NET TAKE-HOME PAY',
      'income_section': 'Earnings & Attendance Breakdown',
      'base_salary': 'Base Salary',
      'standard_days': 'Standard Work Days',
      'actual_days': 'Actual Worked Days',
      'ot_hours': 'Overtime (OT)',
      'ot_pay': 'Overtime Pay',
      'allowances': 'Position & Meal Allowances',
      'deductions_section': 'Statutory Deductions',
      'insurances': 'Mandatory Insurance (Social, Health)',
      'other_deductions': 'Other Deductions',
      'no_payroll_data': 'No payroll data available for this month.',
      'days_unit': 'days',
      'hours_unit': 'hours',

      // Profile & Settings
      'profile_title': 'Account & Preferences',
      'employee_code_prefix': 'ID',
      'setting_face_enroll': 'Biometric Face Enrollment',
      'setting_face_enroll_sub': 'Multi-angle recognition vectors',
      'setting_change_password': 'Change Account Password',
      'setting_change_password_sub': 'Regular security credential update',
      'setting_device_biometrics': 'Device Biometric Security',
      'setting_device_biometrics_sub': 'Device Fingerprint / Face Unlock',
      'setting_language': 'Display Language',
      'setting_language_sub': 'English / Tiếng Việt',
      'logout_btn': 'Sign Out',
      'logout_confirm_title': 'Confirm Sign Out',
      'logout_confirm_desc': 'Are you sure you want to sign out of your account?',
      'select_language_title': 'Select Display Language',
      'lang_vi': 'Tiếng Việt (Vietnamese)',
      'lang_en': 'English',
    },
  };

  String tr(String key) {
    final lang = locale.languageCode.toLowerCase().startsWith('en') ? 'en' : 'vi';
    return _localizedValues[lang]?[key] ?? _localizedValues['vi']?[key] ?? _localizedValues['en']?[key] ?? key;
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['vi', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

extension LocalizationExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String key) => AppLocalizations.of(this).tr(key);
}
