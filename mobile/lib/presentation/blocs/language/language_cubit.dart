import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageCubit extends Cubit<Locale> {
  static const String _prefKey = 'app_language_code';

  LanguageCubit() : super(const Locale('vi', 'VN')) {
    _loadSavedLanguage();
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_prefKey);
      if (code == 'en') {
        emit(const Locale('en', 'US'));
      } else {
        emit(const Locale('vi', 'VN'));
      }
    } catch (_) {}
  }

  Future<void> setLanguage(String languageCode) async {
    final newLocale = languageCode == 'en' ? const Locale('en', 'US') : const Locale('vi', 'VN');
    emit(newLocale);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, languageCode);
    } catch (_) {}
  }

  bool get isVietnamese => state.languageCode == 'vi';
}
