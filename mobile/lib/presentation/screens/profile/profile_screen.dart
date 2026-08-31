import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../auth/login_screen.dart';
import '../biometrics/face_enrollment_screen.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text("Tài Khoản & Cá Nhân"),
      ),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is UnauthenticatedState) {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
              (route) => false,
            );
          }
        },
        builder: (context, state) {
          String fullName = "Nhân viên";
          String email = "employee@vface.ai";
          String userCode = "VF-000";
          String dept = "Công nghệ";
          String role = "Chuyên viên";

          if (state is AuthenticatedState) {
            fullName = state.user.fullName;
            email = state.user.email;
            userCode = state.user.userCode ?? "VF-${state.user.id}";
            dept = state.user.departmentName ?? "Công nghệ";
            role = state.user.positionName ?? state.user.role ?? "Nhân viên";
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Profile Avatar Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.primaryGradient,
                        ),
                        child: Center(
                          child: Text(
                            fullName.isNotEmpty ? fullName.substring(0, 1).toUpperCase() : "U",
                            style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        fullName,
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          "Mã NV: $userCode  •  $role  •  $dept",
                          style: const TextStyle(color: AppColors.accentNeon, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Settings List
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Column(
                    children: [
                      _buildTile(
                        icon: Icons.face_retouching_natural_rounded,
                        title: "Cập nhật dữ liệu Face AI (5 góc)",
                        color: AppColors.accentNeon,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const FaceEnrollmentScreen()),
                        ),
                      ),
                      const Divider(color: Colors.white12, height: 1),
                      _buildTile(
                        icon: Icons.lock_reset_rounded,
                        title: "Đổi mật khẩu",
                        color: AppColors.warning,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
                        ),
                      ),
                      const Divider(color: Colors.white12, height: 1),
                      _buildTile(
                        icon: Icons.fingerprint_rounded,
                        title: "Bật bảo mật sinh trắc học máy",
                        color: AppColors.success,
                        trailing: Switch(
                          value: true,
                          activeThumbColor: AppColors.accentNeon,
                          onChanged: (val) {},
                        ),
                      ),
                      const Divider(color: Colors.white12, height: 1),
                      _buildTile(
                        icon: Icons.language_rounded,
                        title: "Ngôn ngữ (Language)",
                        color: AppColors.info,
                        trailing: const Text("Tiếng Việt (VI)", style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Logout Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => context.read<AuthBloc>().add(LogoutEvent()),
                    icon: const Icon(Icons.logout_rounded, color: AppColors.error),
                    label: const Text("Đăng Xuất", style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.error, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String title,
    required Color color,
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
      trailing: trailing ?? const Icon(Icons.chevron_right_rounded, color: Colors.white38),
      onTap: onTap,
    );
  }
}
