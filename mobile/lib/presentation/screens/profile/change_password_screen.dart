import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/repositories/auth_repository.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final AuthRepository _repo = AuthRepository();
  final _oldPassController = TextEditingController();
  final _newPassController = TextEditingController();
  final _confirmPassController = TextEditingController();
  bool _isSaving = false;

  @override
  void dispose() {
    _oldPassController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  Future<void> _submitChange() async {
    final oldP = _oldPassController.text;
    final newP = _newPassController.text;
    final confirmP = _confirmPassController.text;

    if (oldP.isEmpty || newP.isEmpty || confirmP.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền đầy đủ các trường")),
      );
      return;
    }

    if (newP != confirmP) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Mật khẩu xác nhận không khớp")),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await _repo.changePassword(oldPassword: oldP, newPassword: newP);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Đổi mật khẩu thành công!"), backgroundColor: AppColors.success),
        );
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ."), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text("Đổi Mật Khẩu")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildField("Mật khẩu hiện tại", _oldPassController),
            const SizedBox(height: 16),
            _buildField("Mật khẩu mới", _newPassController),
            const SizedBox(height: 16),
            _buildField("Xác nhận mật khẩu mới", _confirmPassController),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSaving ? null : _submitChange,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSaving
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white))
                  : const Text("Cập Nhật Mật Khẩu", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.surfaceDark,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
      ],
    );
  }
}
