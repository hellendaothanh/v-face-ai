import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

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

class _BiometricHudOverlayState extends State<BiometricHudOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Darkened surrounding mask
        ColorFiltered(
          colorFilter: ColorFilter.mode(
            Colors.black.withOpacity(0.65),
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
                  width: 270,
                  height: 350,
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(160),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Glowing Oval Border
        Align(
          alignment: const Alignment(0, -0.2),
          child: AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              return Container(
                width: 270,
                height: 350,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(160),
                  border: Border.all(
                    color: widget.isScanning
                        ? AppColors.accentNeon
                        : AppColors.primaryLight,
                    width: 3.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (widget.isScanning
                              ? AppColors.accentNeon
                              : AppColors.primary)
                          .withOpacity(0.3 + 0.3 * _animController.value),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        // Scanner horizontal line moving up and down when scanning
        if (widget.isScanning)
          Align(
            alignment: const Alignment(0, -0.2),
            child: SizedBox(
              width: 250,
              height: 330,
              child: AnimatedBuilder(
                animation: _animController,
                builder: (context, child) {
                  return Align(
                    alignment: Alignment(0, -1.0 + (2.0 * _animController.value)),
                    child: Container(
                      height: 2,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.accentNeon,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accentNeon.withOpacity(0.8),
                            blurRadius: 10,
                            spreadRadius: 3,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

        // Instruction Text Banner at bottom
        Align(
          alignment: const Alignment(0, 0.65),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            margin: const EdgeInsets.symmetric(horizontal: 32),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.75),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white24),
            ),
            child: Text(
              widget.instruction,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
