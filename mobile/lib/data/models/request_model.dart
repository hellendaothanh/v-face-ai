class HrmRequestModel {
  final dynamic id;
  final String requestType; // 'HALF_DAY_LEAVE_AM', 'HALF_DAY_LEAVE_PM', 'BUSINESS_TRIP', 'LATE_EXCUSE'
  final String title;
  final String reason;
  final String startDate;
  final String endDate;
  final String status; // 'PENDING', 'APPROVED', 'REJECTED'
  final String? approvedBy;
  final String? rejectionReason;
  final String createdAt;

  HrmRequestModel({
    required this.id,
    required this.requestType,
    required this.title,
    required this.reason,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.approvedBy,
    this.rejectionReason,
    required this.createdAt,
  });

  factory HrmRequestModel.fromJson(Map<String, dynamic> json) {
    final reqType = json['request_type'] ?? 'HALF_DAY_LEAVE_AM';
    String displayTitle = json['title'] ?? '';
    if (displayTitle.isEmpty) {
      if (reqType == 'HALF_DAY_LEAVE_AM') {
        displayTitle = 'Nghỉ phép nửa ngày (Sáng)';
      } else if (reqType == 'HALF_DAY_LEAVE_PM') displayTitle = 'Nghỉ phép nửa ngày (Chiều)';
      else if (reqType == 'BUSINESS_TRIP') displayTitle = 'Đăng ký công tác / Ra ngoài';
      else if (reqType == 'LATE_EXCUSE') displayTitle = 'Giải trình đi muộn / về sớm';
      else displayTitle = reqType.toString();
    }

    final targetDate = json['target_date'] ?? json['start_date'] ?? '';

    return HrmRequestModel(
      id: json['id'] ?? 0,
      requestType: reqType.toString(),
      title: displayTitle,
      reason: json['reason'] ?? '',
      startDate: targetDate,
      endDate: json['end_date'] ?? targetDate,
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      approvedBy: json['approved_by'],
      rejectionReason: json['note'] ?? json['rejection_reason'],
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'request_type': requestType,
    'target_date': startDate,
    'reason': reason,
  };
}
