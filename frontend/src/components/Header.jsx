import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  CameraOff, 
  Clock, 
  RefreshCw, 
  Laptop, 
  Video, 
  Server, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle2,
  Globe
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const Header = ({ title, subtitle, isApiConnected, isWsConnected, cameraStatus, onRefreshCamera }) => {
  const { language, setLanguage, t } = useI18n();
  const [timeStr, setTimeStr] = useState('');
  const [isTogglingCamera, setIsTogglingCamera] = useState(false);
  const [selectedSource, setSelectedSource] = useState('WEBCAM'); // 'WEBCAM' or 'RTSP'

  // Update selected source when cameraStatus changes
  useEffect(() => {
    if (cameraStatus?.camera?.source_type) {
      setSelectedSource(cameraStatus.camera.source_type);
    }
  }, [cameraStatus]);

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const localeCode = language === 'vi' ? 'vi-VN' : 'en-US';
      setTimeStr(
        now.toLocaleTimeString(localeCode, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' | ' + now.toLocaleDateString(localeCode, {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

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
    // If camera is already running, seamlessly restart with new source
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
  const isCamConnected = !!cameraStatus?.camera?.is_connected;
  const sourceName = cameraStatus?.camera?.device_id || (selectedSource === 'RTSP' ? 'Tapo C200' : 'MacBook M4');

  return (
    <header className="h-20 bg-[#0E1322]/80 backdrop-blur-md border-b border-slate-800/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="min-w-0 pr-4">
        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{title}</h1>
        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block truncate">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* 1. Language Switcher (EN / VI) */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs shadow-sm">
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-bold text-xs transition-all ${
              language === 'en'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="English (Default)"
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
          <button
            onClick={() => setLanguage('vi')}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-bold text-xs transition-all ${
              language === 'vi'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Tiếng Việt"
          >
            <span>🇻🇳</span>
            <span>VI</span>
          </button>
        </div>

        {/* 2. API Connection Status Badge */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all ${
            isApiConnected === true
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : isApiConnected === false
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-slate-800/80 border-slate-700 text-slate-400'
          }`}
          title={isApiConnected === true ? 'Backend API is active' : 'Cannot connect to Backend API'}
        >
          <Server className={`w-3.5 h-3.5 ${isApiConnected === true ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="hidden md:inline">API:</span>
          <span>{isApiConnected === true ? t('online') : isApiConnected === false ? t('offline') : t('connecting')}</span>
        </div>

        {/* 3. Camera Connection Status Badge */}
        <div
          className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            isCamRunning && isCamConnected
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              : isCamRunning && !isCamConnected
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
              : 'bg-slate-900/90 border-slate-800 text-slate-400'
          }`}
        >
          {isCamRunning && isCamConnected ? (
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          ) : isCamRunning && !isCamConnected ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CameraOff className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="truncate max-w-[120px]">{sourceName}:</span>
          <span className="font-bold">
            {isCamRunning
              ? isCamConnected
                ? `${cameraStatus?.camera?.fps || 0} FPS`
                : t('no_signal')
              : t('camera_stopped')}
          </span>
        </div>

        {/* 4. Camera Source Selector */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => handleSwitchSource('WEBCAM')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              selectedSource === 'WEBCAM'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={t('switch_to_webcam')}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">MacBook M4</span>
          </button>

          <button
            onClick={() => handleSwitchSource('RTSP')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              selectedSource === 'RTSP'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={t('switch_to_rtsp')}
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tapo C200</span>
          </button>
        </div>

        {/* 5. Camera Quick Toggle Button */}
        <button
          onClick={handleToggleCamera}
          disabled={isTogglingCamera || isApiConnected === false}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-md ${
            cameraStatus?.is_running
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 shadow-rose-500/10'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isTogglingCamera ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : cameraStatus?.is_running ? (
            <>
              <CameraOff className="w-4 h-4 text-rose-400" />
              <span>{t('turn_off_camera')}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-white" />
              <span>{t('turn_on_camera')}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
