import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  Camera, 
  ShieldCheck, 
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
  UserCog, 
  CalendarDays,
  ChevronDown,
  Layers,
  X,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

export const NAV_TABS = {
  DASHBOARD: 'DASHBOARD',
  MY_ACCOUNT: 'MY_ACCOUNT',
  HR_HUB: 'HR_HUB',
  EMPLOYEES: 'HR_HUB',
  CORE_USER: 'HR_HUB',
  SHIFTS_PAYROLL: 'SHIFTS_PAYROLL',
  HELPDESK: 'HELPDESK',
  REQUESTS: 'REQUESTS',
  ATTENDANCE: 'ATTENDANCE',
  DEVICES: 'DEVICES',
  ANALYTICS: 'ANALYTICS',
  HEALTH: 'HEALTH',
};

const MANAGEMENT_TABS = [
  NAV_TABS.HR_HUB,
  NAV_TABS.SHIFTS_PAYROLL,
  NAV_TABS.REQUESTS,
  NAV_TABS.ATTENDANCE,
  NAV_TABS.DEVICES,
  NAV_TABS.ANALYTICS,
];

const Sidebar = ({ 
  currentTab, 
  setCurrentTab, 
  isWsConnected, 
  isApiConnected, 
  cameraStatus,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { t } = useI18n();
  const { currentUser, logout, isSuperAdmin, isAdmin, isHR, isManager, isITSupport, hasPermission } = useAuth();
  
  // State for collapsible Management group
  const [isManagementOpen, setIsManagementOpen] = useState(true);

  useEffect(() => {
    if (MANAGEMENT_TABS.includes(currentTab)) {
      setIsManagementOpen(true);
    }
  }, [currentTab]);

  // Section-based menu items
  const monitoringItems = [
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
      id: NAV_TABS.MY_ACCOUNT,
      label: t('nav_my_account'),
      subLabel: t('nav_my_account_sub'),
      icon: UserCog,
      badge: 'ME',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      allowed: true,
    },
  ].filter(i => i.allowed);

  const managementItems = [
    {
      id: NAV_TABS.HR_HUB,
      label: t('nav_hr_hub'),
      subLabel: t('nav_hr_hub_sub'),
      icon: Users,
      badge: 'HR & IAM',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      allowed: isHR || isAdmin || hasPermission(['user:read', 'user:create', 'rbac:manage', 'org:manage']),
    },
    {
      id: NAV_TABS.SHIFTS_PAYROLL,
      label: t('nav_shifts_payroll'),
      subLabel: t('nav_shifts_payroll_sub'),
      icon: CalendarDays,
      badge: 'HRM',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      allowed: isHR || isAdmin || isManager || hasPermission(['user:read']),
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
  ].filter(i => i.allowed);

  const supportItems = [
    {
      id: NAV_TABS.HELPDESK,
      label: t('nav_helpdesk'),
      subLabel: t('nav_helpdesk_sub'),
      icon: LifeBuoy,
      badge: 'ITIL',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      allowed: true,
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
  ].filter(i => i.allowed);

  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const defaultCamName = cameraStatus?.camera?.source_type === 'RTSP' ? 'Tapo C200' : t('switch_to_webcam');
  const sourceName = cameraStatus?.camera?.device_id || defaultCamName;
  const isCamRunning = !!cameraStatus?.is_running;
  const isCamConnected = !!cameraStatus?.camera?.is_connected;
  const isManagementActive = MANAGEMENT_TABS.includes(currentTab);

  // Helper renderer for a menu button
  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;

    if (isCollapsed) {
      return (
        <div key={item.id} className="relative group flex justify-center">
          <button
            onClick={() => handleSelectTab(item.id)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            aria-label={item.label}
          >
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
          </button>

          {/* Floating Flyout Tooltip when Collapsed */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col z-50 px-3 py-2 bg-slate-900/95 text-white border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between space-x-2">
              <span className="font-bold text-xs text-white">{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </div>
            {item.subLabel && <span className="text-[10px] text-slate-400 mt-0.5">{item.subLabel}</span>}
          </div>
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleSelectTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 group ${
          isActive
            ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
          <div className="truncate">
            <div className="text-xs font-bold truncate">{item.label}</div>
            <div className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{item.subLabel}</div>
          </div>
        </div>
        {item.badge && (
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${item.badgeColor}`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* 1. Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* 2. Main Sidebar Drawer / Collapsible Bar */}
      <aside 
        className={`bg-[#0E1322] border-r border-slate-800/80 flex flex-col justify-between h-screen fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 select-none ${
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-72'
        } ${isMobileOpen ? 'w-72 translate-x-0 shadow-2xl shadow-indigo-950/50' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Brand & Navigation */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className={`border-b border-slate-800/80 flex items-center ${isCollapsed ? 'p-3.5 justify-center' : 'p-4 sm:p-5 justify-between'}`}>
            <div className="flex items-center space-x-3 min-w-0">
              <div 
                onClick={onToggleCollapse} 
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                title={isCollapsed ? (t('sidebar_expand_menu') || 'Mở rộng menu') : 'V-Face HRM Pro'}
              >
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-lg text-white tracking-wide">{t('brand_title')}</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{t('brand_badge')}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{t('brand_subtitle')}</p>
                </div>
              )}
            </div>
            
            {/* Desktop Collapse Toggle Button */}
            {!isCollapsed && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={t('sidebar_collapse_menu') || 'Thu gọn menu'}
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`space-y-3.5 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
            
            {/* Section 1: Monitoring */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('nav_section_monitoring')}
                </div>
              )}
              {monitoringItems.map(renderNavButton)}
            </div>

            {/* Section 2: Management */}
            <div className="space-y-1">
              {!isCollapsed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsManagementOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors group ${
                      isManagementActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('nav_section_management')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {managementItems.length}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-slate-400 group-hover:text-white ${isManagementOpen ? 'transform rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Collapsible Children */}
                  {isManagementOpen && (
                    <div className="space-y-1 pl-1.5 pt-0.5 border-l-2 border-slate-800/80 ml-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {managementItems.map(renderNavButton)}
                    </div>
                  )}
                </>
              ) : (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  {managementItems.map(renderNavButton)}
                </div>
              )}
            </div>

            {/* Section 3: Operations & Support */}
            <div className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('nav_section_support')}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800/80" />
              )}
              {supportItems.map(renderNavButton)}
            </div>

          </nav>
        </div>

        {/* System Status & Footer */}
        {isCollapsed ? (
          <div className="p-2 border-t border-slate-800/80 flex flex-col items-center space-y-2 flex-shrink-0">
            {/* Mini Health Dots with Tooltips */}
            <div className="relative group">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isApiConnected && isWsConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-400 animate-ping'
                }`} />
              </div>
              <div className="absolute left-full ml-3 bottom-0 hidden group-hover:flex flex-col z-50 px-3 py-2 bg-slate-900/95 text-white border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap text-xs">
                <span className="font-bold text-white mb-1">{t('stream_status')}</span>
                <span className="text-[11px] text-slate-300">API: {isApiConnected ? '8000 Online' : 'Offline'}</span>
                <span className="text-[11px] text-slate-300">WS: {isWsConnected ? 'Connected' : 'Offline'}</span>
                <span className="text-[11px] text-slate-300">Cam: {isCamRunning ? 'Active' : 'Stopped'}</span>
              </div>
            </div>

            {/* Mini User Avatar & Logout */}
            <div className="relative group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white text-xs cursor-pointer shadow-md">
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="absolute left-full ml-3 bottom-0 hidden group-hover:flex flex-col z-50 p-2.5 bg-slate-900/95 text-white border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap text-xs">
                <div className="font-bold text-white">{currentUser?.full_name || currentUser?.username || 'Admin'}</div>
                <div className="text-[10px] text-indigo-400 font-mono mb-2">
                  {typeof (currentUser?.roles || [])[0] === 'string'
                    ? (currentUser?.roles || [])[0]
                    : ((currentUser?.roles || [])[0]?.display_name || (currentUser?.roles || [])[0]?.name || 'superadmin')}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-semibold transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{t('logout') || 'Đăng xuất'}</span>
                </button>
              </div>
            </div>

            {/* Expand Button at Bottom */}
            <button
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
              title={t('sidebar_expand_menu') || 'Mở rộng menu'}
              aria-label="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3.5 m-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-2.5 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{t('stream_status')}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate max-w-[100px]">
                {sourceName}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
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
                  <div className="text-[10px] text-indigo-400 font-mono truncate">
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
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI ArcFace Core</span>
              </span>
              <button
                onClick={onToggleCollapse}
                className="hover:text-white transition-colors flex items-center space-x-0.5 text-[10px]"
                title={t('sidebar_collapse_menu') || 'Thu gọn menu'}
              >
                <ChevronsLeft className="w-3 h-3" />
                <span>{t('sidebar_collapse') || 'Thu gọn'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
