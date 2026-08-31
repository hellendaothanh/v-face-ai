import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../widgets/biometric_hud_overlay.dart';

class FaceEnrollmentScreen extends StatefulWidget {
  const FaceEnrollmentScreen({super.key});

  @override
  State<FaceEnrollmentScreen> createState() => _FaceEnrollmentScreenState();
}

class _FaceEnrollmentScreenState extends State<FaceEnrollmentScreen> {
  final AttendanceRepository _repo = AttendanceRepository();
  CameraController? _cameraController;
  bool _isCameraReady = false;
  bool _isSaving = false;

  int _currentStep = 0; // 0 to 4
  final List<Uint8List> _capturedAngles = [];

  List<Map<String, dynamic>> _getAngleSteps(BuildContext context) {
    return [
      {"label": context.tr('angle_front'), "instruction": context.tr('angle_front_inst'), "icon": Icons.center_focus_strong_rounded},
      {"label": context.tr('angle_up'), "instruction": context.tr('angle_up_inst'), "icon": Icons.arrow_upward_rounded},
      {"label": context.tr('angle_down'), "instruction": context.tr('angle_down_inst'), "icon": Icons.arrow_downward_rounded},
      {"label": context.tr('angle_left'), "instruction": context.tr('angle_left_inst'), "icon": Icons.arrow_back_rounded},
      {"label": context.tr('angle_right'), "instruction": context.tr('angle_right_inst'), "icon": Icons.arrow_forward_rounded},
    ];
  }

  @override
  void initState() {
    super.initState();
    _initFrontCamera();
  }

  Future<void> _initFrontCamera() async {
    try {
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );
      await _cameraController!.initialize();
      if (mounted) setState(() => _isCameraReady = true);
    } catch (_) {}
  }

  Future<void> _captureCurrentAngle() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized || _isSaving) {
      return;
    }

    try {
      final file = await _cameraController!.takePicture();
      final bytes = await file.readAsBytes();
      _capturedAngles.add(bytes);

      if (_currentStep < 4) {
        setState(() => _currentStep++);
      } else {
        // Đã thu đủ 5 góc -> Gửi lên Backend
        _submitAllAngles();
      }
    } catch (_) {}
  }

  Future<void> _submitAllAngles() async {
    setState(() => _isSaving = true);
    try {
      final userIdStr = await SecureStorageService().getUserId();
      final empId = userIdStr ?? "1";

      final success = await _repo.registerFaceAngles(
        employeeId: empId,
        angleImages: _capturedAngles,
      );

      if (!mounted) return;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surfaceDark,
          title: Text(context.tr('face_enroll_complete'), style: const TextStyle(color: Colors.white)),
          content: Text(
            success
                ? context.tr('face_enroll_success_desc')
                : context.tr('face_enroll_fail_desc'),
            style: TextStyle(color: Colors.white.withOpacity(0.8)),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: Text(context.tr('close'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('server_connect_error'))),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final angleSteps = _getAngleSteps(context);
    final stepInfo = angleSteps[_currentStep];

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          "${context.tr('face_enroll_title')} (${_currentStep + 1}/5)",
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_isCameraReady && _cameraController != null)
            CameraPreview(_cameraController!)
          else
            const Center(child: CircularProgressIndicator(color: AppColors.primaryLight)),

          BiometricHudOverlay(
            instruction: "${stepInfo['label']}\n${stepInfo['instruction']}",
            isScanning: _isSaving,
          ),

          // Steps Progress Dots at Top
          Positioned(
            top: 16,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final isDone = index < _capturedAngles.length;
                final isCurrent = index == _currentStep;
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: isCurrent ? 24 : 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: isDone || isCurrent ? AppColors.primaryLight : Colors.white24,
                    borderRadius: BorderRadius.circular(5),
                  ),
                );
              }),
            ),
          ),

          // Capture Button
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: _isSaving ? null : _captureCurrentAngle,
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    color: AppColors.primary,
                  ),
                  child: Icon(
                    _isSaving ? Icons.hourglass_top : stepInfo['icon'] as IconData,
                    color: Colors.white,
                    size: 36,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
