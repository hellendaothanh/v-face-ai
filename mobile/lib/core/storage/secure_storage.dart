import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const String _keyAccessToken = "vface_access_token";
  static const String _keyRefreshToken = "vface_refresh_token";
  static const String _keyUserCode = "vface_user_code";
  static const String _keyUserId = "vface_user_id";
  static const String _keyBiometricEnabled = "vface_biometric_enabled";

  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    }
  }

  Future<String?> getAccessToken() async => await _storage.read(key: _keyAccessToken);
  Future<String?> getRefreshToken() async => await _storage.read(key: _keyRefreshToken);

  Future<void> saveUserInfo({required String userId, required String userCode}) async {
    await _storage.write(key: _keyUserId, value: userId);
    await _storage.write(key: _keyUserCode, value: userCode);
  }

  Future<String?> getUserId() async => await _storage.read(key: _keyUserId);
  Future<String?> getUserCode() async => await _storage.read(key: _keyUserCode);

  Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _keyBiometricEnabled, value: enabled ? "1" : "0");
  }

  Future<bool> isBiometricEnabled() async {
    final val = await _storage.read(key: _keyBiometricEnabled);
    return val == "1";
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
