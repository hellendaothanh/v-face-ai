import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/language/language_cubit.dart';
import '../attendance/mobile_checkin_screen.dart';
import '../biometrics/face_enrollment_screen.dart';
import '../requests/create_request_screen.dart';
import '../timesheet/payroll_detail_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  final AttendanceRepository _repo = AttendanceRepository();
  bool _isLoading = true;
  String _checkInTime = "--:--";
  String _checkOutTime = "--:--";
  String _statusCode = "unrecorded";
  Color _statusColor = Colors.white60;
  List<AttendanceRecordModel> _recentRecords = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final records = await _repo.getHistory(limit: 10);
      if (mounted) {
        final todayStr = DateFormat('dd/MM/yyyy').format(DateTime.now());
        final todayRecord = records.firstWhere(
          (r) => r.date == todayStr || r.date.contains(todayStr),
          orElse: () => records.isNotEmpty ? records.first : AttendanceRecordModel(
            id: 0,
            date: todayStr,
            status: 'unrecorded',
          ),
        );

        setState(() {
          _recentRecords = records.take(3).toList();
          _checkInTime = todayRecord.checkIn ?? "--:--";
          _checkOutTime = todayRecord.checkOut ?? "--:--";
          if (todayRecord.checkIn != null) {
            _statusCode = todayRecord.status.toLowerCase();
            if (_statusCode == 'on_time' || _statusCode == 'auto') {
              _statusColor = AppColors.success;
            } else if (_statusCode == 'late') {
              _statusColor = AppColors.warning;
            } else {
              _statusColor = AppColors.primaryLight;
            }
          } else {
            _statusCode = 'unrecorded';
            _statusColor = Colors.white60;
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getStatusText(BuildContext context, String code) {
    switch (code) {
      case 'on_time':
      case 'auto':
        return context.tr('status_on_time');
      case 'late':
        return context.tr('status_late');
      case 'absent':
        return context.tr('status_absent');
      case 'approved':
        return context.tr('status_approved');
      case 'unrecorded':
        return context.tr('status_unrecorded');
      default:
        return context.tr('status_recorded');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isVi = context.read<LanguageCubit>().state.languageCode == 'vi';
    final now = DateTime.now();
    final dateFormatted = DateFormat(isVi ? 'EEEE, dd/MM/yyyy' : 'EEEE, MMM dd, yyyy', isVi ? 'vi' : 'en').format(now);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Corporate Header
                BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) {
                    String name = "User";
                    String role = context.tr('default_role');
                    String dept = context.tr('default_dept');
                    String code = "EMP";
                    if (state is AuthenticatedState) {
                      name = state.user.fullName;
                      role = state.user.positionName ?? state.user.role ?? context.tr('default_role');
                      dept = state.user.departmentName ?? context.tr('default_dept');
                      code = state.user.userCode ?? "EMP-${state.user.id.substring(0, 4)}";
                    }

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderDark),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primary.withOpacity(0.15),
                              border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                            ),
                            child: Center(
                              child: Text(
                                name.isNotEmpty ? name.substring(0, 1).toUpperCase() : "U",
                                style: const TextStyle(
                                  color: AppColors.primaryLight,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "${context.tr('greeting')}, $name",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "$code  •  $role  •  $dept",
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.6),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, color: Colors.white70, size: 20),
                            onPressed: _loadDashboardData,
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),

                // Attendance Status Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderDark),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.access_time_rounded, color: AppColors.primaryLight, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                dateFormatted,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              context.tr('today_shift'),
                              style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricItem(context.tr('time_in'), _checkInTime, Icons.login_rounded, AppColors.success),
                          ),
                          Container(width: 1, height: 36, color: AppColors.borderDark),
                          Expanded(
                            child: _buildMetricItem(context.tr('time_out'), _checkOutTime, Icons.logout_rounded, Colors.white60),
                          ),
                          Container(width: 1, height: 36, color: AppColors.borderDark),
                          Expanded(
                            child: _buildMetricItem(context.tr('status'), _getStatusText(context, _statusCode), Icons.check_circle_outline_rounded, _statusColor),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Quick Services Grid
                Text(
                  context.tr('quick_actions'),
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 4,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 10,
                  children: [
                    _buildFeatureCard(
                      context,
                      icon: Icons.camera_alt_outlined,
                      label: context.tr('action_checkin'),
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MobileCheckInScreen()),
                        );
                        _loadDashboardData();
                      },
                    ),
                    _buildFeatureCard(
                      context,
                      icon: Icons.assignment_turned_in_outlined,
                      label: context.tr('action_create_request'),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                      ),
                    ),
                    _buildFeatureCard(
                      context,
                      icon: Icons.payments_outlined,
                      label: context.tr('action_payroll'),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PayrollDetailScreen()),
                      ),
                    ),
                    _buildFeatureCard(
                      context,
                      icon: Icons.shield_outlined,
                      label: context.tr('action_face_enroll'),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FaceEnrollmentScreen()),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Recent Attendance History List
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      context.tr('recent_history'),
                      style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "${_recentRecords.length} ${context.tr('records_count')}",
                      style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                if (_isLoading) ...[
                  const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: AppColors.primary))),
                ] else if (_recentRecords.isEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.borderDark),
                    ),
                    child: Center(
                      child: Text(
                        context.tr('no_recent_records'),
                        style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                      ),
                    ),
                  ),
                ] else ...[
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _recentRecords.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = _recentRecords[index];
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderDark),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.access_time_rounded, color: AppColors.primaryLight, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.date,
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    "${context.tr('time_in')}: ${item.checkIn ?? '--:--'}  •  ${context.tr('device_prefix')}: ${item.deviceName ?? 'Mobile'}",
                                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              item.checkIn != null ? context.tr('valid_checkin') : "--:--",
                              style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          textAlign: TextAlign.center,
          style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildFeatureCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderDark),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primaryLight, size: 20),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
