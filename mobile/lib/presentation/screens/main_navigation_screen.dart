import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/localization/app_localizations.dart';
import 'home/home_dashboard_screen.dart';
import 'attendance/attendance_history_screen.dart';
import 'requests/request_list_screen.dart';
import 'helpdesk/ticket_list_screen.dart';
import 'profile/profile_screen.dart';

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
      backgroundColor: AppColors.bgDark,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        backgroundColor: AppColors.surfaceDark,
        indicatorColor: AppColors.primary.withValues(alpha: 0.18),
        elevation: 0,
        height: 68,
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined, color: Colors.white60, size: 22),
            selectedIcon: const Icon(Icons.dashboard_rounded, color: AppColors.primaryLight, size: 22),
            label: context.tr('nav_home'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.calendar_today_outlined, color: Colors.white60, size: 20),
            selectedIcon: const Icon(Icons.calendar_today_rounded, color: AppColors.primaryLight, size: 20),
            label: context.tr('nav_attendance'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.assignment_outlined, color: Colors.white60, size: 22),
            selectedIcon: const Icon(Icons.assignment_rounded, color: AppColors.primaryLight, size: 22),
            label: context.tr('nav_requests'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.support_agent_outlined, color: Colors.white60, size: 22),
            selectedIcon: const Icon(Icons.support_agent_rounded, color: AppColors.primaryLight, size: 22),
            label: context.tr('nav_helpdesk'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline_rounded, color: Colors.white60, size: 22),
            selectedIcon: const Icon(Icons.person_rounded, color: AppColors.primaryLight, size: 22),
            label: context.tr('nav_profile'),
          ),
        ],
      ),
    );
  }
}
