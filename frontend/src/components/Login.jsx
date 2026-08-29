import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  LogIn, 
  Eye, 
  EyeOff, 
  Activity, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Scan, 
  Camera, 
  RefreshCw, 
  Info,
  UserCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

const Login = () => {
  const { login, loginWithFace } = useAuth();
  const { t, language, setLanguage } = useI18n();

  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'face'
  
  // Password Mode States
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  
  // Face ID Mode States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceStatus, setFaceStatus] = useState('');
  const [detectedEmployee, setDetectedEmployee] = useState(null);
  const [faceLoginError, setFaceLoginError] = useState(null);

  // Common States
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'error', title = '', tip = '') => {
    setToast({
      id: Date.now(),
      message,
      type,
      title: title || (type === 'error' ? (t('face_login_failed_title') || 'Thông báo lỗi') : (t('common_success') || 'Thành công')),
      tip
    });
  }, [t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Start Webcam for Face ID
  const startCamera = useCallback(async () => {
    setCameraError('');
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera mediaDevices.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video auto-play handled:', e);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      setCameraError(t('face_login_no_camera') || 'Không thể truy cập camera (vui lòng kiểm tra quyền camera hoặc thiết bị đang được ứng dụng khác sử dụng).');
    }
  }, [t]);

  // Synchronize stream to video element whenever cameraActive or activeTab changes
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive, activeTab]);

  // Stop Webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'face') {
      startCamera();
    } else {
      stopCamera();
      setErrorMsg('');
      setFaceStatus('');
      setFaceLoginError(null);
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  // Password Login Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      showToast(t('login_success') || 'Đăng nhập thành công!', 'success', t('login_success_title') || 'Thành công');
    } catch (err) {
      const msg = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
      setErrorMsg(msg);
      showToast(msg, 'error', t('login_failed') || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Face ID Snapshot & Login Handler
  const handleFaceLogin = async () => {
    if (!streamRef.current || !videoRef.current || !cameraActive) {
      await startCamera();
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      const msg = 'Camera đang khởi động, vui lòng bấm lại sau 1 giây.';
      setErrorMsg(msg);
      showToast(msg, 'error', 'Camera chưa sẵn sàng');
      return;
    }

    setErrorMsg('');
    setFaceLoginError(null);
    setFaceStatus(t('face_login_scanning') || 'Đang trích xuất đặc trưng sinh trắc học...');
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob || blob.size < 100) {
        throw new Error('Không thể chụp hình từ camera.');
      }

      setFaceStatus(t('face_login_verifying') || 'Đang kiểm tra liveness & đối chiếu pgvector...');
      const result = await loginWithFace(blob);
      
      if (result && result.success) {
        setDetectedEmployee(result.employee);
        const welcomeMsg = (t('face_login_success') || 'Đăng nhập thành công! Chào mừng') + ` ${result.employee?.full_name || ''}`;
        setFaceStatus(welcomeMsg);
        showToast(welcomeMsg, 'success', t('face_login_success_title') || 'Xác thực sinh trắc thành công!');
      }
    } catch (err) {
      console.error('Face login error:', err);
      const code = err.code || err.data?.detail?.code;
      const rawMsg = err.message || '';
      
      let localizedTitle = t('face_login_failed_title') || (language === 'en' ? 'Face ID Login Failed' : 'Đăng Nhập Face ID Thất Bại');
      let localizedMsg = rawMsg;
      let localizedTip = t('face_login_err_tip') || (language === 'en' 
        ? 'Please check your lighting, look directly into camera, or switch to Password login.'
        : 'Vui lòng nhìn thẳng vào camera, đủ ánh sáng hoặc chuyển sang đăng nhập bằng Mật khẩu.');

      if (code === 'NO_FACE_DETECTED' || rawMsg.includes('Không tìm thấy khuôn mặt') || rawMsg.toLowerCase().includes('no face')) {
        localizedMsg = t('face_login_err_no_face') || (language === 'en'
          ? 'No face detected in camera frame. Please look directly at the camera.'
          : 'Không tìm thấy khuôn mặt trong khung hình. Vui lòng nhìn thẳng vào camera.');
      } else if (code === 'LOW_CONFIDENCE' || rawMsg.includes('Độ khớp sinh trắc học') || rawMsg.includes('ngưỡng an toàn') || rawMsg.toLowerCase().includes('confidence')) {
        const percentages = rawMsg.match(/\d+(\.\d+)?%/g);
        if (language === 'en') {
          localizedMsg = percentages && percentages.length >= 2
            ? `Biometric match confidence is below safe threshold (${percentages[0]} < ${percentages[1]}).`
            : (t('face_login_err_low_confidence') || 'Biometric match confidence score is below safety threshold.');
        } else {
          localizedMsg = percentages && percentages.length >= 2
            ? `Độ khớp sinh trắc học không đạt ngưỡng an toàn (${percentages[0]} < ${percentages[1]}).`
            : (t('face_login_err_low_confidence') || 'Độ khớp sinh trắc học không đạt ngưỡng an toàn.');
        }
      } else if (code === 'FACE_NOT_REGISTERED' || rawMsg.includes('chưa được đăng ký') || rawMsg.includes('không khớp') || rawMsg.toLowerCase().includes('not registered')) {
        localizedMsg = t('face_login_err_not_registered') || (language === 'en'
          ? 'Face is not registered in the system or does not match any active personnel.'
          : 'Khuôn mặt chưa được đăng ký trong hệ thống hoặc không khớp với bất kỳ nhân sự nào.');
      } else if (code === 'SPOOF_DETECTED' || rawMsg.includes('giả mạo') || rawMsg.toLowerCase().includes('spoof')) {
        localizedMsg = t('face_login_err_spoof') || (language === 'en'
          ? 'Spoof attempt or screen replay detected (Anti-Spoofing Alert).'
          : 'Phát hiện hình ảnh giả mạo hoặc video tái tạo (Anti-Spoofing Alert).');
      }

      setErrorMsg(localizedMsg);
      setFaceLoginError({
        title: localizedTitle,
        message: localizedMsg,
        tip: localizedTip,
        code: code
      });
      setFaceStatus('');
      showToast(localizedMsg, 'error', localizedTitle, localizedTip);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Alert Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md w-[calc(100%-3rem)] sm:w-auto p-4 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border-2 border-rose-500/80 text-white shadow-[0_10px_40px_rgba(244,63,94,0.4)] flex items-start space-x-3.5 transition-all duration-300">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            toast.type === 'error' 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          }`}>
            {toast.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold tracking-wide text-white">
                {toast.title}
              </h4>
            </div>
            <p className="text-xs text-rose-200 mt-0.5 leading-relaxed font-semibold">
              {toast.message}
            </p>
            {toast.tip && (
              <p className="text-[11px] text-slate-300 mt-1 leading-normal flex items-start space-x-1">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>{toast.tip}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Language Switcher at Top Right */}
      <div className="absolute top-6 right-6 z-20 flex items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 backdrop-blur-md shadow-lg">
        <button
          onClick={() => setLanguage('en')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            language === 'en'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="English"
        >
          <span>🇬🇧</span>
          <span>EN</span>
        </button>
        <button
          onClick={() => setLanguage('vi')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            language === 'vi'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Tiếng Việt"
        >
          <span>🇻🇳</span>
          <span>VI</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800/80 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-xl shadow-indigo-500/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-2xl font-black text-white tracking-wider">V-FACE AI</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  IAM Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('login_subtitle') || 'Hệ thống Quản trị Doanh nghiệp & Chấm công AI'}
              </p>
            </div>
          </div>

          {/* Authentication Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'password'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('tab_password_login') || 'Mật Khẩu'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('face')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'face'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>{t('tab_face_login') || 'Face ID AI'}</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                1-Click
              </span>
            </button>
          </div>

          {/* Prominent Form Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/60 text-rose-200 text-xs flex items-start space-x-3 shadow-xl shadow-rose-950/50 transition-all duration-300">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="font-bold text-rose-300 text-xs uppercase tracking-wide">
                  {faceLoginError?.title || t('face_login_failed_title') || 'Thông Báo Lỗi'}
                </div>
                <div className="leading-relaxed font-semibold text-rose-100">{errorMsg}</div>
                {faceLoginError?.tip && (
                  <div className="text-[11px] text-slate-300 pt-1 font-normal flex items-start space-x-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{faceLoginError.tip}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 1: PASSWORD LOGIN                                            */}
          {/* ================================================================ */}
          {activeTab === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {t('username') || 'Tên đăng nhập'} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    data-testid="login-username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {t('password') || 'Mật khẩu'} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    data-testid="login-password"
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-all"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>{t('signing_in') || 'Đang xác thực...'}</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{t('sign_in') || 'Đăng Nhập'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 2: FACE ID BIOMETRIC LOGIN                                  */}
          {/* ================================================================ */}
          {activeTab === 'face' && (
            <div className="space-y-4 text-xs text-center">
              {/* Webcam Viewport with Neon Biometric HUD */}
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border shadow-inner flex items-center justify-center transition-all duration-300 ${
                faceLoginError 
                  ? 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50' 
                  : 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
              }`}>
                {/* Persistent Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                  className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                    cameraActive ? 'opacity-100' : 'opacity-0 absolute'
                  }`}
                />

                {cameraActive ? (
                  <>
                    {/* Biometric Oval HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {/* Scanning Line Animation */}
                      {!faceLoginError && (
                        <div className="absolute inset-x-8 top-1/4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-pulse" />
                      )}

                      {/* Oval Target Frame */}
                      <div className={`w-44 h-56 rounded-[48%] border-2 border-dashed relative transition-all duration-300 ${
                        faceLoginError 
                          ? 'border-rose-400/80 shadow-[0_0_25px_rgba(244,63,94,0.4)]' 
                          : 'border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      }`}>
                        {/* 4 Corner Markers */}
                        <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${faceLoginError ? 'border-rose-400' : 'border-cyan-300'}`} />
                        <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 ${faceLoginError ? 'border-rose-400' : 'border-cyan-300'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 ${faceLoginError ? 'border-rose-400' : 'border-cyan-300'}`} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${faceLoginError ? 'border-rose-400' : 'border-cyan-300'}`} />
                      </div>
                    </div>

                    {/* Top Status Badge */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-[11px]">
                      <span className={`flex items-center space-x-1.5 font-semibold ${faceLoginError ? 'text-rose-400' : 'text-cyan-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${faceLoginError ? 'bg-rose-500 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
                        <span>{faceLoginError ? 'Biometrics Alert' : 'AI Face Liveness'}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">pgvector 512D</span>
                    </div>

                    {/* Prominent Failure Modal Overlay on Error */}
                    {faceLoginError && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center space-y-3 z-20 transition-all duration-300">
                        <div className="w-12 h-12 p-2.5 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-400 flex items-center justify-center shadow-xl shadow-rose-500/30 animate-pulse">
                          <XCircle className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 max-w-xs px-2">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            {faceLoginError.title}
                          </h3>
                          <p className="text-xs text-rose-200 font-semibold leading-relaxed">
                            {faceLoginError.message}
                          </p>
                          {faceLoginError.tip && (
                            <p className="text-[11px] text-slate-300 leading-tight pt-1 flex items-center justify-center space-x-1">
                              <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{faceLoginError.tip}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 pt-1 w-full max-w-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setFaceLoginError(null);
                              setErrorMsg('');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 shadow-md transition-all hover:scale-105"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('face_login_retry') || 'Thử lại'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFaceLoginError(null);
                              setErrorMsg('');
                              setActiveTab('password');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-200" />
                            <span>{t('tab_password_login') || 'Mật Khẩu'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3 relative z-10">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs">
                      {cameraError || (t('face_login_no_camera') || 'Camera đang tắt')}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
                    >
                      {t('btn_start_camera') || 'Mở Camera'}
                    </button>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {faceStatus && (
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-center space-x-2 animate-pulse">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>{faceStatus}</span>
                </div>
              )}

              {/* Persistent Failure Alert Box Under Viewport */}
              {faceLoginError && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 text-rose-300 text-xs flex flex-col space-y-2 text-left shadow-lg shadow-rose-950/40 transition-all duration-300">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                    <span>{faceLoginError.title}</span>
                  </div>
                  <p className="text-xs text-rose-200 pl-6 leading-relaxed font-semibold">
                    {faceLoginError.message}
                  </p>
                  {faceLoginError.tip && (
                    <p className="text-[11px] text-slate-300 pl-6 leading-tight font-normal flex items-center space-x-1">
                      <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{faceLoginError.tip}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleFaceLogin}
                disabled={loading || !cameraActive}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{faceStatus || (t('face_login_scanning') || 'Đang xử lý sinh trắc...')}</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 text-cyan-200" />
                    <span>{t('btn_scan_and_login') || 'Xác Thực & Đăng Nhập Ngay'}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400">
                {t('face_login_tip') || 'Đảm bảo gương mặt ở giữa khung hình và đủ ánh sáng.'}
              </p>
            </div>
          )}

          {/* Quick Demo Credentials Box */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center space-x-1">
                <KeyRound className="w-3 h-3 text-indigo-400" />
                <span>{t('demo_accounts') || 'Tài khoản mẫu mặc định:'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('password');
                  handleQuickFill('admin', 'admin123');
                }}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
              >
                <div className="font-bold text-[11px] text-white group-hover:text-indigo-300">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('face')}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="font-bold text-[11px] text-cyan-300 flex items-center space-x-1">
                  <Scan className="w-3 h-3 text-cyan-400" />
                  <span>Face ID</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">1-Click Login</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          V-Face AI Microservices Ecosystem • Secured by Core User & IAM Service
        </p>
      </div>
    </div>
  );
};

export default Login;
