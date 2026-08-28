import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { NAV_TABS } from './components/Sidebar';
import Header from './components/Header';
import RealtimeDashboard from './components/RealtimeDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import AttendanceHistory from './components/AttendanceHistory';
import RequestManagement from './components/RequestManagement';
import DeviceManagement from './components/DeviceManagement';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SystemHealth from './components/SystemHealth';
import api from './services/api';
import { useI18n } from './i18n/I18nContext';

function App() {
  const { t } = useI18n();
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
      case NAV_TABS.EMPLOYEES:
        return {
          title: t('header_employees_title'),
          subtitle: t('header_employees_sub'),
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
              onNavigateToEmployees={() => setCurrentTab(NAV_TABS.EMPLOYEES)}
            />
          )}

          {currentTab === NAV_TABS.EMPLOYEES && <EmployeeManagement />}

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
