import 'package:flutter/material.dart';

class AppColors {
  // Primary & Secondary Brand Colors
  static const Color primary = Color(0xFF4F46E5); // Indigo 600
  static const Color primaryLight = Color(0xFF6366F1); // Indigo 500
  static const Color primaryDark = Color(0xFF3730A3); // Indigo 800
  static const Color accent = Color(0xFF06B6D4); // Cyan 500
  static const Color accentNeon = Color(0xFF22D3EE); // Cyan 400

  // Neutral Colors (Dark Mode & Light Mode)
  static const Color bgDark = Color(0xFF0F172A); // Slate 900
  static const Color surfaceDark = Color(0xFF1E293B); // Slate 800
  static const Color cardDark = Color(0xFF334155); // Slate 700
  
  static const Color bgLight = Color(0xFFF8FAFC); // Slate 50
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color textMainLight = Color(0xFF0F172A);
  static const Color textMutedLight = Color(0xFF64748B);

  // Status & Feedback Colors
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color error = Color(0xFFEF4444); // Red 500
  static const Color info = Color(0xFF3B82F6); // Blue 500

  // Gradient definitions
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF059669), Color(0xFF10B981)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
