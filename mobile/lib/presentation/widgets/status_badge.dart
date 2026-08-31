import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/localization/app_localizations.dart';

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

    final normStatus = status.toLowerCase().replaceAll(' ', '_');

    switch (normStatus) {
      case 'approved':
      case 'resolved':
      case 'closed':
      case 'paid':
        color = AppColors.success;
        text = label ?? (normStatus == 'paid' ? (context.l10n.isVietnamese ? 'Đã thanh toán' : 'Paid') : (normStatus == 'resolved' ? (context.l10n.isVietnamese ? 'Đã xử lý' : 'Resolved') : context.tr('status_approved')));
        break;
      case 'on_time':
      case 'auto':
      case 'check_in':
        color = AppColors.success;
        text = label ?? context.tr('status_on_time');
        break;
      case 'pending':
      case 'open':
      case 'in_progress':
      case 'waiting_user':
      case 'draft':
        color = AppColors.warning;
        text = label ?? (normStatus == 'pending' ? context.tr('status_pending') : (normStatus == 'in_progress' ? (context.l10n.isVietnamese ? 'Đang xử lý' : 'In Progress') : (normStatus == 'open' ? (context.l10n.isVietnamese ? 'Mới tiếp nhận' : 'Open') : (context.l10n.isVietnamese ? 'Bản nháp' : 'Draft'))));
        break;
      case 'late':
        color = AppColors.error;
        text = label ?? context.tr('status_late');
        break;
      case 'rejected':
        color = AppColors.error;
        text = label ?? context.tr('status_rejected');
        break;
      case 'absent':
        color = AppColors.error;
        text = label ?? context.tr('status_absent');
        break;
      case 'early_leave':
        color = AppColors.error;
        text = label ?? (context.l10n.isVietnamese ? 'Về sớm' : 'Early Leave');
        break;
      default:
        color = AppColors.info;
        text = label ?? status.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
