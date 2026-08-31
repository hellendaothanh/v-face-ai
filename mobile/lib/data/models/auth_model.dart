class UserModel {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String? userCode;
  final String? phone;
  final String? avatarUrl;
  final String? role;
  final String? departmentName;
  final String? positionName;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    this.userCode,
    this.phone,
    this.avatarUrl,
    this.role,
    this.departmentName,
    this.positionName,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] is Map ? json['profile'] as Map : null;
    
    // Extract full name
    String fullName = '';
    if (profile != null && profile['full_name'] != null && profile['full_name'].toString().isNotEmpty) {
      fullName = profile['full_name'].toString();
    } else if (json['full_name'] != null) {
      fullName = json['full_name'].toString();
    } else {
      fullName = json['username']?.toString() ?? '';
    }

    // Extract role
    String roleStr = 'employee';
    if (json['roles'] is List && (json['roles'] as List).isNotEmpty) {
      roleStr = (json['roles'] as List).first.toString();
    } else if (json['role'] != null) {
      roleStr = json['role'] is Map ? (json['role']['code'] ?? json['role']['name'] ?? 'employee') : json['role'].toString();
    }

    // Extract department
    String? deptStr;
    if (json['department'] != null) {
      deptStr = json['department'] is Map ? json['department']['name'] : json['department'].toString();
    } else if (json['department_name'] != null) {
      deptStr = json['department_name'].toString();
    }

    // Extract position
    String? posStr;
    if (json['position'] != null) {
      posStr = json['position'] is Map ? (json['position']['title'] ?? json['position']['name']) : json['position'].toString();
    } else if (json['position_name'] != null) {
      posStr = json['position_name'].toString();
    }

    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: fullName,
      userCode: json['user_code']?.toString(),
      phone: profile?['phone_number']?.toString() ?? json['phone']?.toString(),
      avatarUrl: profile?['avatar_url']?.toString() ?? json['avatar_url']?.toString(),
      role: roleStr,
      departmentName: deptStr,
      positionName: posStr,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'username': username,
    'email': email,
    'full_name': fullName,
    'user_code': userCode,
    'phone': phone,
    'avatar_url': avatarUrl,
    'role': role,
    'department_name': departmentName,
    'position_name': positionName,
  };
}

class AuthTokenModel {
  final String accessToken;
  final String? refreshToken;
  final String tokenType;

  AuthTokenModel({
    required this.accessToken,
    this.refreshToken,
    this.tokenType = 'bearer',
  });

  factory AuthTokenModel.fromJson(Map<String, dynamic> json) {
    return AuthTokenModel(
      accessToken: json['access_token'] ?? '',
      refreshToken: json['refresh_token'],
      tokenType: json['token_type'] ?? 'bearer',
    );
  }
}
