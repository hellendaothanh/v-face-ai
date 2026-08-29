import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  CameraOff,
  Upload,
  UserCheck,
  Sparkles,
  Link,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const ANGLES_CONFIG = [
  { id: 'front', label: '1. Chính diện (0°)', desc: 'Nhìn thẳng vào camera, giữ khuôn mặt cân đối', badge: 'Chính diện 0°' },
  { id: 'up', label: '2. Ngẩng lên (+15°)', desc: 'Ngẩng cằm lên nhẹ khoảng 15 độ', badge: 'Ngẩng +15°' },
  { id: 'down', label: '3. Cúi xuống (-15°)', desc: 'Cúi cằm xuống nhẹ khoảng 15 độ', badge: 'Cúi -15°' },
  { id: 'left', label: '4. Nghiêng trái (-30°)', desc: 'Xoay mặt sang bên trái khoảng 30 độ', badge: 'Nghiêng trái -30°' },
  { id: 'right', label: '5. Nghiêng phải (+30°)', desc: 'Xoay mặt sang bên phải khoảng 30 độ', badge: 'Nghiêng phải +30°' },
];

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
  const [isLinkingEmployee, setIsLinkingEmployee] = useState(false);

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
  // 3. SELF-SERVICE BIOMETRICS MODALS
  // --------------------------------------------------------------------------
  // Live Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyStream, setVerifyStream] = useState(null);
  const verifyVideoRef = useRef(null);

  // 5-Angle Face Enrollment Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [anglePhotos, setAnglePhotos] = useState({
    front: null,
    up: null,
    down: null,
    left: null,
    right: null,
  });
  const [enrollStream, setEnrollStream] = useState(null);
  const enrollVideoRef = useRef(null);
  const [isSavingVectors, setIsSavingVectors] = useState(false);
  const [enrollSuccessResult, setEnrollSuccessResult] = useState(null);

  // --------------------------------------------------------------------------
  // 4. LOAD CURRENT PROFILE & FACE AI LINK
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
  // 5. LINK / CREATE FACE AI EMPLOYEE PROFILE
  // --------------------------------------------------------------------------
  const handleCreateAndLinkEmployee = async () => {
    if (!currentUser) return;
    setIsLinkingEmployee(true);
    try {
      const code = currentUser.user_code || currentUser.username?.toUpperCase() || `EMP_${Date.now().toString().slice(-4)}`;
      const payload = {
        employee_code: code,
        full_name: profileForm.full_name || currentUser.full_name || currentUser.username,
        email: currentUser.email || `${code.toLowerCase()}@vface.ai`,
        phone_number: profileForm.phone_number || currentUser.phone_number || null,
        department: currentUser.department?.name || currentUser.department || 'Ban Điều Hành',
        position: currentUser.position?.name || currentUser.position || 'Nhân viên',
      };
      const res = await api.createEmployee(payload);
      const newEmp = res?.data || res;
      setLinkedEmployee(newEmp);
      setFaceCount(0);
      showToast('Đã tạo và liên kết hồ sơ Face AI thành công!');
      await loadUserData();
    } catch (err) {
      showToast(`Không thể tạo hồ sơ: ${err.message}`, 'error');
    } finally {
      setIsLinkingEmployee(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. LIVE VERIFICATION WEBCAM HANDLERS
  // --------------------------------------------------------------------------
  const startVerifyCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setVerifyStream(stream);
      if (verifyVideoRef.current) {
        verifyVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Cannot open user webcam:', err);
      showToast('Không thể mở camera. Vui lòng cấp quyền truy cập trình duyệt.', 'error');
    }
  };

  const stopVerifyCamera = () => {
    if (verifyStream) {
      verifyStream.getTracks().forEach(track => track.stop());
      setVerifyStream(null);
    }
  };

  const openVerifyModal = () => {
    setVerifyResult(null);
    setShowVerifyModal(true);
    setTimeout(() => startVerifyCamera(), 100);
  };

  const closeVerifyModal = () => {
    stopVerifyCamera();
    setShowVerifyModal(false);
    setVerifyResult(null);
  };

  const handleCaptureAndVerify = async () => {
    if (!linkedEmployee?.id) {
      showToast('Chưa có hồ sơ Face AI liên kết', 'error');
      return;
    }
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      let fileToSend = null;

      // 1. Capture snapshot from video element if active
      if (verifyVideoRef.current && verifyStream) {
        const video = verifyVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        fileToSend = new File([blob], `self_verify_${Date.now()}.jpg`, { type: 'image/jpeg' });
      } else {
        // Fallback: Get direct snapshot blob from backend camera
        const blob = await api.getDirectCameraSnapshotBlob();
        fileToSend = new File([blob], `self_verify_${Date.now()}.jpg`, { type: 'image/jpeg' });
      }

      const formData = new FormData();
      formData.append('image', fileToSend);

      const res = await api.verifyEmployeeFace(linkedEmployee.id, formData);
      const data = res?.data || res;
      setVerifyResult(data);

      if (res?.success || data?.is_verified) {
        showToast(`✅ Khớp thành công: ${data.confidence_percent}% (Cosine: ${data.similarity_score})`);
      } else {
        showToast(`❌ Chưa khớp (Độ tin cậy: ${data.confidence_percent || 0}%)`, 'error');
      }
    } catch (err) {
      setVerifyResult({
        is_verified: false,
        error: err.message || 'Lỗi xử lý so khớp khuôn mặt.',
      });
      showToast(err.message || 'Lỗi so khớp khuôn mặt', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. 5-ANGLE ENROLLMENT WEBCAM & UPLOAD HANDLERS
  // --------------------------------------------------------------------------
  const startEnrollCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setEnrollStream(stream);
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Cannot open user webcam:', err);
      showToast('Không thể mở camera. Vui lòng cấp quyền truy cập trình duyệt.', 'error');
    }
  };

  const stopEnrollCamera = () => {
    if (enrollStream) {
      enrollStream.getTracks().forEach(track => track.stop());
      setEnrollStream(null);
    }
  };

  const openEnrollModal = () => {
    setAnglePhotos({
      front: null,
      up: null,
      down: null,
      left: null,
      right: null,
    });
    setEnrollSuccessResult(null);
    setActiveAngleIndex(0);
    setShowEnrollModal(true);
    setTimeout(() => startEnrollCamera(), 100);
  };

  const closeEnrollModal = () => {
    stopEnrollCamera();
    setShowEnrollModal(false);
    setEnrollSuccessResult(null);
  };

  const handleSnapCurrentAngle = () => {
    if (!enrollVideoRef.current || !enrollStream) {
      showToast('Camera chưa sẵn sàng', 'error');
      return;
    }
    const video = enrollVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const activeAngleKey = ANGLES_CONFIG[activeAngleIndex].id;
    setAnglePhotos(prev => ({
      ...prev,
      [activeAngleKey]: dataUrl
    }));

    showToast(`Đã chụp góc: ${ANGLES_CONFIG[activeAngleIndex].badge}`);
    if (activeAngleIndex < ANGLES_CONFIG.length - 1) {
      setActiveAngleIndex(activeAngleIndex + 1);
    }
  };

  const handleFileUploadForAngle = (e, angleKey) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAnglePhotos(prev => ({
        ...prev,
        [angleKey]: event.target.result
      }));
      showToast(`Đã tải ảnh cho góc: ${angleKey}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSave5AnglesVectors = async () => {
    if (!linkedEmployee?.id) {
      showToast('Chưa có hồ sơ nhân sự Face AI', 'error');
      return;
    }

    const readyCount = Object.values(anglePhotos).filter(Boolean).length;
    if (readyCount < 5) {
      showToast('Vui lòng chụp hoặc tải đủ 5 góc ảnh khuôn mặt', 'error');
      return;
    }

    setIsSavingVectors(true);
    setEnrollSuccessResult(null);

    try {
      const formData = new FormData();
      for (const angle of ANGLES_CONFIG) {
        const dataUrl = anglePhotos[angle.id];
        if (dataUrl) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          formData.append('photos', blob, `${angle.id}_${Date.now()}.jpg`);
        }
      }

      const res = await api.registerEmployeeFace(linkedEmployee.id, formData);
      const data = res?.data || res;
      setEnrollSuccessResult(data);
      setFaceCount(5);
      showToast('🎉 Đã nạp thành công 5 vector 512D vào PostgreSQL pgvector!');
      await loadUserData();
    } catch (err) {
      showToast(err.message || 'Lỗi trích xuất vector khuôn mặt', 'error');
    } finally {
      setIsSavingVectors(false);
    }
  };

  // --------------------------------------------------------------------------
  // 8. HANDLE PROFILE SUBMIT
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
      const payload = {
        full_name: profileForm.full_name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
      };
      await api.updateMyProfile(targetUserId, payload);

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
      showToast(t('profile_update_success', 'Cập nhật thông tin hồ sơ thành công!'));
    } catch (err) {
      showToast(err.message || 'Cập nhật hồ sơ thất bại', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --------------------------------------------------------------------------
  // 9. HANDLE PASSWORD CHANGE
  // --------------------------------------------------------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.new_password.length < 6) {
      setPasswordError(t('password_min_length', 'Mật khẩu mới phải có ít nhất 6 ký tự.'));
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError(t('password_mismatch', 'Mật khẩu xác nhận không khớp với mật khẩu mới.'));
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
  const readyPhotosCount = Object.values(anglePhotos).filter(Boolean).length;

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
      {/* 2. SELF-SERVICE BIOMETRIC FACE AI HUB (NEW ENTERPRISE FEATURE)          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center space-x-2">
                <span>{t('self_biometrics_title') || 'Sinh Trắc Học & Tự Xác Thực Khuôn Mặt'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Self-Service AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('self_biometrics_sub') || 'Quản lý 5 mẫu vector 512D và chủ động kiểm tra độ khớp nhận diện trước camera'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {linkedEmployee ? (
              <>
                <button
                  type="button"
                  onClick={openVerifyModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02]"
                >
                  <Camera className="w-4 h-4 text-cyan-200" />
                  <span>{t('self_verify_btn') || 'Tự Kiểm Tra Xác Thực'}</span>
                </button>

                <button
                  type="button"
                  onClick={openEnrollModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>{t('self_register_face_btn') || 'Tự Cập Nhật 5 Góc Mặt'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCreateAndLinkEmployee}
                disabled={isLinkingEmployee}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {isLinkingEmployee ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                <span>{t('self_link_employee_btn') || 'Tạo & Liên Kết Hồ Sơ Face AI'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Biometric Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Trạng thái hồ sơ Face AI</span>
            <div className="flex items-center space-x-2 pt-0.5">
              {linkedEmployee ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Đã liên kết ({linkedEmployee.employee_code})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Chưa liên kết Face AI</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Vector Đặc Trưng (512D)</span>
            <div className="flex items-center space-x-2 pt-0.5">
              <Scan className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-bold font-mono ${faceCount >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {faceCount} / 5 mẫu góc nạp
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Khả năng Điểm Danh & Face ID</span>
            <div className="flex items-center space-x-2 pt-0.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className={`text-xs font-bold ${faceCount > 0 ? 'text-purple-300' : 'text-slate-500'}`}>
                {faceCount > 0 ? 'Sẵn sàng hoạt động (Active)' : 'Cần nạp mẫu khuôn mặt'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. 2-COLUMN MAIN EDITORS (Personal Info & Security)                    */}
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

      {/* ====================================================================== */}
      {/* MODAL 1: SELF-SERVICE LIVE FACE VERIFICATION MODAL                     */}
      {/* ====================================================================== */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 max-w-xl w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {t('self_verify_modal_title') || 'Tự Kiểm Tra Xác Thực Khuôn Mặt Trực Tiếp'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('self_verify_modal_sub') || 'Đứng trước camera máy tính để so khớp trực tiếp với 5 vector 512D'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeVerifyModal}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Video Viewport with HUD Overlay */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={verifyVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Target Face Oval HUD */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-56 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center animate-pulse">
                  <span className="text-[10px] font-mono text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40">
                    Đặt mặt vào khung
                  </span>
                </div>
              </div>

              {/* Top info badge */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Webcam Stream</span>
              </div>
            </div>

            {/* Live Verification Result Box */}
            {verifyResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                verifyResult.is_verified
                  ? 'bg-gradient-to-r from-emerald-950/70 to-cyan-950/70 border-emerald-400 shadow-xl text-white'
                  : 'bg-rose-950/60 border-rose-500 text-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {verifyResult.is_verified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>
                      {verifyResult.is_verified
                        ? (t('self_verify_success_title') || '🎉 XÁC THỰC THÀNH CÔNG: Độ Tin Cậy {percent}%').replace('{percent}', verifyResult.confidence_percent)
                        : (t('self_verify_fail_title') || '❌ XÁC THỰC CHƯA KHỚP: Độ Tin Cậy {percent}%').replace('{percent}', verifyResult.confidence_percent || 0)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                    Sim: {verifyResult.similarity_score || '--'} (Ngưỡng: {verifyResult.threshold || 0.6})
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {verifyResult.is_verified
                    ? `Khuôn mặt trực tiếp khớp chính xác với hồ sơ ${verifyResult.full_name} (${verifyResult.employee_code}). Bạn đã sẵn sàng để chấm công tự động!`
                    : 'Khuôn mặt chưa khớp với vector đã nạp. Vui lòng nhìn thẳng vào camera và thử lại.'}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={closeVerifyModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleCaptureAndVerify}
                disabled={isVerifying}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang so khớp vector...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 text-cyan-200" />
                    <span>Chụp & Kiểm Tra Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: SELF-SERVICE 5-ANGLE FACE ENROLLMENT MODAL                    */}
      {/* ====================================================================== */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 max-w-2xl w-full space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Tự Cập Nhật 5 Mẫu Góc Mặt (Self-Service 512D)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chụp hoặc tải ảnh 5 góc mặt để AI nhận diện chuẩn xác nhất từ mọi góc độ
                  </p>
                </div>
              </div>
              <button
                onClick={closeEnrollModal}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Webcam Live Capture Area */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={enrollVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Instructions Overlay */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-white">
                <span className="font-bold text-cyan-300">{ANGLES_CONFIG[activeAngleIndex]?.label}: </span>
                <span className="text-slate-300 text-[11px]">{ANGLES_CONFIG[activeAngleIndex]?.desc}</span>
              </div>

              {/* Capture Button Overlay */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center">
                <button
                  type="button"
                  onClick={handleSnapCurrentAngle}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-xl shadow-cyan-500/30 transition-all hover:scale-105"
                >
                  <Camera className="w-4 h-4 text-cyan-200" />
                  <span>Chụp Góc Này ({ANGLES_CONFIG[activeAngleIndex]?.badge})</span>
                </button>
              </div>
            </div>

            {/* 5 Angles Thumbnail Slots */}
            <div className="grid grid-cols-5 gap-2.5">
              {ANGLES_CONFIG.map((angle, idx) => {
                const photo = anglePhotos[angle.id];
                const isActive = activeAngleIndex === idx;
                return (
                  <div
                    key={angle.id}
                    onClick={() => setActiveAngleIndex(idx)}
                    className={`p-2 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center space-y-1 relative ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                        : photo
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center relative border border-slate-800">
                      {photo ? (
                        <>
                          <img src={photo} alt={angle.label} className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                            ✓
                          </div>
                        </>
                      ) : (
                        <Camera className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 truncate w-full block">
                      {angle.badge}
                    </span>
                    <label className="text-[9px] text-cyan-400 hover:underline cursor-pointer">
                      Tải ảnh
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUploadForAngle(e, angle.id)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Success Banner */}
            {enrollSuccessResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-400 text-white text-xs space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Nạp 5 Vector 512D Thành Công!</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Đã lưu trữ {enrollSuccessResult.total_registered || 5} vector sinh trắc học vào kho PostgreSQL pgvector.
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-mono">
                  {readyPhotosCount}/5 góc sẵn sàng
                </span>
                <button
                  type="button"
                  onClick={handleSave5AnglesVectors}
                  disabled={readyPhotosCount < 5 || isSavingVectors}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  {isSavingVectors ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang trích xuất vector...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Trích Xuất & Lưu 5 Vector 512D</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileManager;
