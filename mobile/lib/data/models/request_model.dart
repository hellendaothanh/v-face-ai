class HrmRequestModel {
  final int id;
  final String requestType; // 'leave_full', 'leave_half', 'late_excuse', 'early_excuse', 'business_trip', 'overtime'
  final String title;
  final String reason;
  final String startDate;
  final String endDate;
  final String status; // 'pending', 'approved', 'rejected'
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
    return HrmRequestModel(
      id: json['id'] ?? 0,
      requestType: json['request_type'] ?? 'leave_full',
      title: json['title'] ?? '',
      reason: json['reason'] ?? '',
      startDate: json['start_date'] ?? '',
      endDate: json['end_date'] ?? '',
      status: json['status'] ?? 'pending',
      approvedBy: json['approved_by'],
      rejectionReason: json['rejection_reason'],
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'request_type': requestType,
    'title': title,
    'reason': reason,
    'start_date': startDate,
    'end_date': endDate,
  };
}
