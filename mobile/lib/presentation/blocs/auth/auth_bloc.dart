import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../data/models/auth_model.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../core/storage/secure_storage.dart';

// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

class CheckAuthSessionEvent extends AuthEvent {}

class LoginWithPasswordEvent extends AuthEvent {
  final String username;
  final String password;
  const LoginWithPasswordEvent({required this.username, required this.password});
  @override
  List<Object?> get props => [username, password];
}

class LoginWithFaceEvent extends AuthEvent {
  final Uint8List imageBytes;
  const LoginWithFaceEvent({required this.imageBytes});
  @override
  List<Object?> get props => [imageBytes];
}

class LogoutEvent extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

class AuthInitialState extends AuthState {}
class AuthLoadingState extends AuthState {}
class AuthenticatedState extends AuthState {
  final UserModel user;
  const AuthenticatedState(this.user);
  @override
  List<Object?> get props => [user];
}
class UnauthenticatedState extends AuthState {}
class AuthErrorState extends AuthState {
  final String errorMessage;
  const AuthErrorState(this.errorMessage);
  @override
  List<Object?> get props => [errorMessage];
}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;
  final SecureStorageService _storage = SecureStorageService();

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitialState()) {
    on<CheckAuthSessionEvent>(_onCheckAuthSession);
    on<LoginWithPasswordEvent>(_onLoginWithPassword);
    on<LoginWithFaceEvent>(_onLoginWithFace);
    on<LogoutEvent>(_onLogout);
  }

  String _extractError(dynamic e, String defaultMsg) {
    if (e is DioException) {
      if (e.response?.data != null) {
        final dynamic data = e.response!.data;
        if (data is Map) {
          if (data['detail'] is String) return data['detail'] as String;
          if (data['detail'] is Map && data['detail']['message'] != null) {
            return data['detail']['message'].toString();
          }
          if (data['message'] is String) return data['message'] as String;
        }
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.sendTimeout) {
        return "Không thể kết nối đến máy chủ. Kiểm tra mạng Wi-Fi hoặc IP máy chủ.";
      }
    }
    return defaultMsg;
  }

  Future<void> _onCheckAuthSession(
      CheckAuthSessionEvent event, Emitter<AuthState> emit) async {
    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(UnauthenticatedState());
      return;
    }

    try {
      final user = await _authRepository.getCurrentUser();
      emit(AuthenticatedState(user));
    } catch (_) {
      emit(UnauthenticatedState());
    }
  }

  Future<void> _onLoginWithPassword(
      LoginWithPasswordEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoadingState());
    try {
      final user = await _authRepository.login(
        username: event.username,
        password: event.password,
      );
      emit(AuthenticatedState(user));
    } catch (e) {
      emit(AuthErrorState(_extractError(e, "Đăng nhập thất bại: Kiểm tra lại tài khoản và mật khẩu.")));
    }
  }

  Future<void> _onLoginWithFace(
      LoginWithFaceEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoadingState());
    try {
      final user = await _authRepository.faceLogin(imageBytes: event.imageBytes);
      emit(AuthenticatedState(user));
    } catch (e) {
      emit(AuthErrorState(_extractError(e, "Xác thực Face ID không khớp hoặc phát hiện giả mạo.")));
    }
  }

  Future<void> _onLogout(LogoutEvent event, Emitter<AuthState> emit) async {
    await _authRepository.logout();
    emit(UnauthenticatedState());
  }
}
