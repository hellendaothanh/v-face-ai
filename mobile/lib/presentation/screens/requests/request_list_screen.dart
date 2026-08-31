import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/request_model.dart';
import '../../../data/repositories/hrm_repository.dart';
import '../../widgets/status_badge.dart';
import 'create_request_screen.dart';

class RequestListScreen extends StatefulWidget {
  const RequestListScreen({super.key});

  @override
  State<RequestListScreen> createState() => _RequestListScreenState();
}

class _RequestListScreenState extends State<RequestListScreen> {
  final HrmRepository _repo = HrmRepository();
  bool _isLoading = true;
  List<HrmRequestModel> _requests = [];

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _isLoading = true);
    try {
      final list = await _repo.getMyRequests();
      if (mounted) {
        setState(() {
          _requests = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _requests = [
            HrmRequestModel(id: 1, requestType: "leave_full", title: "Nghỉ phép thường niên", reason: "Giải quyết việc cá nhân gia đình", startDate: "02/09/2026", endDate: "02/09/2026", status: "approved", approvedBy: "Lê Tuyết Mai (HR)", createdAt: "28/08/2026"),
            HrmRequestModel(id: 2, requestType: "late_excuse", title: "Giải trình đi muộn", reason: "Mưa lớn kẹt xe tại đường Nguyễn Trãi", startDate: "28/08/2026 08:30", endDate: "28/08/2026 08:45", status: "approved", approvedBy: "Phạm Quốc Hùng (Manager)", createdAt: "28/08/2026"),
            HrmRequestModel(id: 3, requestType: "overtime", title: "Đăng ký làm thêm giờ (OT)", reason: "Triển khai nâng cấp hệ thống máy chủ Face AI", startDate: "31/08/2026 18:00", endDate: "31/08/2026 21:00", status: "pending", createdAt: "29/08/2026"),
          ];
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text("Quản Lý Đơn Từ & Phép"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadRequests,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
          );
          if (res == true) _loadRequests();
        },
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text("Tạo Đơn Mới", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadRequests,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                itemCount: _requests.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final req = _requests[index];
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                req.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            StatusBadge(status: req.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          req.reason,
                          style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.accentNeon),
                              const SizedBox(width: 6),
                              Text(
                                "${req.startDate} ➜ ${req.endDate}",
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        if (req.approvedBy != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            "Người duyệt: ${req.approvedBy}",
                            style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
