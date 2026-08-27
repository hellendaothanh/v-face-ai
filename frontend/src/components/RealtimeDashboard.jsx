import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Camera, 
  UserCheck, 
  Cpu, 
  Zap, 
  RefreshCw, 
  Radio, 
  ShieldAlert, 
  Laptop, 
  Video, 
  UserPlus, 
  AlertCircle, 
  ScanFace,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  HelpCircle,
  UserX,
  ShieldX,
  ShieldCheck,
  Sparkles,
  Maximize2,
  Minimize2,
  Columns,
  LayoutGrid,
  Monitor,
  X,
  History
} from 'lucide-react';
import api from '../services/api';

const RealtimeDashboard = ({ 
  isWsConnected, 
  setIsWsConnected, 
  isApiConnected, 
  apiError, 
  cameraStatus, 
  onRefreshCamera, 
  onNavigateToEmployees 
}) => {
  const [liveLogs, setLiveLogs] = useState([]);
  const [strangerLogs, setStrangerLogs] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [stats, setStats] = useState({
    todayCount: 0,
    fps: 0,
    detectedFaces: 0,
    accuracy: 94.8,
  });
  const [lastCheckin, setLastCheckin] = useState(null);
  const [highlightLatest, setHighlightLatest] = useState(false);
  const [spoofAlert, setSpoofAlert] = useState(null);
  const [strangerAlert, setStrangerAlert] = useState(null);
  const [activeFeedTab, setActiveFeedTab] = useState('attendance'); // 'attendance' | 'strangers'
  const [cameraViewMode, setCameraViewMode] = useState(() => {
    return localStorage.getItem('vface_camera_view_mode') || 'standard';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const videoWrapperRef = useRef(null);

  const toggleFullscreen = useCallback(() => {
    if (!videoWrapperRef.current) return;
    if (!document.fullscreenElement) {
      videoWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable full-screen mode:", err.message);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleViewModeChange = (mode) => {
    setCameraViewMode(mode);
    localStorage.setItem('vface_camera_view_mode', mode);
  };

  // Audio chime on successful check-in
  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio autoplay restrictions
    }
  }, []);

  // Audio siren / alarm on stranger alert
  const playSecuritySiren = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay restrictions
    }
  }, []);

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = 'ws://localhost:8000/ws/attendance';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'ATTENDANCE_CHECKIN' && payload.data) {
          const item = payload.data;
          setLiveLogs((prev) => [item, ...prev.slice(0, 49)]);
          setLastCheckin(item);
          setStats((prev) => ({ ...prev, todayCount: prev.todayCount + 1 }));

          setHighlightLatest(true);
          setTimeout(() => setHighlightLatest(false), 2000);
          playChime();
        } else if (payload.event === 'spoofing_alert') {
          setSpoofAlert(payload);
          setTimeout(() => {
            setSpoofAlert((current) => (current === payload ? null : current));
          }, 6000);
        } else if (payload.event === 'stranger_alert') {
          setStrangerAlert(payload);
          setStrangerLogs((prev) => [payload, ...prev.slice(0, 49)]);
          playSecuritySiren();
          setTimeout(() => {
            setStrangerAlert((current) => (current === payload ? null : current));
          }, 12000);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      wsRef.current = null;
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectWebSocket();
        }, 3000);
      }
    };
  }, [setIsWsConnected, playChime, playSecuritySiren]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Initial fetch of recent attendance & employees count
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await api.getAttendanceHistory({ page: 1, page_size: 20 });
        if (res.data?.items) {
          setLiveLogs(res.data.items);
          setStats((prev) => ({
            ...prev,
            todayCount: res.data.total || res.data.items.length,
          }));
          if (res.data.items.length > 0) {
            setLastCheckin(res.data.items[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch initial attendance history:', err.message);
      }

      try {
        const empRes = await api.getEmployees({ page: 1, page_size: 1 });
        if (empRes.data) {
          setEmployeeCount(empRes.data.total ?? 0);
        }
      } catch (err) {
        console.warn('Could not fetch employee count:', err.message);
      }
    };

    fetchInitialData();
  }, []);

  const isCamRunning = cameraStatus?.is_running;
  const isCamConnected = cameraStatus?.camera?.is_connected;
  const isWebcam = !cameraStatus?.camera?.source_type || cameraStatus?.camera?.source_type === 'WEBCAM';
  const sourceName = cameraStatus?.camera?.device_id || (isWebcam ? 'FaceTime HD (MacBook M4)' : 'Tapo C200 (RTSP Gate)');

  // Helper render for Live Camera Card
  const renderLiveCameraCard = () => (
    <div className="glass-panel p-5 rounded-3xl space-y-3 relative overflow-hidden border border-slate-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ScanFace className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Camera Monitor (Màn hình giám sát)
          </span>
        </div>

        {/* View Mode Toolbar + Stream Status */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleViewModeChange('standard')}
              title="Chế độ Tiêu chuẩn (Cân đối)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                cameraViewMode === 'standard'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tiêu chuẩn</span>
            </button>

            <button
              onClick={() => handleViewModeChange('wide')}
              title="Chế độ Mở rộng (Rộng 2/3)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                cameraViewMode === 'wide'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mở rộng</span>
            </button>

            <button
              onClick={() => handleViewModeChange('cinema')}
              title="Chế độ Toàn cảnh (Rạp chiếu Full-Width)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                cameraViewMode === 'cinema'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Toàn cảnh</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (Fullscreen)'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isCamRunning && isCamConnected
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : isCamRunning && !isCamConnected
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isCamRunning ? (isCamConnected ? 'LIVE STREAM' : 'NO SIGNAL') : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Video Feed Frame */}
      <div 
        ref={videoWrapperRef}
        className={`w-full ${
          cameraViewMode === 'cinema' ? 'aspect-[21/9] sm:aspect-[16/9] min-h-[360px] max-h-[580px]' : 'aspect-video'
        } rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 relative flex items-center justify-center shadow-inner`}
      >
        {isCamRunning ? (
          <img
            src="http://localhost:8000/api/v1/camera/video_feed"
            alt="Live Camera Video Stream"
            className="w-full h-full object-contain bg-slate-950"
          />
        ) : (
          <div className="text-center space-y-2 p-6">
            <Camera className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-400">Camera đang tạm dừng</div>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Bấm nút <strong>"Bật Camera"</strong> ở góc trên bên phải để bắt đầu luồng nhận diện trực tiếp.
            </p>
          </div>
        )}

        {/* Overlaid AI Targeting HUD */}
        {isCamRunning && isCamConnected && (
          <div className="absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
              <span>AI FACE ENGINE: ACTIVE (MULTI-TRACKING)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 w-fit self-end">
              <span>{cameraStatus?.camera?.device_id || sourceName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper render for Spotlight Card
  const renderSpotlightCard = () => (
    <div className={`glass-panel p-6 rounded-3xl transition-all duration-500 relative overflow-hidden border border-slate-800 ${
      highlightLatest ? 'ring-2 ring-indigo-500 glow-indigo shadow-2xl scale-[1.01]' : ''
    }`}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Radio className={`w-4 h-4 ${isWsConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Nhận diện Gần Nhất</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          LIVE
        </span>
      </div>

      {lastCheckin ? (
        (() => {
          const lastFullName = lastCheckin.full_name || lastCheckin.employee?.full_name || 'Nhân viên';
          const lastEmpCode = lastCheckin.employee_code || lastCheckin.employee?.employee_code || '';
          const lastDept = lastCheckin.department || lastCheckin.employee?.department || '';
          const lastPos = lastCheckin.position || lastCheckin.employee?.position || '';

          return (
            <div className="mt-6 text-center space-y-4">
              <div className="relative inline-block mx-auto">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-500/50 bg-slate-900 shadow-xl shadow-indigo-500/20 mx-auto flex items-center justify-center">
                  {lastCheckin.snapshot_base64 ? (
                    <img
                      src={lastCheckin.snapshot_base64}
                      alt={lastFullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-indigo-950 to-slate-900 text-indigo-400">
                      <UserCheck className="w-10 h-10 mb-1" />
                      <span className="text-[10px] text-slate-400">Ảnh khớp khuôn mặt</span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold shadow-md flex items-center space-x-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{lastCheckin.confidence_percent || `${((lastCheckin.confidence_score || 0) * 100).toFixed(1)}%`}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white tracking-wide">{lastFullName}</h4>
                <p className="text-xs text-indigo-400 font-mono font-semibold">
                  {lastEmpCode} {lastDept && `• ${lastDept}`}
                </p>
                {lastPos && <p className="text-[11px] text-slate-400">{lastPos}</p>}
              </div>

              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {new Date(lastCheckin.check_time).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-600" />
          <p>Chưa có sự kiện điểm danh nào gần đây</p>
          <p className="text-[10px] text-slate-400">Đứng trước camera để hệ thống tự động nhận diện</p>
        </div>
      )}
    </div>
  );

  // Helper render for Realtime Feed Card
  const renderFeedCard = () => (
    <div className="glass-panel p-6 rounded-3xl h-full flex flex-col border border-slate-800">
      {/* Header with Sub-Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveFeedTab('attendance')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFeedTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Điểm Danh Trực Tiếp</span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-950 text-[10px] font-mono">
              {liveLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFeedTab('strangers')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFeedTab === 'strangers'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Cảnh Báo Người Lạ</span>
            {strangerLogs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-red-950 text-red-200 text-[10px] font-mono font-bold animate-pulse">
                {strangerLogs.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-slate-400">
          {activeFeedTab === 'attendance' ? 'Bản ghi hợp lệ' : 'Lịch sử phát hiện'}
        </span>
      </div>

      {/* TAB 1: Realtime Attendance Feed */}
      {activeFeedTab === 'attendance' && (
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px]">
          {liveLogs.length === 0 ? (
            <div className="py-24 text-center text-slate-500 text-xs space-y-2">
              <ScanFace className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
              <p className="text-slate-400">Đang chờ sự kiện điểm danh từ Camera AI...</p>
            </div>
          ) : (
            liveLogs.map((log, index) => {
              const fullName = log.full_name || log.employee?.full_name || 'Nhân viên';
              const empCode = log.employee_code || log.employee?.employee_code || '';
              const department = log.department || log.employee?.department || '';
              const position = log.position || log.employee?.position || '';
              const initialChar = fullName ? fullName.charAt(0).toUpperCase() : 'N';

              return (
                <div
                  key={log.record_id || log.id || index}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    index === 0
                      ? 'bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Avatar / Snapshot */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 flex items-center justify-center">
                      {log.snapshot_base64 ? (
                        <img
                          src={log.snapshot_base64}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {initialChar}
                        </div>
                      )}
                    </div>

                    {/* Employee Info */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white truncate">{fullName}</span>
                        {empCode && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                            {empCode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {department} {position && `• ${position}`}
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Time & Confidence */}
                  <div className="text-right flex-shrink-0 ml-3 space-y-1">
                    <div className="text-xs font-mono font-bold text-white">
                      {new Date(log.check_time).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </div>
                    <div className="flex items-center justify-end space-x-1.5">
                      {log.auto_learned && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Tự học mẫu</span>
                        </span>
                      )}
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{log.confidence_percent || `${((log.confidence_score || 0) * 100).toFixed(1)}%`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Stranger Security Logs */}
      {activeFeedTab === 'strangers' && (
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px]">
          {strangerLogs.length === 0 ? (
            <div className="py-24 text-center text-slate-500 text-xs space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500/60" />
              <p className="text-slate-300 font-semibold">Khu vực an ninh đảm bảo</p>
              <p className="text-slate-500 text-[11px]">Chưa phát hiện người lạ nào đi qua khu vực cửa vào trong phiên làm việc.</p>
            </div>
          ) : (
            strangerLogs.map((item, index) => (
              <div
                key={index}
                className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 transition-all flex items-center justify-between shadow-md"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Snapshot */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-red-500/40 flex-shrink-0 flex items-center justify-center">
                    {item.snapshot ? (
                      <img
                        src={item.snapshot}
                        alt="Stranger"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserX className="w-6 h-6 text-red-400" />
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-red-300 uppercase tracking-wide">
                        Người Lạ Chưa Đăng Ký
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-mono font-bold">
                        Khớp &lt; 70%
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 truncate mt-0.5">
                      {item.message}
                    </div>
                  </div>
                </div>

                {/* Event Time & Similarity */}
                <div className="text-right flex-shrink-0 ml-3 space-y-1">
                  <div className="text-xs font-mono font-bold text-red-400">
                    {item.timestamp}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Độ khớp: {item.confidence?.toFixed(1) ?? '0.0'}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Alert 1: Anti-Spoofing Security Incident */}
      {spoofAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-rose-900/80 to-slate-950 border-2 border-red-500 text-white shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-lg shadow-red-500/50">
              <ShieldX className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wide text-red-200 uppercase">
                🚨 CẢNH BÁO AN NINH: PHÁT HIỆN HÀNH VI GIẢ MẠO (ANTI-SPOOFING)
              </div>
              <div className="text-xs text-slate-200 mt-0.5">
                {spoofAlert.message} (Độ tự tin thực thể sống:{' '}
                <span className="font-mono font-bold text-red-300">
                  {((spoofAlert.liveness_score || 0) * 100).toFixed(1)}%
                </span>{' '}
                &lt; Ngưỡng an toàn {((spoofAlert.threshold || 0.6) * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
          <button
            onClick={() => setSpoofAlert(null)}
            className="px-3 py-1.5 rounded-xl bg-red-800/60 hover:bg-red-700 text-xs font-bold transition-all"
          >
            Đã xử lý
          </button>
        </div>
      )}

      {/* Top Banner Alert 2: Stranger Alert (Phát hiện người lạ xuất hiện) */}
      {strangerAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-red-900 to-amber-950/80 border-2 border-red-500 text-white shadow-2xl flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-4">
            {strangerAlert.snapshot ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-400 flex-shrink-0 bg-black">
                <img
                  src={strangerAlert.snapshot}
                  alt="Stranger Alert"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-lg shadow-red-500/50 flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="font-extrabold text-sm tracking-wide text-red-200 uppercase flex items-center space-x-2">
                <span>🚨 CẢNH BÁO: PHÁT HIỆN NGƯỜI LẠ (STRANGER ALERT)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-red-300">
                  {strangerAlert.timestamp}
                </span>
              </div>
              <div className="text-xs text-slate-200 mt-0.5">
                {strangerAlert.message} — Khuôn mặt chưa có trong hệ thống dữ liệu nhân sự.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStrangerAlert(null)}
            className="px-3 py-1.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-xs font-bold transition-all flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>Đóng cảnh báo</span>
          </button>
        </div>
      )}

      {/* System Status Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: API & Server Status */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Hạ Tầng API & WebSocket</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center space-x-2 truncate">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isApiConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'
              }`} />
              <span className="text-sm font-bold text-white truncate">
                {isApiConnected ? 'FastAPI & PostgreSQL' : 'Mất kết nối API'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>WebSocket:</span>
            <span className={isWsConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {isWsConnected ? 'Đang truyền tin' : 'Đang kết nối lại'}
            </span>
          </div>
        </div>

        {/* Card 2: Camera Stream Engine */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Camera Source (Nguồn)</span>
            {isWebcam ? (
              <Laptop className="w-4 h-4 text-cyan-400" />
            ) : (
              <Video className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center space-x-2 truncate">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isCamRunning && isCamConnected
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse'
                  : isCamRunning && !isCamConnected
                  ? 'bg-amber-500'
                  : 'bg-slate-600'
              }`} />
              <span className="text-sm font-bold text-white truncate">
                {sourceName}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Trạng thái luồng:</span>
            <span className={`font-semibold ${
              isCamRunning && isCamConnected
                ? 'text-emerald-400'
                : isCamRunning && !isCamConnected
                ? 'text-amber-400'
                : 'text-slate-500'
            }`}>
              {isCamRunning ? (isCamConnected ? 'Đang hoạt động' : 'Mất tín hiệu') : 'Đang tạm dừng'}
            </span>
          </div>
        </div>

        {/* Card 3: Stranger Security Metrics */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Cảnh Báo Người Lạ</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white font-mono">
              {cameraStatus?.stranger_alerts_count ?? strangerLogs.length}
            </div>
            <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
              Ngưỡng &lt; 70%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cooldown:</span>
            <span className="text-slate-300 font-mono">60s chống spam</span>
          </div>
        </div>

        {/* Card 4: Today Attendance Count */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Lượt Chấm Công Hôm Nay</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats.todayCount}
            </div>
            <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              Auto AI
            </span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>pgvector Multi-Template matching</span>
          </div>
        </div>
      </div>

      {/* Main Dynamic View Modes Layout */}
      {cameraViewMode === 'cinema' ? (
        <div className="space-y-8">
          {/* Cinema Top: Ultra-wide Live Camera View */}
          <div className="w-full">
            {renderLiveCameraCard()}
          </div>

          {/* Cinema Bottom: 2-column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              {renderSpotlightCard()}
            </div>
            <div className="lg:col-span-8">
              {renderFeedCard()}
            </div>
          </div>
        </div>
      ) : (
        /* Standard (5/7) or Wide (8/4) 2-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`${cameraViewMode === 'wide' ? 'lg:col-span-8' : 'lg:col-span-5'} space-y-6`}>
            {renderLiveCameraCard()}
            {renderSpotlightCard()}
          </div>
          <div className={`${cameraViewMode === 'wide' ? 'lg:col-span-4' : 'lg:col-span-7'}`}>
            {renderFeedCard()}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeDashboard;
