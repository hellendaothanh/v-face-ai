import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/attendance_model.dart';

class AttendanceRepository {
  final Dio _dio = ApiClient().dio;

  Future<CheckInResultModel> mobileCheckIn({
    required Uint8List imageBytes,
    required double latitude,
    required double longitude,
    String? wifiBssid,
    String? deviceId,
  }) async {
    final base64Image = base64Encode(imageBytes);
    final response = await _dio.post(
      ApiEndpoints.mobileCheckIn,
      data: {
        'image_base64': base64Image,
        'latitude': latitude,
        'longitude': longitude,
        'wifi_bssid': wifiBssid,
        'device_id': deviceId,
      },
    );

    return CheckInResultModel.fromJson(response.data);
  }

  Future<List<AttendanceRecordModel>> getHistory({int limit = 30}) async {
    final response = await _dio.get(
      ApiEndpoints.attendanceHistory,
      queryParameters: {'page_size': limit},
    );

    final rawData = response.data;
    List list = [];
    if (rawData is Map) {
      if (rawData['data'] is Map && rawData['data']['items'] is List) {
        list = rawData['data']['items'];
      } else if (rawData['data'] is List) {
        list = rawData['data'];
      } else if (rawData['items'] is List) {
        list = rawData['items'];
      }
    } else if (rawData is List) {
      list = rawData;
    }

    return list.map((item) => AttendanceRecordModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<bool> registerFaceAngles({
    required dynamic employeeId,
    required List<Uint8List> angleImages, // 5 photos
  }) async {
    final imagesBase64 = angleImages.map((b) => base64Encode(b)).toList();
    final response = await _dio.post(
      "${ApiEndpoints.registerFace}/$employeeId/register-face",
      data: {'images': imagesBase64},
    );
    return response.statusCode == 200;
  }

  Future<Map<String, dynamic>> verifyLiveFace({
    required dynamic employeeId,
    required Uint8List imageBytes,
  }) async {
    final base64Image = base64Encode(imageBytes);
    final response = await _dio.post(
      "${ApiEndpoints.verifyFace}/$employeeId/verify-face",
      data: {'image_base64': base64Image},
    );
    return response.data;
  }
}
