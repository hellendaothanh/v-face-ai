class PayrollRecordModel {
  final int id;
  final int month;
  final int year;
  final double baseSalary;
  final double standardDays;
  final double actualWorkingDays;
  final double otHours;
  final double otPay;
  final double allowances;
  final double deductions;
  final double netSalary;
  final String status; // 'draft', 'confirmed', 'paid'

  PayrollRecordModel({
    required this.id,
    required this.month,
    required this.year,
    required this.baseSalary,
    required this.standardDays,
    required this.actualWorkingDays,
    required this.otHours,
    required this.otPay,
    required this.allowances,
    required this.deductions,
    required this.netSalary,
    required this.status,
  });

  factory PayrollRecordModel.fromJson(Map<String, dynamic> json) {
    return PayrollRecordModel(
      id: json['id'] ?? 0,
      month: json['month'] ?? DateTime.now().month,
      year: json['year'] ?? DateTime.now().year,
      baseSalary: (json['base_salary'] as num?)?.toDouble() ?? 0.0,
      standardDays: (json['standard_days'] as num?)?.toDouble() ?? 22.0,
      actualWorkingDays: (json['actual_working_days'] as num?)?.toDouble() ?? 0.0,
      otHours: (json['ot_hours'] as num?)?.toDouble() ?? 0.0,
      otPay: (json['ot_pay'] as num?)?.toDouble() ?? 0.0,
      allowances: (json['allowances'] as num?)?.toDouble() ?? 0.0,
      deductions: (json['deductions'] as num?)?.toDouble() ?? 0.0,
      netSalary: (json['net_salary'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'confirmed',
    );
  }
}
