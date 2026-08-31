import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../widgets/status_badge.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final AttendanceRepository _repo = AttendanceRepository();
  bool _isLoading = true;
  List<AttendanceRecordModel> _records = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    try {
      final list = await _repo.getHistory();
      if (mounted) {
        setState(() {
          _records = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      // Mock data sample if API offline for testing
      if (mounted) {
        setState(() {
          _records = [
            AttendanceRecordModel(id: 1, date: "30/08/2026", checkIn: "08:24", checkOut: "--:--", status: "on_time", totalHours: 8.0, deviceName: "Mobile Geofence"),
            AttendanceRecordModel(id: 2, date: "29/08/2026", checkIn: "08:15", checkOut: "17:35", status: "on_time", totalHours: 8.5, deviceName: "Main Turnstile Barrier"),
            AttendanceRecordModel(id: 3, date: "28/08/2026", checkIn: "08:45", checkOut: "17:30", status: "late", totalHours: 7.75, deviceName: "Mobile Geofence"),
            AttendanceRecordModel(id: 4, date: "27/08/2026", checkIn: "08:20", checkOut: "17:40", status: "on_time", totalHours: 8.3, deviceName: "Main Turnstile Barrier"),
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
        title: const Text("Lịch Sử Bảng Công"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadHistory,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadHistory,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _records.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = _records[index];
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.access_time_filled_rounded, color: AppColors.primaryLight),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.date,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Vào: ${item.checkIn ?? '--:--'}  •  Ra: ${item.checkOut ?? '--:--'}",
                                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                              ),
                              if (item.deviceName != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  "Thiết bị: ${item.deviceName}",
                                  style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11),
                                ),
                              ],
                            ],
                          ),
                        ),
                        StatusBadge(status: item.status),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
