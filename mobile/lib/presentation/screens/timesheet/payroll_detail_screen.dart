import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/models/payroll_model.dart';
import '../../../data/repositories/hrm_repository.dart';

class PayrollDetailScreen extends StatefulWidget {
  const PayrollDetailScreen({super.key});

  @override
  State<PayrollDetailScreen> createState() => _PayrollDetailScreenState();
}

class _PayrollDetailScreenState extends State<PayrollDetailScreen> {
  final HrmRepository _repo = HrmRepository();
  bool _isLoading = true;
  String? _errorMessage;
  PayrollRecordModel? _payroll;
  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _loadPayroll();
  }

  Future<void> _loadPayroll() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final data = await _repo.getPayrollRecord(month: _selectedMonth, year: _selectedYear);
      if (mounted) {
        setState(() {
          _payroll = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = context.tr('no_payroll_data');
          _isLoading = false;
        });
      }
    }
  }

  void _changeMonth(int delta) {
    setState(() {
      _selectedMonth += delta;
      if (_selectedMonth < 1) {
        _selectedMonth = 12;
        _selectedYear -= 1;
      } else if (_selectedMonth > 12) {
        _selectedMonth = 1;
        _selectedYear += 1;
      }
    });
    _loadPayroll();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: Text(context.tr('payroll_title')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            // Month Selector Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.surfaceDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderDark),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left_rounded, color: Colors.white70),
                    onPressed: () => _changeMonth(-1),
                  ),
                  Text(
                    "${context.tr('month_format')} ${_selectedMonth.toString().padLeft(2, '0')}/$_selectedYear",
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right_rounded, color: Colors.white70),
                    onPressed: () => _changeMonth(1),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (_isLoading) ...[
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primary))),
            ] else if (_errorMessage != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderDark),
                ),
                child: Column(
                  children: [
                    Icon(Icons.receipt_long_outlined, color: Colors.white.withValues(alpha: 0.25), size: 48),
                    const SizedBox(height: 12),
                    Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadPayroll,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      child: Text(context.tr('retry'), style: const TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Total Net Salary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderDark),
                ),
                child: Column(
                  children: [
                    Text(
                      context.tr('net_salary'),
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12, letterSpacing: 1.2, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      currencyFormatter.format(_payroll?.netSalary ?? 0),
                      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        "${context.tr('status')}: ${_payroll?.status.toUpperCase() ?? 'APPROVED'}",
                        style: const TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Detail Breakdown
              _buildSectionTitle(context.tr('income_section')),
              const SizedBox(height: 8),
              _buildCard([
                _buildRow(context.tr('base_salary'), currencyFormatter.format(_payroll?.baseSalary ?? 0)),
                _buildRow(context.tr('standard_days'), "${_payroll?.standardDays ?? 22} ${context.tr('days_unit')}"),
                _buildRow(context.tr('actual_days'), "${_payroll?.actualWorkingDays ?? 0} ${context.tr('days_unit')}"),
                _buildRow(context.tr('ot_hours'), "${_payroll?.otHours ?? 0} ${context.tr('hours_unit')}"),
                _buildRow(context.tr('ot_pay'), currencyFormatter.format(_payroll?.otPay ?? 0), color: AppColors.success),
                _buildRow(context.tr('allowances'), currencyFormatter.format(_payroll?.allowances ?? 0), color: AppColors.success),
              ]),
              const SizedBox(height: 18),

              _buildSectionTitle(context.tr('deductions_section')),
              const SizedBox(height: 8),
              _buildCard([
                _buildRow(context.tr('insurances'), currencyFormatter.format(_payroll?.deductions ?? 0), color: AppColors.error),
                _buildRow(context.tr('other_deductions'), "0 ₫"),
              ]),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildRow(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 13)),
          Text(value, style: TextStyle(color: color ?? Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
