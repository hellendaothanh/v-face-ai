import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Server, 
  Wifi, 
  AlertTriangle,
  LogOut,
  ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const Header = ({ 
  title, 
  subtitle, 
  isApiConnected, 
  cameraStatus, 
  onRefreshCamera,
  showCameraControls = false 
}) => {
  const { language, setLanguage, t } = useI18n();
  const { currentUser, logout } = useAuth();
  const [isTogglingCamera, setIsTogglingCamera] = useState(false);
  const [selectedSource, setSelectedSource] = useState('WEBCAM');

  useEffect(() => {
    if (cameraStatus?.camera?.source_type) {
      setSelectedSource(cameraStatus.camera.source_type);
    }
  }, [cameraStatus]);

  const handleToggleCamera = async () => {
    setIsTogglingCamera(true);
    try {
      if (cameraStatus?.is_running) {
        await api.stopCamera();
      } else {
        await api.startCamera({ source_type: selectedSource });
      }
      if (onRefreshCamera) onRefreshCamera();
    } catch (err) {
      alert(`Camera control error: ${err.message}`);
    } finally {
      setIsTogglingCamera(false);
    }
  };

  const handleSwitchSource = async (newSource) => {
    setSelectedSource(newSource);
    if (cameraStatus?.is_running) {
      setIsTogglingCamera(true);
      try {
        await api.startCamera({ source_type: newSource });
        if (onRefreshCamera) onRefreshCamera();
      } catch (err) {
        alert(`Camera switch error: ${err.message}`);
      } finally {
        setIsTogglingCamera(false);
      }
    }
  };

  const isCamRunning = !!cameraStatus?.is_running;

  return (
    <header className="h-16 bg-[#0E1322]/90 backdrop-blur-xl border-b border-slate-800/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-lg shadow-black/20">
      {/* 1. Left: Page Title & Short Description */}
      <div className="min-w-0 pr-4">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-slate-400 truncate hidden md:block">{subtitle}</p>
        )}
      </div>

      {/* 2. Right: Streamlined Control Group */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        
        {/* System Health Dot (Compact) */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
            isApiConnected === true
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse'
          }`}
          title={isApiConnected ? 'API Server Connected (8000/8001)' : 'API Disconnected'}
        >
          <span className={`w-2 h-2 rounded-full ${isApiConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-400'}`} />
          <span className="hidden sm:inline text-[11px]">{isApiConnected ? t('online') : t('offline')}</span>
        </div>

        {/* Camera Controls: Only rendered when showCameraControls is true */}
        {showCameraControls && (
          <>
            {/* Camera Source Selector (Compact Dropdown/Pill) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs animate-in fade-in duration-200">
              <button
                onClick={() => handleSwitchSource('WEBCAM')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedSource === 'WEBCAM'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PC Webcam
              </button>
              <button
                onClick={() => handleSwitchSource('RTSP')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedSource === 'RTSP'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                IP Cam
              </button>
            </div>

            {/* Camera Start/Stop Button */}
            <button
              onClick={handleToggleCamera}
              disabled={isTogglingCamera || isApiConnected === false}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm animate-in fade-in duration-200 ${
                isCamRunning
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 shadow-rose-500/10'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              {isTogglingCamera ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isCamRunning ? (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">{t('turn_off_camera')}</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('turn_on_camera')}</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Language Switcher (Compact) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px]">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg font-bold transition-all ${
              language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('vi')}
            className={`px-2 py-1 rounded-lg font-bold transition-all ${
              language === 'vi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            VI
          </button>
        </div>

        {/* User Profile & Logout Button (Clean & Compact) */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white text-[10px] shadow-sm">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="text-xs font-bold text-white hidden lg:inline truncate max-w-[90px]">
              {currentUser?.full_name || currentUser?.username || 'Admin'}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all text-xs font-semibold shadow-sm"
            title={t('logout') || 'Đăng xuất'}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden xl:inline">{t('logout') || 'Đăng xuất'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Header;
