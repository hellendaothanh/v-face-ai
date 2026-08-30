import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar, { NAV_TABS } from './components/Sidebar';
import Header from './components/Header';
import RealtimeDashboard from './components/RealtimeDashboard';
import UnifiedHRHub from './components/UnifiedHRHub';
import AttendanceHistory from './components/AttendanceHistory';
import RequestManagement from './components/RequestManagement';
import DeviceManagement from './components/DeviceManagement';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SystemHealth from './components/SystemHealth';
import HelpdeskManager from './components/HelpdeskManager';
import UserProfileManager from './components/UserProfileManager';
import ShiftAndPayrollManager from './components/ShiftAndPayrollManager';
import ScrollToTop from './components/ScrollToTop';
import Login from './components/Login';
import api from './services/api';
import { useI18n } from './i18n/I18nContext';
import { useAuth } from './context/AuthContext';

function App() {
  const { t } = useI18n();
  const { 
    isAuthenticated, 
    isLoading, 
    isSuperAdmin, 
    isAdmin, 
    isHR, 
    isManager, 
    isITSupport, 
    hasPermission 
  } = useAuth();
  const [currentTab, setCurrentTab] = useState(NAV_TABS.DASHBOARD);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(null); // null = checking, true = online, false = offline
  const [apiError, setApiError] = useState('');
  const [cameraStatus, setCameraStatus] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('vface_sidebar_collapsed') === 'true';
  });
  const mainContentRef = useRef(null);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('vface_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Fetch camera diagnostics and check backend API health
  const fetchCameraStatus = useCallback(async () => {
    try {
      const res = await api.getCameraStatus();
      if (res && res.success !== false) {
        setIsApiConnected(true);
        setApiError('');
        setCameraStatus(res.data);
      }
    } catch (err) {
      console.warn('Could not connect to backend API:', err.message);
      setIsApiConnected(false);
      setApiError(err.message || 'Cannot connect to Backend API');
    }
  }, []);

  useEffect(() => {
    fetchCameraStatus();
    const interval = setInterval(fetchCameraStatus, 3000); // Polling every 3s for API and Camera health
    return () => clearInterval(interval);
  }, [fetchCameraStatus]);

  const getHeaderInfo = () => {
    switch (currentTab) {
      case NAV_TABS.DASHBOARD:
        return {
          title: t('header_dashboard_title'),
          subtitle: t('header_dashboard_sub'),
        };
      case NAV_TABS.MY_ACCOUNT:
        return {
          title: t('header_my_account_title') || 'Tài Khoản & Hồ Sơ Cá Nhân',
          subtitle: t('header_my_account_sub') || 'Quản lý thông tin định danh doanh nghiệp và đổi mật khẩu bảo mật',
        };
      case NAV_TABS.HR_HUB:
      case 'EMPLOYEES':
      case 'CORE_USER':
        return {
          title: t('header_hr_hub_title', 'Trung Tâm Quản Trị Nhân Sự & Sinh Trắc Học'),
          subtitle: t('header_hr_hub_sub', 'Quản lý tập trung hồ sơ nhân viên, trích xuất vector khuôn mặt 512D và danh tính bảo mật IAM'),
        };
      case NAV_TABS.REQUESTS:
        return {
          title: t('header_requests_title'),
          subtitle: t('header_requests_sub'),
        };
      case NAV_TABS.ATTENDANCE:
        return {
          title: t('header_attendance_title'),
          subtitle: t('header_attendance_sub'),
        };
      case NAV_TABS.DEVICES:
        return {
          title: t('header_devices_title'),
          subtitle: t('header_devices_sub'),
        };
      case NAV_TABS.ANALYTICS:
        return {
          title: t('header_analytics_title'),
          subtitle: t('header_analytics_sub'),
        };
      case NAV_TABS.SHIFTS_PAYROLL:
        return {
          title: t('header_shifts_payroll_title'),
          subtitle: t('header_shifts_payroll_sub'),
        };
      case NAV_TABS.HELPDESK:
        return {
          title: t('header_helpdesk_title'),
          subtitle: t('header_helpdesk_sub'),
        };
      case NAV_TABS.HEALTH:
        return {
          title: t('header_health_title'),
          subtitle: t('header_health_sub'),
        };
      default:
        return { title: 'V-Face System', subtitle: 'AI Attendance & HRM System' };
    }
  };

  const headerInfo = getHeaderInfo();

  // 1. Loading State while checking JWT Token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-spin">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
        <p className="text-xs font-mono text-slate-400 mt-4 tracking-wider uppercase animate-pulse">
          Verifying IAM Credentials...
        </p>
      </div>
    );
  }

  // 2. Auth Guard: If not authenticated, render Login screen
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex bg-[#0B0F19] text-slate-100 min-h-screen relative overflow-x-hidden">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isWsConnected={isWsConnected}
        isApiConnected={isApiConnected}
        cameraStatus={cameraStatus}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          isApiConnected={isApiConnected}
          isWsConnected={isWsConnected}
          cameraStatus={cameraStatus}
          onRefreshCamera={fetchCameraStatus}
          showCameraControls={currentTab === NAV_TABS.DASHBOARD}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleCollapse}
        />

        <main ref={mainContentRef} className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-16 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentTab === NAV_TABS.DASHBOARD && (
            <RealtimeDashboard
              isWsConnected={isWsConnected}
              setIsWsConnected={setIsWsConnected}
              isApiConnected={isApiConnected}
              apiError={apiError}
              cameraStatus={cameraStatus}
              onRefreshCamera={fetchCameraStatus}
              onNavigateToEmployees={() => setCurrentTab(NAV_TABS.HR_HUB)}
            />
          )}

          {currentTab === NAV_TABS.MY_ACCOUNT && <UserProfileManager />}

          {currentTab === NAV_TABS.HELPDESK && <HelpdeskManager />}

          {currentTab === NAV_TABS.SHIFTS_PAYROLL && <ShiftAndPayrollManager />}

          {(currentTab === NAV_TABS.HR_HUB || currentTab === 'EMPLOYEES' || currentTab === 'CORE_USER') && (
            (isHR || isAdmin || hasPermission(['user:read', 'user:create', 'rbac:manage', 'org:manage'])) ? (
              <UnifiedHRHub />
            ) : (
              <AccessDeniedScreen onGoHome={() => setCurrentTab(NAV_TABS.DASHBOARD)} t={t} />
            )
          )}

          {currentTab === NAV_TABS.REQUESTS && <RequestManagement />}

          {currentTab === NAV_TABS.ATTENDANCE && <AttendanceHistory />}

          {currentTab === NAV_TABS.DEVICES && (
            (isAdmin || isITSupport || isManager || hasPermission(['camera:manage'])) ? (
              <DeviceManagement />
            ) : (
              <AccessDeniedScreen onGoHome={() => setCurrentTab(NAV_TABS.DASHBOARD)} t={t} />
            )
          )}

          {currentTab === NAV_TABS.ANALYTICS && (
            (isAdmin || isHR || isManager || hasPermission(['hrm:manage', 'attendance:manage'])) ? (
              <AnalyticsDashboard />
            ) : (
              <AccessDeniedScreen onGoHome={() => setCurrentTab(NAV_TABS.DASHBOARD)} t={t} />
            )
          )}

          {currentTab === NAV_TABS.HEALTH && (
            (isAdmin || isSuperAdmin) ? (
              <SystemHealth />
            ) : (
              <AccessDeniedScreen onGoHome={() => setCurrentTab(NAV_TABS.DASHBOARD)} t={t} />
            )
          )}
        </main>
      </div>

      {/* Floating Back to Top Action Button */}
      <ScrollToTop targetRef={mainContentRef} />
    </div>
  );
}

const AccessDeniedScreen = ({ onGoHome, t }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 glass-panel rounded-3xl border border-rose-500/20 max-w-lg mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-300">
    <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/20">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-bold text-white tracking-wide">
        {t('access_denied_title') || '403 • Truy Cập Bị Giới Hạn'}
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
        {t('access_denied_desc') || 'Tài khoản của bạn không có đủ quyền hạn để truy cập phân hệ này. Vui lòng liên hệ Quản trị viên hệ thống (Admin) để được phân quyền.'}
      </p>
    </div>
    <button
      onClick={onGoHome}
      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
    >
      {t('btn_back_to_dashboard') || 'Quay về Bàn làm việc (Dashboard)'}
    </button>
  </div>
);

export default App;
