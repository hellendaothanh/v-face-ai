import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { NAV_TABS } from './components/Sidebar';
import Header from './components/Header';
import RealtimeDashboard from './components/RealtimeDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import AttendanceHistory from './components/AttendanceHistory';
import RequestManagement from './components/RequestManagement';
import DeviceManagement from './components/DeviceManagement';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import api from './services/api';

function App() {
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
      setApiError(err.message || 'Không thể kết nối đến Backend API');
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
          title: 'Dashboard Giám Sát Realtime',
          subtitle: 'Luồng camera kết hợp nhận diện khuôn mặt AI và bắn sự kiện WebSocket trực tiếp',
        };
      case NAV_TABS.EMPLOYEES:
        return {
          title: 'Quản Lý Hồ Sơ Nhân Viên',
          subtitle: 'Thêm mới nhân viên và đăng ký trích xuất vector khuôn mặt 512 chiều vào PostgreSQL pgvector',
        };
      case NAV_TABS.REQUESTS:
        return {
          title: 'Quản Lý Đơn Từ & Xử Lý Ngoại Lệ Chấm Công',
          subtitle: 'Duyệt đơn nghỉ nửa ngày sáng/chiều, đi công tác, giải trình đi trễ về sớm và tự động tính công',
        };
      case NAV_TABS.ATTENDANCE:
        return {
          title: 'Báo Cáo & Lịch Sử Chấm Công',
          subtitle: 'Tra cứu, lọc dữ liệu chấm công chi tiết theo ngày và mã nhân viên',
        };
      case NAV_TABS.DEVICES:
        return {
          title: 'Quản Lý Thiết Bị Camera Tập Trung',
          subtitle: 'Cấu hình đa luồng RTSP / Webcam, bật/tắt thiết bị thời gian thực và phân quyền Cổng Vào/Ra',
        };
      case NAV_TABS.ANALYTICS:
        return {
          title: 'Dashboard Phân Tích & Báo Cáo Chuyên Sâu (HRM BI)',
          subtitle: 'Biểu đồ trực quan xu hướng đúng giờ, mật độ check-in theo khung giờ và thống kê đi muộn theo phòng ban',
        };
      default:
        return { title: 'V-Face System', subtitle: 'Hệ thống Chấm công AI' };
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
        </main>
      </div>
    </div>
  );
}

export default App;
