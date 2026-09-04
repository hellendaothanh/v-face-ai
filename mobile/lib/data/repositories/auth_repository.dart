import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';
import '../models/auth_model.dart';

class AuthRepository {
  final Dio _dio = ApiClient().dio;
  final SecureStorageService _storage = SecureStorageService();

  Future<UserModel> login({required String username, required String password}) async {
    final response = await _dio.post(
      ApiEndpoints.login,
      data: {'username': username, 'password': password},
    );

    final tokenData = AuthTokenModel.fromJson(response.data);
    await _storage.saveTokens(
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
    );

    return await getCurrentUser();
  }

  Future<UserModel> faceLogin({required Uint8List imageBytes}) async {
    final formData = FormData.fromMap({
      'image': MultipartFile.fromBytes(
        imageBytes,
        filename: 'face_login.jpg',
      ),
    });
    final response = await _dio.post(
      ApiEndpoints.faceLogin,
      data: formData,
    );

    final resData = response.data;
    final dynamic tokensMap = (resData is Map && resData.containsKey('data') && resData['data'] is Map)
        ? (resData['data']['tokens'] ?? resData['data'])
        : resData;
    final tokenData = AuthTokenModel.fromJson(tokensMap);
    await _storage.saveTokens(
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
    );

    return await getCurrentUser();
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get(ApiEndpoints.me);
    final user = UserModel.fromJson(response.data);
    await _storage.saveUserInfo(
      userId: user.id.toString(),
      userCode: user.userCode ?? '',
    );
    return user;
  }

  Future<void> changePassword({required String oldPassword, required String newPassword}) async {
    await _dio.post(
      ApiEndpoints.changePassword,
      data: {
        'old_password': oldPassword,
        'new_password': newPassword,
      },
    );
  }

  Future<void> logout() async {
    await _storage.clearAll();
  }
}
