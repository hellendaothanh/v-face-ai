import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'home/home_dashboard_screen.dart';
import 'attendance/attendance_history_screen.dart';
import 'requests/request_list_screen.dart';
import 'helpdesk/ticket_list_screen.dart';
import 'profile/profile_screen.dart';
import 'attendance/mobile_checkin_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeDashboardScreen(),
    AttendanceHistoryScreen(),
    RequestListScreen(),
    TicketListScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const MobileCheckInScreen()),
          );
        },
        backgroundColor: AppColors.primary,
        elevation: 4,
        shape: const CircleBorder(),
        child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 28),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        backgroundColor: AppColors.surfaceDark,
        indicatorColor: AppColors.primaryLight.withOpacity(0.25),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.home, color: AppColors.accentNeon),
            label: "Trang chủ",
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.calendar_month, color: AppColors.accentNeon),
            label: "Bảng công",
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.description, color: AppColors.accentNeon),
            label: "Đơn từ",
          ),
          NavigationDestination(
            icon: Icon(Icons.headset_mic_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.headset_mic, color: AppColors.accentNeon),
            label: "Hỗ trợ",
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline, color: Colors.white70),
            selectedIcon: Icon(Icons.person, color: AppColors.accentNeon),
            label: "Cá nhân",
          ),
        ],
      ),
    );
  }
}
