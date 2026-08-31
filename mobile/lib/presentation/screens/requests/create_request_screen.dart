import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/request_model.dart';
import '../../../data/repositories/hrm_repository.dart';

class CreateRequestScreen extends StatefulWidget {
  const CreateRequestScreen({super.key});

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final HrmRepository _repo = HrmRepository();
  final _titleController = TextEditingController();
  final _reasonController = TextEditingController();
  final _startDateController = TextEditingController();
  final _endDateController = TextEditingController();

  String _selectedType = "leave_full";
  bool _isSubmitting = false;

  final Map<String, String> _typeOptions = const {
    "leave_full": "Nghỉ phép cả ngày (Full Day)",
    "leave_half": "Nghỉ phép nửa ngày (Half Day)",
    "late_excuse": "Giải trình đi muộn",
    "early_excuse": "Xin về sớm",
    "business_trip": "Công tác / Đi ra ngoài",
    "overtime": "Đăng ký làm thêm giờ (OT)",
  };

  @override
  void dispose() {
    _titleController.dispose();
    _reasonController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final reason = _reasonController.text.trim();
    final start = _startDateController.text.trim();
    final end = _endDateController.text.trim();

    if (title.isEmpty || reason.isEmpty || start.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền đầy đủ tiêu đề, lý do và thời gian")),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final req = HrmRequestModel(
        id: 0,
        requestType: _selectedType,
        title: title,
        reason: reason,
        startDate: start,
        endDate: end.isNotEmpty ? end : start,
        status: "pending",
        createdAt: DateTime.now().toString(),
      );

      await _repo.createRequest(req);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Gửi đơn thành công!", style: TextStyle(color: Colors.white)), backgroundColor: AppColors.success),
        );
        Navigator.pop(context, true);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Lỗi khi gửi đơn lên máy chủ"), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text("Tạo Đơn Yêu Cầu Mới"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Request Type Selector
            const Text("Loại Yêu Cầu", style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppColors.surfaceDark,
                borderRadius: BorderRadius.circular(14),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedType,
                  dropdownColor: AppColors.surfaceDark,
                  isExpanded: true,
                  items: _typeOptions.entries.map((e) {
                    return DropdownMenuItem(
                      value: e.key,
                      child: Text(e.value, style: const TextStyle(color: Colors.white)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedType = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Title
            const Text("Tiêu Đề", style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: _titleController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: "VD: Nghỉ phép cá nhân, Giải trình muộn...",
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
                filled: true,
                fillColor: AppColors.surfaceDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 18),

            // Date Range
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Từ ngày / giờ", style: TextStyle(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _startDateController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: "DD/MM/YYYY",
                          hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
                          filled: true,
                          fillColor: AppColors.surfaceDark,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Đến ngày / giờ", style: TextStyle(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _endDateController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: "DD/MM/YYYY",
                          hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
                          filled: true,
                          fillColor: AppColors.surfaceDark,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Reason
            const Text("Lý Do Chi Tiết", style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonController,
              maxLines: 4,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: "Nhập lý do cụ thể...",
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
                filled: true,
                fillColor: AppColors.surfaceDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white))
                  : const Text("Gửi Yêu Cầu Phê Duyệt", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
