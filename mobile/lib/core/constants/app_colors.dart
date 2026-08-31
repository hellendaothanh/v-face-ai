import 'package:flutter/material.dart';

class AppColors {
  // Premium Enterprise Brand Colors (Deep Navy / Royal Cobalt)
  static const Color primary = Color(0xFF2563EB); // Royal Cobalt Blue 600
  static const Color primaryLight = Color(0xFF3B82F6); // Blue 500
  static const Color primaryDark = Color(0xFF1D4ED8); // Blue 700
  static const Color accent = Color(0xFF0EA5E9); // Sky Blue 500
  static const Color accentNeon = Color(0xFF38BDF8); // Sky Blue 400

  // Neutral Theme Colors (Sophisticated Dark Mode)
  static const Color bgDark = Color(0xFF0B0F19); // Deep Slate 950
  static const Color surfaceDark = Color(0xFF131C2E); // Refined Surface 900
  static const Color cardDark = Color(0xFF1E293B); // Slate 800
  static const Color borderDark = Color(0xFF222F46); // Border slate

  // Light Mode Colors
  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color textMainLight = Color(0xFF0F172A);
  static const Color textMutedLight = Color(0xFF64748B);

  // Status & Feedback Colors
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color error = Color(0xFFEF4444); // Rose 500
  static const Color info = Color(0xFF3B82F6); // Blue 500

  // Gradients (Clean, Modern Enterprise)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF0284C7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF047857), Color(0xFF10B981)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
