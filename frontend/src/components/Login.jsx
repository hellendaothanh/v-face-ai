import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  LogIn, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Cpu, 
  Activity, 
  AlertCircle,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

const Login = () => {
  const { login } = useAuth();
  const { t, language, setLanguage } = useI18n();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.');
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

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
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
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
              >
                <div className="font-bold text-[11px] text-white group-hover:text-indigo-300">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin / admin123</div>
              </button>

              <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/60 text-left opacity-75">
                <div className="font-bold text-[11px] text-slate-300">IAM Core Auth</div>
                <div className="text-[10px] text-purple-400 font-mono">Port 8001 JWT</div>
              </div>
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
