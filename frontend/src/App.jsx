import React, { useState, useEffect, useCallback } from 'react';
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
import Login from './components/Login';
import api from './services/api';
import { useI18n } from './i18n/I18nContext';
import { useAuth } from './context/AuthContext';

function App() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState(NAV_TABS.DASHBOARD);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(null); // null = checking, true = online, false = offline
  const [apiError, setApiError] = useState('');
  const [cameraStatus, setCameraStatus] = useState(null);

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
      case NAV_TABS.HELPDESK:
        return {
          title: t('header_helpdesk_title') || 'Cổng Dịch Vụ Helpdesk & Service Desk Chuẩn ITIL',
          subtitle: t('header_helpdesk_sub') || 'Quản lý yêu cầu hỗ trợ (Incident / Service Request), theo dõi SLA tự động và tra cứu cơ sở tri thức KB',
        };
      case NAV_TABS.HEALTH:
        return {
          title: t('header_health_title') || 'Kiểm Tra Tình Trạng API & Hệ Thống',
          subtitle: t('header_health_sub') || 'Giám sát trực tiếp trạng thái, độ trễ và Swagger Docs của các Microservices',
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
    <div className="flex bg-[#0B0F19] text-slate-100 min-h-screen">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isWsConnected={isWsConnected}
        isApiConnected={isApiConnected}
        cameraStatus={cameraStatus}
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
        />

        <main className="flex-1 p-8 pb-16 overflow-y-auto max-w-7xl w-full mx-auto">
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

          {currentTab === NAV_TABS.HELPDESK && <HelpdeskManager />}

          {(currentTab === NAV_TABS.HR_HUB || currentTab === 'EMPLOYEES' || currentTab === 'CORE_USER') && (
            <UnifiedHRHub />
          )}

          {currentTab === NAV_TABS.REQUESTS && <RequestManagement />}

          {currentTab === NAV_TABS.ATTENDANCE && <AttendanceHistory />}

          {currentTab === NAV_TABS.DEVICES && <DeviceManagement />}

          {currentTab === NAV_TABS.ANALYTICS && <AnalyticsDashboard />}

          {currentTab === NAV_TABS.HEALTH && <SystemHealth />}
        </main>
      </div>
    </div>
  );
}

export default App;
