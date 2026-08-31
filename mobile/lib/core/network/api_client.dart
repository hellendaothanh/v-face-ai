import 'dart:io';
import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';
import '../constants/api_endpoints.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {
          HttpHeaders.acceptHeader: 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService().getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers[HttpHeaders.authorizationHeader] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Xử lý refresh token tự động nếu có
            final refreshToken = await SecureStorageService().getRefreshToken();
            if (refreshToken != null && refreshToken.isNotEmpty) {
              try {
                final refreshDio = Dio();
                final res = await refreshDio.post(
                  ApiEndpoints.refreshToken,
                  data: {'refresh_token': refreshToken},
                );
                if (res.statusCode == 200) {
                  final newAccessToken = res.data['access_token'];
                  final newRefreshToken = res.data['refresh_token'];
                  await SecureStorageService().saveTokens(
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                  );

                  // Thử lại request gốc với token mới
                  error.requestOptions.headers[HttpHeaders.authorizationHeader] = 'Bearer $newAccessToken';
                  final retryResponse = await dio.fetch(error.requestOptions);
                  return handler.resolve(retryResponse);
                }
              } catch (_) {
                await SecureStorageService().clearAll();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
