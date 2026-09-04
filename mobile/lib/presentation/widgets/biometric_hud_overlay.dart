import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/localization/app_localizations.dart';

class BiometricHudOverlay extends StatefulWidget {
  final String instruction;
  final bool isScanning;

  const BiometricHudOverlay({
    super.key,
    required this.instruction,
    this.isScanning = false,
  });

  @override
  State<BiometricHudOverlay> createState() => _BiometricHudOverlayState();
}

class _BiometricHudOverlayState extends State<BiometricHudOverlay> {
  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final shortestSide = screenSize.shortestSide;
    final bool isTablet = shortestSide >= 600;

    final double hudWidth = isTablet
        ? (shortestSide * 0.55).clamp(380.0, 520.0)
        : (screenSize.width * 0.72).clamp(260.0, 340.0);
    final double hudHeight = hudWidth * 1.3;
    final double hudRadius = hudWidth / 2;

    return Stack(
      children: [
        // Darkened surrounding mask with dynamic oval cutout
        ColorFiltered(
          colorFilter: ColorFilter.mode(
            Colors.black.withValues(alpha: 0.6),
            BlendMode.srcOut,
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Container(
                decoration: const BoxDecoration(
                  color: Colors.black,
                  backgroundBlendMode: BlendMode.dstOut,
                ),
              ),
              Align(
                alignment: const Alignment(0, -0.2),
                child: Container(
                  width: hudWidth,
                  height: hudHeight,
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(hudRadius),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Clean Professional Oval Guide Border
        Align(
          alignment: const Alignment(0, -0.2),
          child: Container(
            width: hudWidth,
            height: hudHeight,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(hudRadius),
              border: Border.all(
                color: widget.isScanning ? AppColors.success : AppColors.primaryLight,
                width: isTablet ? 3.5 : 2.5,
              ),
            ),
          ),
        ),

        // Top Navigation Bar and Device Header
        Positioned(
          top: 16,
          left: 16,
          right: 16,
          child: SafeArea(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                  onPressed: () => Navigator.pop(context),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black45,
                    padding: const EdgeInsets.all(8),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isTablet ? Icons.tablet_android_rounded : Icons.smartphone_rounded,
                        color: AppColors.primaryLight,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isTablet ? context.tr('tablet_mode') : context.tr('checkin_screen_title'),
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 40),
              ],
            ),
          ),
        ),

        // Bottom Instruction Pill
        Positioned(
          bottom: 120,
          left: 24,
          right: 24,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surfaceDark.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderDark),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    widget.isScanning ? Icons.sync_rounded : Icons.center_focus_strong_rounded,
                    color: widget.isScanning ? AppColors.success : AppColors.primaryLight,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      widget.instruction,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
