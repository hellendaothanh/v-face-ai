import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:geolocator/geolocator.dart';
import 'package:network_info_plus/network_info_plus.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../widgets/biometric_hud_overlay.dart';

class MobileCheckInScreen extends StatefulWidget {
  const MobileCheckInScreen({super.key});

  @override
  State<MobileCheckInScreen> createState() => _MobileCheckInScreenState();
}

class _MobileCheckInScreenState extends State<MobileCheckInScreen> {
  final AttendanceRepository _repository = AttendanceRepository();
  CameraController? _cameraController;
  bool _isCameraReady = false;
  bool _isProcessing = false;
  String? _customHudInstruction;

  Position? _currentPosition;
  String? _currentBssid;

  @override
  void initState() {
    super.initState();
    _initDeviceSensors();
  }

  Future<void> _initDeviceSensors() async {
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

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        _currentPosition = await Geolocator.getCurrentPosition();
      }

      final info = NetworkInfo();
      _currentBssid = await info.getWifiBSSID();
    } catch (_) {}
  }

  Future<void> _performCheckIn() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized || _isProcessing) {
      return;
    }

    setState(() {
      _isProcessing = true;
      _customHudInstruction = context.tr('hud_processing');
    });

    try {
      final picture = await _cameraController!.takePicture();
      final bytes = await picture.readAsBytes();

      final lat = _currentPosition?.latitude ?? 21.028511;
      final lng = _currentPosition?.longitude ?? 105.854444;

      final result = await _repository.mobileCheckIn(
        imageBytes: bytes,
        latitude: lat,
        longitude: lng,
        wifiBssid: _currentBssid,
        deviceId: "MOBILE_APP_DEVICE",
      );

      if (!mounted) return;

      _showResultDialog(
        success: result.success,
        title: result.success ? context.tr('checkin_success_title') : context.tr('checkin_fail_title'),
        message: result.message,
        time: result.checkInTime ?? context.tr('checkin_now'),
        distance: result.distanceMeters,
      );
    } catch (e) {
      if (mounted) {
        _showResultDialog(
          success: false,
          title: context.tr('error'),
          message: context.tr('connection_error_desc'),
          time: "--:--",
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _customHudInstruction = null;
        });
      }
    }
  }

  void _showResultDialog({
    required bool success,
    required String title,
    required String message,
    required String time,
    double? distance,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: (success ? AppColors.success : AppColors.error).withOpacity(0.15),
              ),
              child: Icon(
                success ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                color: success ? AppColors.success : AppColors.error,
                size: 36,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text(context.tr('time_in'), style: const TextStyle(color: Colors.white54, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(time, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  if (distance != null)
                    Column(
                      children: [
                        Text(context.tr('gps_distance'), style: const TextStyle(color: Colors.white54, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text("${distance.toStringAsFixed(1)}m", style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold)),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                if (success) Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: success ? AppColors.primary : AppColors.surfaceDark,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(context.tr('confirm'), style: const TextStyle(color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(context.tr('checkin_screen_title'), style: const TextStyle(color: Colors.white)),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_isCameraReady && _cameraController != null)
            CameraPreview(_cameraController!)
          else
            const Center(child: CircularProgressIndicator(color: AppColors.primaryLight)),

          BiometricHudOverlay(
            instruction: _customHudInstruction ?? context.tr('hud_align_face'),
            isScanning: _isProcessing,
          ),

          // Capture Button
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: _isProcessing ? null : _performCheckIn,
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    color: _isProcessing ? Colors.grey : AppColors.primary,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.5),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    _isProcessing ? Icons.hourglass_top_rounded : Icons.camera_alt_rounded,
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
