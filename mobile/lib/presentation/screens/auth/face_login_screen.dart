import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:camera/camera.dart';
import '../../../core/constants/app_colors.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../widgets/biometric_hud_overlay.dart';
import '../main_navigation_screen.dart';

class FaceLoginScreen extends StatefulWidget {
  const FaceLoginScreen({super.key});

  @override
  State<FaceLoginScreen> createState() => _FaceLoginScreenState();
}

class _FaceLoginScreenState extends State<FaceLoginScreen> {
  CameraController? _cameraController;
  bool _isCameraReady = false;
  bool _isProcessing = false;
  String _hudInstruction = "Đặt khuôn mặt vào trong khung Oval";

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
      if (mounted) {
        setState(() => _isCameraReady = true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _hudInstruction = "Không thể khởi động camera");
      }
    }
  }

  Future<void> _captureAndLogin() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized || _isProcessing) {
      return;
    }

    setState(() {
      _isProcessing = true;
      _hudInstruction = "Đang nhận diện & kiểm tra liveness...";
    });

    try {
      final xFile = await _cameraController!.takePicture();
      final bytes = await xFile.readAsBytes();

      if (mounted) {
        context.read<AuthBloc>().add(LoginWithFaceEvent(imageBytes: bytes));
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _hudInstruction = "Lỗi khi chụp ảnh, vui lòng thử lại";
      });
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthenticatedState) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
            (route) => false,
          );
        } else if (state is AuthErrorState) {
          setState(() {
            _isProcessing = false;
            _hudInstruction = state.errorMessage;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.errorMessage), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text("1-Chạm Face ID", style: TextStyle(color: Colors.white)),
        ),
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (_isCameraReady && _cameraController != null)
              CameraPreview(_cameraController!)
            else
              const Center(
                child: CircularProgressIndicator(color: AppColors.accentNeon),
              ),

            // Oval HUD Overlay
            BiometricHudOverlay(
              instruction: _hudInstruction,
              isScanning: _isProcessing,
            ),

            // Capture Trigger Button
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: GestureDetector(
                  onTap: _isProcessing ? null : _captureAndLogin,
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      color: _isProcessing ? Colors.grey : AppColors.accentNeon,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.accentNeon.withOpacity(0.4),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      _isProcessing ? Icons.hourglass_top : Icons.camera_alt_rounded,
                      color: AppColors.bgDark,
                      size: 36,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
