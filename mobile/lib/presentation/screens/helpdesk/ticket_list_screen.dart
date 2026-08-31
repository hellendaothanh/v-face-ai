import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/helpdesk_model.dart';
import '../../../data/repositories/helpdesk_repository.dart';
import '../../widgets/status_badge.dart';

class TicketListScreen extends StatefulWidget {
  const TicketListScreen({super.key});

  @override
  State<TicketListScreen> createState() => _TicketListScreenState();
}

class _TicketListScreenState extends State<TicketListScreen> {
  final HelpdeskRepository _repo = HelpdeskRepository();
  bool _isLoading = true;
  List<HelpdeskTicketModel> _tickets = [];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    try {
      final list = await _repo.getTickets();
      if (mounted) {
        setState(() {
          _tickets = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _tickets = [
            HelpdeskTicketModel(id: 1, title: "Lỗi camera cửa chính không nhận diện Face ID", description: "Camera tầng 1 quét chậm khi đeo khẩu trang", category: "camera", priority: "P2 - High", status: "In Progress", assignedTo: "Trần Quang Hải (IT Lead)", createdAt: "30/08/2026"),
            HelpdeskTicketModel(id: 2, title: "Cấp tài khoản VPN và cấp quyền IAM", description: "Yêu cầu cấp quyền truy cập máy chủ chấm công từ xa", category: "iam", priority: "P3 - Medium", status: "Resolved", assignedTo: "System Admin", csatRating: 5, createdAt: "25/08/2026"),
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
        title: const Text("ITIL Helpdesk & Hỗ Trợ"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadTickets,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadTickets,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _tickets.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final ticket = _tickets[index];
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primaryLight.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                "#${ticket.category.toUpperCase()}",
                                style: const TextStyle(color: AppColors.accentNeon, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                            StatusBadge(status: ticket.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          ticket.title,
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ticket.description,
                          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Độ ưu tiên: ${ticket.priority}",
                              style: const TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                            if (ticket.assignedTo != null)
                              Text(
                                "IT: ${ticket.assignedTo}",
                                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                              ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
