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

  factory CheckInResultModel.fromJson(Map<String, dynamic> json) {
    return CheckInResultModel(
      success: json['success'] ?? true,
      message: json['message'] ?? 'Check-in thành công',
      employeeName: json['employee_name'] ?? json['user']?['full_name'],
      userCode: json['user_code'],
      checkInTime: json['timestamp'] ?? json['check_in_time'],
      confidence: (json['confidence'] != null) ? (json['confidence'] as num).toDouble() : null,
      distanceMeters: (json['distance_meters'] != null) ? (json['distance_meters'] as num).toDouble() : null,
      isLate: json['is_late'] ?? false,
    );
  }
}

class AttendanceRecordModel {
  final int id;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String status; // 'on_time', 'late', 'absent', 'early_leave'
  final double? totalHours;
  final String? deviceName;

  AttendanceRecordModel({
    required this.id,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.status,
    this.totalHours,
    this.deviceName,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    return AttendanceRecordModel(
      id: json['id'] ?? 0,
      date: json['date'] ?? '',
      checkIn: json['check_in'],
      checkOut: json['check_out'],
      status: json['status'] ?? 'on_time',
      totalHours: (json['total_hours'] != null) ? (json['total_hours'] as num).toDouble() : null,
      deviceName: json['device_name'],
    );
  }
}
