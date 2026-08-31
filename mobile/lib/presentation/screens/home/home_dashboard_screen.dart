import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../attendance/mobile_checkin_screen.dart';
import '../biometrics/face_enrollment_screen.dart';
import '../requests/create_request_screen.dart';
import '../timesheet/payroll_detail_screen.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final dateStr = DateFormat('EEEE, dd/MM/yyyy', 'vi').format(now);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top User Greeting Banner
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  String name = "Nhân viên";
                  String role = "Chuyên viên";
                  String dept = "V-Face Enterprise";
                  if (state is AuthenticatedState) {
                    name = state.user.fullName;
                    role = state.user.positionName ?? state.user.role ?? "Nhân viên";
                    dept = state.user.departmentName ?? "Công nghệ";
                  }

                  return Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.primaryGradient,
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name.substring(0, 1).toUpperCase() : "U",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Xin chào, $name 👋",
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "$role • $dept",
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.65),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),

              // Today's Status Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          dateStr,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            "Ca Hành Chính (08:30 - 17:30)",
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildAttendanceMetric("Giờ Vào", "08:24", Icons.login_rounded, AppColors.accentNeon),
                        Container(width: 1, height: 40, color: Colors.white24),
                        _buildAttendanceMetric("Giờ Ra", "--:--", Icons.logout_rounded, Colors.white70),
                        Container(width: 1, height: 40, color: Colors.white24),
                        _buildAttendanceMetric("Trạng Thái", "Đúng Giờ", Icons.verified_rounded, AppColors.success),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Quick Actions
              const Text(
                "Tiện Ích Nhanh",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 14),

              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 4,
                mainAxisSpacing: 16,
                crossAxisSpacing: 12,
                children: [
                  _buildQuickAction(
                    context,
                    icon: Icons.camera_front_rounded,
                    label: "Chấm Công",
                    color: AppColors.primaryLight,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MobileCheckInScreen()),
                    ),
                  ),
                  _buildQuickAction(
                    context,
                    icon: Icons.add_task_rounded,
                    label: "Tạo Đơn",
                    color: AppColors.accent,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                    ),
                  ),
                  _buildQuickAction(
                    context,
                    icon: Icons.account_balance_wallet_rounded,
                    label: "Bảng Lương",
                    color: AppColors.success,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PayrollDetailScreen()),
                    ),
                  ),
                  _buildQuickAction(
                    context,
                    icon: Icons.face_rounded,
                    label: "Face 5 Góc",
                    color: AppColors.warning,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const FaceEnrollmentScreen()),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttendanceMetric(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildQuickAction(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
