class CheckInResultModel {
  final bool success;
  final String message;
  final String? employeeName;
  final String? userCode;
  final String? checkInTime;
  final double? confidence;
  final double? distanceMeters;
  final bool isLate;

  CheckInResultModel({
    required this.success,
    required this.message,
    this.employeeName,
    this.userCode,
    this.checkInTime,
    this.confidence,
    this.distanceMeters,
    this.isLate = false,
  });

  factory CheckInResultModel.fromJson(Map<String, dynamic> rawJson) {
    final Map<String, dynamic> data = rawJson['data'] is Map<String, dynamic>
        ? rawJson['data'] as Map<String, dynamic>
        : rawJson;

    return CheckInResultModel(
      success: rawJson['success'] ?? data['success'] ?? true,
      message: rawJson['message'] ?? data['message'] ?? 'Chấm công thành công',
      employeeName: data['employee_name'] ?? data['full_name'] ?? data['user']?['full_name'],
      userCode: data['employee_code'] ?? data['user_code'],
      checkInTime: data['check_time'] ?? data['check_in_time'] ?? data['timestamp'] ?? DateTime.now().toString().substring(11, 16),
      confidence: (data['confidence'] ?? data['confidence_score'] != null)
          ? ((data['confidence'] ?? data['confidence_score']) as num).toDouble()
          : null,
      distanceMeters: (data['distance_meters'] != null)
          ? (data['distance_meters'] as num).toDouble()
          : null,
      isLate: data['is_late'] ?? false,
    );
  }
}

class AttendanceRecordModel {
  final dynamic id;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String status; // 'on_time', 'late', 'absent', 'early_leave'
  final double? totalHours;
  final String? deviceName;
  final String? employeeName;
  final String? employeeCode;

  AttendanceRecordModel({
    required this.id,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.status,
    this.totalHours,
    this.deviceName,
    this.employeeName,
    this.employeeCode,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    String dateFormatted = json['date'] ?? '';
    String? checkInTime = json['check_in'] ?? json['checkIn'];
    String? checkOutTime = json['check_out'] ?? json['checkOut'];

    // If check_time is provided as ISO timestamp from Face AI Backend
    if (json['check_time'] != null) {
      try {
        final dt = DateTime.parse(json['check_time']).toLocal();
        dateFormatted = "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}";
        final timeStr = "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
        
        final type = (json['attendance_type'] ?? 'CHECK_IN').toString().toUpperCase();
        if (type.contains('IN')) {
          checkInTime ??= timeStr;
        } else if (type.contains('OUT')) {
          checkOutTime ??= timeStr;
        } else {
          checkInTime ??= timeStr;
        }
      } catch (_) {}
    }

    String? empName = json['employee_name'] ?? json['full_name'];
    String? empCode = json['employee_code'];
    if (json['employee'] is Map) {
      empName ??= json['employee']['full_name'];
      empCode ??= json['employee']['employee_code'];
    }

    return AttendanceRecordModel(
      id: json['id'] ?? 0,
      date: dateFormatted.isNotEmpty ? dateFormatted : DateTime.now().toString().substring(0, 10),
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: json['status'] ?? (json['is_late'] == true ? 'late' : 'on_time'),
      totalHours: (json['total_hours'] ?? json['work_duration_hours'] != null)
          ? ((json['total_hours'] ?? json['work_duration_hours']) as num).toDouble()
          : null,
      deviceName: json['device_id'] ?? json['device_name'] ?? 'Mobile App',
      employeeName: empName,
      employeeCode: empCode,
    );
  }
}
