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
  BarChart3,
  LogOut,
  LifeBuoy,
  BookOpen,
  Headphones
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

export const NAV_TABS = {
  DASHBOARD: 'DASHBOARD',
  HR_HUB: 'HR_HUB',
  EMPLOYEES: 'HR_HUB',
  CORE_USER: 'HR_HUB',
  HELPDESK: 'HELPDESK',
  REQUESTS: 'REQUESTS',
  ATTENDANCE: 'ATTENDANCE',
  DEVICES: 'DEVICES',
  ANALYTICS: 'ANALYTICS',
  HEALTH: 'HEALTH',
};

const Sidebar = ({ currentTab, setCurrentTab, isWsConnected, isApiConnected, cameraStatus }) => {
  const { t } = useI18n();
  const { currentUser, logout, isSuperAdmin, isAdmin, isHR, isManager, isITSupport, hasPermission } = useAuth();

  const allMenuItems = [
    {
      id: NAV_TABS.DASHBOARD,
      label: t('nav_dashboard'),
      subLabel: t('nav_dashboard_sub'),
      icon: Activity,
      badge: isWsConnected ? 'LIVE' : 'OFFLINE',
      badgeColor: isWsConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      allowed: true,
    },
    {
      id: NAV_TABS.HR_HUB,
      label: t('nav_hr_hub', 'Quản Trị Nhân Sự & Sinh Trắc'),
      subLabel: t('nav_hr_hub_sub', 'Hồ sơ, Face AI 512D & IAM'),
      icon: Users,
      badge: 'HR & IAM',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      allowed: isHR || isAdmin || hasPermission(['user:read', 'user:create', 'rbac:manage', 'org:manage']),
    },
    {
      id: NAV_TABS.HELPDESK,
      label: t('nav_helpdesk') || 'Helpdesk & Service Desk',
      subLabel: t('nav_helpdesk_sub') || 'ITIL Tickets & Knowledge Base',
      icon: LifeBuoy,
      badge: 'ITIL',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      allowed: true,
    },
    {
      id: NAV_TABS.REQUESTS,
      label: t('nav_requests'),
      subLabel: t('nav_requests_sub'),
      icon: FileCheck,
      allowed: true,
    },
    {
      id: NAV_TABS.ATTENDANCE,
      label: t('nav_attendance'),
      subLabel: t('nav_attendance_sub'),
      icon: Clock,
      allowed: true,
    },
    {
      id: NAV_TABS.DEVICES,
      label: t('nav_devices'),
      subLabel: t('nav_devices_sub'),
      icon: Video,
      badge: 'CCTV',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      allowed: isAdmin || isITSupport || isManager || hasPermission(['camera:manage']),
    },
    {
      id: NAV_TABS.ANALYTICS,
      label: t('nav_analytics'),
      subLabel: t('nav_analytics_sub'),
      icon: TrendingUp,
      badge: 'BI',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      allowed: isAdmin || isHR || isManager || hasPermission(['hrm:manage', 'attendance:manage']),
    },
    {
      id: NAV_TABS.HEALTH,
      label: t('nav_health'),
      subLabel: t('nav_health_sub'),
      icon: Server,
      badge: 'API',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      allowed: isAdmin || isSuperAdmin,
    },
  ];

  const menuItems = allMenuItems.filter((item) => item.allowed);

  const defaultCamName = cameraStatus?.camera?.source_type === 'RTSP' ? 'Tapo C200' : t('switch_to_webcam');
  const sourceName = cameraStatus?.camera?.device_id || defaultCamName;
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
                <span className="font-bold text-lg text-white tracking-wide">{t('brand_title')}</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{t('brand_badge')}</span>
              </div>
              <p className="text-xs text-slate-400">{t('brand_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('nav_menu')}
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
            <span>{t('stream_status')}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate max-w-[100px]">
            {sourceName}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {/* 1. API Backend Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('api_backend')}:</span>
            </span>
            <span className={`flex items-center space-x-1.5 font-semibold ${
              isApiConnected === true ? 'text-emerald-400' : isApiConnected === false ? 'text-rose-400' : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isApiConnected === true ? 'bg-emerald-400' : isApiConnected === false ? 'bg-rose-400 animate-ping' : 'bg-slate-400'
              }`} />
              <span>{isApiConnected === true ? `${t('online')} (8000)` : isApiConnected === false ? t('disconnected') : t('connecting')}</span>
            </span>
          </div>

          {/* 2. WebSocket Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('websocket_live')}:</span>
            </span>
            <span className={`flex items-center space-x-1.5 font-semibold ${isWsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{isWsConnected ? t('connected') : t('disconnected')}</span>
            </span>
          </div>

          {/* 3. Camera Connection */}
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('camera_source')}:</span>
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
                  ? `${t('camera_running')} (${cameraStatus?.camera?.fps || 0} FPS)`
                  : t('no_signal')
                : t('camera_stopped')}
            </span>
          </div>
        </div>

        {/* User Account & Logout in Sidebar */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow-md shadow-indigo-600/30">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="truncate text-left">
              <div className="font-bold text-white text-xs truncate">{currentUser?.full_name || currentUser?.username || 'Super Admin'}</div>
              <div className="text-[10px] text-indigo-400 font-mono">
                {typeof (currentUser?.roles || [])[0] === 'string'
                  ? (currentUser?.roles || [])[0]
                  : ((currentUser?.roles || [])[0]?.display_name || (currentUser?.roles || [])[0]?.name || 'superadmin')}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 transition-all flex-shrink-0 shadow-sm text-[11px] font-semibold"
            title={t('logout') || 'Đăng xuất'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('logout') || 'Thoát'}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI ArcFace Core</span>
          </span>
          <span>v1.4.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
