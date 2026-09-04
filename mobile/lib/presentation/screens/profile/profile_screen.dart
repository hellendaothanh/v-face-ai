import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/language/language_cubit.dart';
import '../auth/login_screen.dart';
import '../biometrics/face_enrollment_screen.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _showLanguageSelector(BuildContext context) {
    final currentLang = context.read<LanguageCubit>().state.languageCode;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('select_language_title'),
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 18),
                ListTile(
                  leading: const Text("🇻🇳", style: TextStyle(fontSize: 26)),
                  title: const Text("Tiếng Việt", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  subtitle: const Text("Vietnamese", style: TextStyle(color: Colors.white54, fontSize: 12)),
                  trailing: currentLang == 'vi'
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primaryLight)
                      : null,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  tileColor: currentLang == 'vi' ? AppColors.primary.withValues(alpha: 0.12) : null,
                  onTap: () {
                    context.read<LanguageCubit>().setLanguage('vi');
                    Navigator.pop(ctx);
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: const Text("🇬🇧", style: TextStyle(fontSize: 26)),
                  title: const Text("English", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  subtitle: const Text("Tiếng Anh", style: TextStyle(color: Colors.white54, fontSize: 12)),
                  trailing: currentLang == 'en'
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primaryLight)
                      : null,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  tileColor: currentLang == 'en' ? AppColors.primary.withValues(alpha: 0.12) : null,
                  onTap: () {
                    context.read<LanguageCubit>().setLanguage('en');
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: Text(context.tr('profile_title')),
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
          String fullName = "User";
          String email = "employee@vface.ai";
          String userCode = "EMP000";
          String dept = context.tr('default_dept');
          String role = context.tr('default_role');

          if (state is AuthenticatedState) {
            fullName = state.user.fullName;
            email = state.user.email;
            userCode = state.user.userCode ?? "EMP-${state.user.id.substring(0, 4)}";
            dept = state.user.departmentName ?? context.tr('default_dept');
            role = state.user.positionName ?? state.user.role ?? context.tr('default_role');
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
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderDark),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary.withValues(alpha: 0.15),
                          border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.5), width: 2),
                        ),
                        child: Center(
                          child: Text(
                            fullName.isNotEmpty ? fullName.substring(0, 1).toUpperCase() : "U",
                            style: const TextStyle(color: AppColors.primaryLight, fontSize: 26, fontWeight: FontWeight.bold),
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
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          "${context.tr('employee_code_prefix')}: $userCode  •  $role  •  $dept",
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Settings List in Material Card
                Material(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(16),
                  clipBehavior: Clip.antiAlias,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.borderDark),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        _buildTile(
                          icon: Icons.badge_outlined,
                          title: context.tr('setting_face_enroll'),
                          subtitle: context.tr('setting_face_enroll_sub'),
                          color: AppColors.primaryLight,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const FaceEnrollmentScreen()),
                          ),
                        ),
                        const Divider(color: AppColors.borderDark, height: 1),
                        _buildTile(
                          icon: Icons.lock_outline_rounded,
                          title: context.tr('setting_change_password'),
                          subtitle: context.tr('setting_change_password_sub'),
                          color: AppColors.warning,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
                          ),
                        ),
                        const Divider(color: AppColors.borderDark, height: 1),
                        _buildTile(
                          icon: Icons.fingerprint_rounded,
                          title: context.tr('setting_device_biometrics'),
                          subtitle: context.tr('setting_device_biometrics_sub'),
                          color: AppColors.success,
                          trailing: Switch(
                            value: true,
                            activeTrackColor: AppColors.primary.withValues(alpha: 0.5),
                            activeThumbColor: AppColors.primaryLight,
                            onChanged: (val) {},
                          ),
                        ),
                        const Divider(color: AppColors.borderDark, height: 1),
                        _buildTile(
                          icon: Icons.language_rounded,
                          title: context.tr('setting_language'),
                          subtitle: context.tr('setting_language_sub'),
                          color: AppColors.info,
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                context.read<LanguageCubit>().state.languageCode == 'vi' ? "🇻🇳 VI" : "🇬🇧 EN",
                                style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right_rounded, color: Colors.white30, size: 20),
                            ],
                          ),
                          onTap: () => _showLanguageSelector(context),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Logout Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppColors.surfaceDark,
                          title: Text(context.tr('logout_confirm_title'), style: const TextStyle(color: Colors.white)),
                          content: Text(context.tr('logout_confirm_desc'), style: const TextStyle(color: Colors.white70)),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: Text(context.tr('cancel'), style: const TextStyle(color: Colors.white60)),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                context.read<AuthBloc>().add(LogoutEvent());
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                              child: Text(context.tr('logout_btn'), style: const TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 18),
                    label: Text(context.tr('logout_btn'), style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.error, width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
    String? subtitle,
    required Color color,
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
      subtitle: subtitle != null ? Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)) : null,
      trailing: trailing ?? const Icon(Icons.chevron_right_rounded, color: Colors.white30, size: 20),
      onTap: onTap,
    );
  }
}
