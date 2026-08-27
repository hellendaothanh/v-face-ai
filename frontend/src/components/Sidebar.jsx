import React from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  Camera, 
  ShieldCheck, 
  Sparkles, 
  Radio, 
  Server, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Video,
  BarChart3
} from 'lucide-react';

export const NAV_TABS = {
  DASHBOARD: 'DASHBOARD',
  EMPLOYEES: 'EMPLOYEES',
  REQUESTS: 'REQUESTS',
  ATTENDANCE: 'ATTENDANCE',
  DEVICES: 'DEVICES',
  ANALYTICS: 'ANALYTICS',
};

const Sidebar = ({ currentTab, setCurrentTab, isWsConnected, isApiConnected, cameraStatus }) => {
  const menuItems = [
    {
      id: NAV_TABS.DASHBOARD,
      label: 'Dashboard Realtime',
      subLabel: 'Giám sát trực tiếp & AI HUD',
      icon: Activity,
      badge: isWsConnected ? 'LIVE' : 'OFFLINE',
      badgeColor: isWsConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: NAV_TABS.EMPLOYEES,
      label: 'Quản lý Nhân viên',
      subLabel: 'Hồ sơ & Đăng ký khuôn mặt',
      icon: Users,
    },
    {
      id: NAV_TABS.REQUESTS,
      label: 'Đơn từ & Ngoại lệ',
      subLabel: 'Nghỉ nửa ngày, công tác, trễ/sớm',
      icon: FileCheck,
    },
    {
      id: NAV_TABS.ATTENDANCE,
      label: 'Lịch sử Chấm công',
      subLabel: 'Báo cáo & Bộ lọc dữ liệu',
      icon: Clock,
    },
    {
      id: NAV_TABS.DEVICES,
      label: 'Quản lý Thiết bị',
      subLabel: 'Camera RTSP & Multi-Threading',
      icon: Video,
      badge: 'HRM',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: NAV_TABS.ANALYTICS,
      label: 'Phân tích & Thống kê',
      subLabel: 'Biểu đồ xu hướng & BI Charts',
      icon: TrendingUp,
      badge: 'BI',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  ];

  const sourceName = cameraStatus?.camera?.source_type === 'RTSP' ? 'Tapo C200' : 'MacBook M4';
  const isCamRunning = !!cameraStatus?.is_running;
  const isCamConnected = !!cameraStatus?.camera?.is_connected;

  return (
    <aside className="w-72 bg-[#0E1322] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg text-white tracking-wide">V-FACE</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">HRM Pro</span>
              </div>
              <p className="text-xs text-slate-400">Chấm công & Phân tích AI</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Quản Trị
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">{item.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>{item.subLabel}</div>
                  </div>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 m-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Trạng Thái Hệ Thống</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {sourceName}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {/* 1. API Backend Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>API Backend:</span>
            </span>
            <span className={`flex items-center space-x-1.5 font-semibold ${
              isApiConnected === true ? 'text-emerald-400' : isApiConnected === false ? 'text-rose-400' : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isApiConnected === true ? 'bg-emerald-400' : isApiConnected === false ? 'bg-rose-400 animate-ping' : 'bg-slate-400'
              }`} />
              <span>{isApiConnected === true ? 'Online (8000)' : isApiConnected === false ? 'Mất kết nối' : 'Đang thử...'}</span>
            </span>
          </div>

          {/* 2. WebSocket Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>WebSocket Live:</span>
            </span>
            <span className={`flex items-center space-x-1.5 font-semibold ${isWsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{isWsConnected ? 'Đã kết nối' : 'Mất kết nối'}</span>
            </span>
          </div>

          {/* 3. Camera Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>Luồng Camera:</span>
            </span>
            <span className={`font-semibold ${
              isCamRunning
                ? isCamConnected
                  ? 'text-cyan-400'
                  : 'text-amber-400'
                : 'text-slate-400'
            }`}>
              {isCamRunning
                ? isCamConnected
                  ? `Đang chạy (${cameraStatus?.camera?.fps || 0} FPS)`
                  : 'Mất tín hiệu luồng'
                : 'Đang tắt'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Apple Silicon M4</span>
          </span>
          <span>v1.3.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
