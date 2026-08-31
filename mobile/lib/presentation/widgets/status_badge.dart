import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final String? label;

  const StatusBadge({
    super.key,
    required this.status,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    Color color;
    String text;

    switch (status.toLowerCase()) {
      case 'approved':
      case 'resolved':
      case 'closed':
      case 'on_time':
      case 'paid':
        color = AppColors.success;
        text = label ?? (status == 'on_time' ? 'Đúng giờ' : 'Đã duyệt');
        break;
      case 'pending':
      case 'open':
      case 'in progress':
      case 'draft':
        color = AppColors.warning;
        text = label ?? (status == 'pending' ? 'Chờ duyệt' : 'Đang xử lý');
        break;
      case 'rejected':
      case 'late':
      case 'absent':
        color = AppColors.error;
        text = label ?? (status == 'late' ? 'Đi muộn' : (status == 'absent' ? 'Vắng' : 'Từ chối'));
        break;
      default:
        color = AppColors.info;
        text = label ?? status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
