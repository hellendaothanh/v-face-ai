import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scan,
  Save,
  RefreshCw,
  Camera,
  Check,
  ShieldCheck,
  Calendar,
  BadgeCheck,
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const UserProfileManager = () => {
  const { t } = useI18n();
  const { currentUser, refreshProfile, userRoles } = useAuth();

  // Notification Toast
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --------------------------------------------------------------------------
  // 1. PROFILE STATE
  // --------------------------------------------------------------------------
  const [loadedUser, setLoadedUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
  });

  // Face AI Linked Status
  const [linkedEmployee, setLinkedEmployee] = useState(null);
  const [faceCount, setFaceCount] = useState(0);

  // --------------------------------------------------------------------------
  // 2. PASSWORD STATE
  // --------------------------------------------------------------------------
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // --------------------------------------------------------------------------
  // 3. LOAD CURRENT PROFILE & FACE AI LINK
  // --------------------------------------------------------------------------
  const loadUserData = useCallback(async () => {
    setProfileLoading(true);
    try {
      const meRes = await api.getCurrentUser();
      const user = meRes?.data || meRes || currentUser;
      
      if (user) {
        setLoadedUser(user);
        const fullName = user.profile?.full_name || user.full_name || user.username || '';
        const phone = user.profile?.phone_number || user.phone_number || '';
        const email = user.email || '';
        setProfileForm({
          full_name: fullName,
          phone_number: phone,
          email: email,
        });

        // Multi-field lookup for Face AI Employee (user_code, username, email, full_name)
        const candidates = [
          user.user_code,
          user.username,
          user.email,
          user.profile?.full_name || user.full_name
        ].filter(Boolean);

        let matched = null;
        for (const term of candidates) {
          try {
            const empRes = await api.getEmployees({ search: term, page: 1, page_size: 20 });
            const empList = empRes?.data?.items || empRes?.items || (Array.isArray(empRes) ? empRes : []);
            matched = empList.find((e) => {
              const codeMatch = e.employee_code && (
                e.employee_code.toUpperCase() === (user.user_code || '').toUpperCase() ||
                e.employee_code.toUpperCase() === (user.username || '').toUpperCase()
              );
              const emailMatch = e.email && user.email && e.email.toLowerCase() === user.email.toLowerCase();
              const nameMatch = e.full_name && (user.profile?.full_name || user.full_name) &&
                e.full_name.trim().toLowerCase() === (user.profile?.full_name || user.full_name).trim().toLowerCase();
              return Boolean(codeMatch || emailMatch || nameMatch);
            });
            if (matched) break;
          } catch (e) {
            // continue fallback
          }
        }

        // If still not matched, fetch the first page of employees to match locally
        if (!matched) {
          try {
            const allEmpRes = await api.getEmployees({ page: 1, page_size: 100 });
            const allList = allEmpRes?.data?.items || allEmpRes?.items || (Array.isArray(allEmpRes) ? allEmpRes : []);
            matched = allList.find((e) => {
              const codeMatch = e.employee_code && (
                e.employee_code.toUpperCase() === (user.user_code || '').toUpperCase() ||
                e.employee_code.toUpperCase() === (user.username || '').toUpperCase()
              );
              const emailMatch = e.email && user.email && e.email.toLowerCase() === user.email.toLowerCase();
              const nameMatch = e.full_name && (user.profile?.full_name || user.full_name) &&
                e.full_name.trim().toLowerCase() === (user.profile?.full_name || user.full_name).trim().toLowerCase();
              return Boolean(codeMatch || emailMatch || nameMatch);
            });
          } catch (fetchErr) {
            console.warn('Face AI global lookup notice:', fetchErr);
          }
        }

        if (matched) {
          setLinkedEmployee(matched);
          let count = Number(
            matched.registered_faces_count ?? 
            (matched.face_features ? matched.face_features.length : (matched.face_features_count ?? 0))
          );

          // If detail has face features array, verify exact count
          if (matched.id) {
            try {
              const detailRes = await api.getEmployeeDetail(matched.id);
              const detail = detailRes?.data || detailRes;
              if (detail) {
                if (detail.face_features && Array.isArray(detail.face_features)) {
                  count = detail.face_features.length;
                } else if (typeof detail.registered_faces_count === 'number') {
                  count = detail.registered_faces_count;
                }
              }
            } catch (dErr) {
              console.warn('Face AI detail count lookup notice:', dErr);
            }
          }
          setFaceCount(count);
        } else {
          setLinkedEmployee(null);
          setFaceCount(0);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      if (currentUser) {
        setLoadedUser(currentUser);
        setProfileForm({
          full_name: currentUser.profile?.full_name || currentUser.full_name || currentUser.username || '',
          phone_number: currentUser.profile?.phone_number || currentUser.phone_number || '',
          email: currentUser.email || '',
        });
      }
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // --------------------------------------------------------------------------
  // 4. HANDLE PROFILE SUBMIT
  // --------------------------------------------------------------------------
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const targetUserId = loadedUser?.id || currentUser?.id;
    if (!targetUserId) {
      showToast('Không tìm thấy mã định danh người dùng', 'error');
      return;
    }
    setIsSavingProfile(true);

    try {
      // 1. Update Core User profile
      const payload = {
        full_name: profileForm.full_name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
      };
      await api.updateMyProfile(targetUserId, payload);

      // 2. Sync to Face AI Employee if linked
      if (linkedEmployee?.id) {
        try {
          await api.updateEmployee(linkedEmployee.id, {
            full_name: profileForm.full_name.trim(),
            phone_number: profileForm.phone_number.trim() || null,
            email: profileForm.email.trim() || linkedEmployee.email,
          });
        } catch (syncErr) {
          console.warn('Face AI sync notice:', syncErr);
        }
      }

      await refreshProfile();
      await loadUserData();
      showToast(t('profile_save_success', 'Cập nhật thông tin cá nhân thành công!'));
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi lưu thông tin cá nhân';
      showToast(msg, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. HANDLE PASSWORD CHANGE
  // --------------------------------------------------------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.new_password.length < 6) {
      setPasswordError(t('pwd_too_short', 'Mật khẩu mới phải có tối thiểu 6 ký tự.'));
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError(t('pwd_mismatch', 'Mật khẩu xác nhận không khớp với mật khẩu mới.'));
      return;
    }

    if (passwordForm.old_password === passwordForm.new_password) {
      setPasswordError(t('pwd_same_as_old', 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });

      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
      showToast(t('password_change_success', 'Đổi mật khẩu bảo mật thành công!'));
    } catch (err) {
      setPasswordError(err.message || 'Mật khẩu cũ không chính xác hoặc lỗi máy chủ.');
      showToast(err.message || 'Đổi mật khẩu thất bại', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userCode = currentUser?.user_code || currentUser?.username || 'NV000';
  const deptName = currentUser?.department?.name || currentUser?.department || 'Chưa xếp phòng ban';
  const posName = currentUser?.position?.name || currentUser?.position || 'Nhân viên';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold backdrop-blur-md transition-all ${
            notification.type === 'error'
              ? 'bg-rose-500/90 text-white border border-rose-400'
              : 'bg-emerald-500/90 text-white border border-emerald-400'
          }`}
        >
          {notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO IDENTITY CARD                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl relative overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            {/* Avatar Badge */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold font-mono shadow-2xl shadow-indigo-600/30 border border-white/20">
                {(profileForm.full_name || currentUser?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white" title="Active">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-white tracking-wide">
                  {profileForm.full_name || currentUser?.username}
                </h1>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {userCode}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>@{currentUser?.username}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300 font-medium">{deptName}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 font-medium">{posName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Role Badges & Quick Stats */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {userRoles.map((role, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span className="uppercase tracking-wider text-[11px]">{role}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Scan className="w-4 h-4 text-cyan-400" />
              <span>Face AI 512D:</span>
              <span className={`font-mono font-bold ${faceCount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {faceCount > 0 ? `${faceCount}/5 mẫu đã nạp` : 'Chưa có mẫu'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2-COLUMN MAIN EDITORS (Personal Info & Security)                       */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ==================================================================== */}
        {/* COLUMN 1: PERSONAL INFORMATION FORM                                 */}
        {/* ==================================================================== */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {t('personal_info_title') || 'Thông Tin Cá Nhân'}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('personal_info_sub') || 'Cập nhật họ tên hiển thị và thông tin liên hệ'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('full_name') || 'Họ và tên'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('phone') || 'Số điện thoại liên hệ'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('email') || 'Địa chỉ Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  title="Email gắn liền với tài khoản IAM (chỉ Admin có thể đổi)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Read-only Enterprise Metadata Grid */}
            <div className="pt-2 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('employee_code') || 'Mã nhân viên'}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">{userCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('username') || 'Tên tài khoản'}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">@{currentUser?.username}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('department') || 'Phòng ban'}</span>
                <span className="text-xs font-semibold text-cyan-300 mt-0.5 block truncate">{deptName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('position') || 'Chức vụ'}</span>
                <span className="text-xs font-semibold text-purple-300 mt-0.5 block truncate">{posName}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('saving') || 'Đang lưu thông tin...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('btn_save_profile') || 'Lưu Thay Đổi Hồ Sơ'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================================== */}
        {/* COLUMN 2: SECURITY & PASSWORD CHANGE FORM                           */}
        {/* ==================================================================== */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {t('change_password_title') || 'Bảo Mật & Đổi Mật Khẩu'}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('change_password_sub') || 'Bảo vệ tài khoản bằng mật khẩu có độ phức tạp cao'}
                </p>
              </div>
            </div>
          </div>

          {passwordError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {/* Old Password */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('current_password') || 'Mật khẩu hiện tại'} *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('new_password') || 'Mật khẩu mới (Tối thiểu 6 ký tự)'} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('confirm_new_password') || 'Xác nhận mật khẩu mới'} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Password Change */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isChangingPassword || !passwordForm.old_password || !passwordForm.new_password}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('updating_password') || 'Đang cập nhật mật khẩu...'}</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{t('btn_change_password') || 'Cập Nhật Mật Khẩu'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfileManager;
