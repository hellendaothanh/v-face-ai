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
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  Target,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const UserProfileManager = () => {
  const { t } = useI18n();
  const { currentUser, refreshProfile, userRoles } = useAuth();

  const anglesConfig = [
    {
      id: 'straight',
      step: 1,
      label: t('angle_front_label', '1. Frontal (0°)'),
      title: t('angle_1_title', 'Góc 1: Nhìn Thẳng Trung Tâm'),
      desc: t('angle_1_desc', 'Giữ thẳng đầu, mắt nhìn thẳng vào tâm ống kính camera'),
      badge: t('angle_1_badge', 'Thẳng (Center)'),
      instruction: t('angle_1_instruction', 'NHÌN THẲNG VÀO TRUNG TÂM CAMERA'),
      guideType: 'center',
      icon: Target,
    },
    {
      id: 'left',
      step: 2,
      label: t('angle_left_label', '2. Turn Left (~20°)'),
      title: t('angle_2_title', 'Góc 2: Quay Mặt Sang Trái (~20°)'),
      desc: t('angle_2_desc', 'Nghiêng và quay mặt nhẹ nhàng sang phía BÊN TRÁI'),
      badge: t('angle_2_badge', 'Quay Trái (Yaw -20°)'),
      instruction: t('angle_2_instruction', 'QUAY MẶT SANG BÊN TRÁI (~20°)'),
      guideType: 'left',
      icon: ArrowLeft,
    },
    {
      id: 'right',
      step: 3,
      label: t('angle_right_label', '3. Turn Right (~20°)'),
      title: t('angle_3_title', 'Góc 3: Quay Mặt Sang Phải (~20°)'),
      desc: t('angle_3_desc', 'Nghiêng và quay mặt nhẹ nhàng sang phía BÊN PHẢI'),
      badge: t('angle_3_badge', 'Quay Phải (Yaw +20°)'),
      instruction: t('angle_3_instruction', 'QUAY MẶT SANG BÊN PHẢI (~20°)'),
      guideType: 'right',
      icon: ArrowRight,
    },
    {
      id: 'down',
      step: 4,
      label: t('angle_down_label', '4. Tilt Down (~15°)'),
      title: t('angle_4_title', 'Góc 4: Cúi Cằm Xuống Dưới (~15°)'),
      desc: t('angle_4_desc', 'Hơi cúi cằm và hạ thấp góc nhìn xuống dưới'),
      badge: t('angle_4_badge', 'Cúi Xuống (Pitch -15°)'),
      instruction: t('angle_4_instruction', 'HƠI CÚI CẰM XUỐNG DƯỚI (~15°)'),
      guideType: 'down',
      icon: ArrowDown,
    },
    {
      id: 'up_smile',
      step: 5,
      label: t('angle_up_label', '5. Tilt Up (~15°)'),
      title: t('angle_5_title', 'Góc 5: Ngẩng Lên & Cười Tự Nhiên'),
      desc: t('angle_5_desc', 'Hơi ngẩng cằm lên và cười tươi tự nhiên để nhận diện biểu cảm'),
      badge: t('angle_5_badge', 'Ngẩng & Cười'),
      instruction: t('angle_5_instruction', 'HƠI NGẨNG CẰM & CƯỜI TỰ NHIÊN'),
      guideType: 'up',
      icon: ArrowUp,
    },
  ];

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
  const [enrollMode, setEnrollMode] = useState('webcam'); // 'webcam' | 'manual_upload'
  const [anglePhotos, setAnglePhotos] = useState({
    straight: null,
    left: null,
    right: null,
    down: null,
    up_smile: null,
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
      verifyStream.getTracks().forEach(track => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {}
      });
      setVerifyStream(null);
    }
    if (verifyVideoRef.current) {
      try {
        verifyVideoRef.current.pause();
      } catch (e) {}
      verifyVideoRef.current.srcObject = null;
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
      enrollStream.getTracks().forEach(track => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {}
      });
      setEnrollStream(null);
    }
    if (enrollVideoRef.current) {
      try {
        enrollVideoRef.current.pause();
      } catch (e) {}
      enrollVideoRef.current.srcObject = null;
    }
  };

  // Clean up all camera streams when UserProfileManager unmounts
  useEffect(() => {
    return () => {
      stopVerifyCamera();
      stopEnrollCamera();
    };
  }, []);

  const openEnrollModal = () => {
    setAnglePhotos({
      straight: null,
      left: null,
      right: null,
      down: null,
      up_smile: null,
    });
    setEnrollSuccessResult(null);
    setActiveAngleIndex(0);
    setEnrollMode('webcam');
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

    const activeAngleKey = anglesConfig[activeAngleIndex].id;
    setAnglePhotos(prev => ({
      ...prev,
      [activeAngleKey]: dataUrl
    }));

    showToast(`Captured angle: ${anglesConfig[activeAngleIndex].badge}`);
    if (activeAngleIndex < anglesConfig.length - 1) {
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
      for (const angle of anglesConfig) {
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
  const deptName = currentUser?.department?.name || currentUser?.department || t('unassigned_dept', 'Unassigned Department');
  const posName = currentUser?.position?.name || currentUser?.position || t('default_position', 'Staff Member');
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
                {faceCount > 0 ? `${faceCount}/5 ${t('templates_loaded', 'templates loaded')}` : t('no_templates', 'No templates')}
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
                <span>{t('self_biometrics_title', 'Biometrics & Self-Service Face Verification')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Self-Service AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('self_biometrics_sub', 'Manage your 512D facial vectors and independently verify match confidence in front of the camera')}
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
                  <span>{t('self_verify_btn', 'Verify My Face Now')}</span>
                </button>

                <button
                  type="button"
                  onClick={openEnrollModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>{t('self_register_face_btn', 'Self-Update 5 Face Angles')}</span>
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
                <span>{t('self_link_employee_btn', 'Create & Link Face AI Profile')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Biometric Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">{t('self_status_profile_label', 'Face AI Profile Status')}</span>
            <div className="flex items-center space-x-2 pt-0.5">
              {linkedEmployee ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">{t('linked_status', 'Linked')} ({linkedEmployee.employee_code})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">{t('unlinked_status', 'Not Linked to Face AI')}</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">{t('feature_vectors_label', 'Feature Vectors (512D)')}</span>
            <div className="flex items-center space-x-2 pt-0.5">
              <Scan className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs font-bold font-mono ${faceCount >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {faceCount} / 5 {t('angles_enrolled', 'angles enrolled')}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">{t('attendance_capability_label', 'Attendance & Face ID Capability')}</span>
            <div className="flex items-center space-x-2 pt-0.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className={`text-xs font-bold ${faceCount > 0 ? 'text-purple-300' : 'text-slate-500'}`}>
                {faceCount > 0 ? t('status_ready_active', 'Ready & Active') : t('status_need_enrollment', 'Requires Face Enrollment')}
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
                  {t('personal_info_title', 'Personal Information')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('personal_info_sub', 'Update your display name and contact details')}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('full_name', 'Full Name')} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder={t('placeholder_fullname', 'Full Name')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t('phone', 'Phone Number')}
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
                {t('email', 'Email Address')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  title={t('email_locked_tooltip', 'Email is bound to IAM account (Only admin can change)')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Read-only Enterprise Metadata Grid */}
            <div className="pt-2 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('employee_code', 'Employee Code')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">{userCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('username', 'Username')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">@{currentUser?.username}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('department', 'Department')}</span>
                <span className="text-xs font-semibold text-cyan-300 mt-0.5 block truncate">{deptName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t('position', 'Position')}</span>
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
                    <span>{t('saving', 'Saving information...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('btn_save_profile', 'Save Profile Changes')}</span>
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
                  {t('change_password_title', 'Security & Password Change')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('change_password_sub', 'Protect your account with a secure, complex password')}
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
                {t('current_password', 'Current Password')} *
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
                {t('new_password', 'New Password (Min 6 chars)')} *
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
                {t('confirm_new_password', 'Confirm New Password')} *
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
                    <span>{t('updating_password', 'Updating password...')}</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{t('btn_change_password', 'Update Password')}</span>
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
                    {t('self_verify_modal_title', 'Self-Service Live Face Verification')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('self_verify_modal_sub', 'Position yourself in front of the camera to verify your face against the 512D vectors stored in pgvector')}
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
                    {t('align_face_oval', 'Align face in oval')}
                  </span>
                </div>
              </div>

              {/* Top info badge */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{t('live_webcam_stream', 'Live Webcam Stream')}</span>
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
                        ? (t('self_verify_success_title', '🎉 VERIFICATION SUCCESS: Confidence {percent}%')).replace('{percent}', verifyResult.confidence_percent)
                        : (t('self_verify_fail_title', '❌ VERIFICATION FAILED: Confidence {percent}%')).replace('{percent}', verifyResult.confidence_percent || 0)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                    Sim: {verifyResult.similarity_score || '--'} ({t('lbl_threshold', 'Threshold')}: {verifyResult.threshold || 0.6})
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {verifyResult.is_verified
                    ? (t('verify_success_desc', 'Live face precisely matched profile {name} ({code}). You are all set for automated AI attendance!'))
                        .replace('{name}', verifyResult.full_name || '')
                        .replace('{code}', verifyResult.employee_code || '')
                    : t('verify_fail_desc', 'Face does not match enrolled vectors. Please look straight into the camera and try again.')}
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
                {t('btn_close', 'Close')}
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
                    <span>{t('matching_vectors', 'Matching vectors...')}</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 text-cyan-200" />
                    <span>{t('btn_capture_and_verify', 'Capture & Verify Now')}</span>
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
      {/* ====================================================================== */}
      {/* MODAL 2: SELF-SERVICE 5-ANGLE BIOMETRIC FACE REGISTRATION (512D)       */}
      {/* ====================================================================== */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-700 relative max-h-[90vh] flex flex-col my-auto">
            <button
              onClick={closeEnrollModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{t('self_enroll_modal_title', '5-Angle Biometric Face Registration (512D)')}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('full_name', 'Personnel')}: <strong className="text-white">{profileForm.full_name || currentUser?.full_name || 'User'}</strong> ({t('employee_code', 'Code')}: <span className="font-mono text-indigo-400">{linkedEmployee?.employee_code || currentUser?.username || 'STAFF'}</span>)
                </p>
              </div>
            </div>

            {/* Mode Switcher & Progress */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setEnrollMode('webcam')}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    enrollMode === 'webcam' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('capture_from_camera', 'Direct Camera (Webcam)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEnrollMode('manual_upload')}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    enrollMode === 'manual_upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('upload_from_disk', 'Upload Files From Disk')}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 text-xs">{t('status', 'Progress')}:</span>
                <span className={`font-mono font-bold text-xs ${readyPhotosCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {readyPhotosCount} / 5
                </span>
              </div>
            </div>

            {/* Modal Body: 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
              {/* Left Column (7 cols): Camera Viewport & HUD */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="relative w-full aspect-video bg-black/80 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                  {enrollMode === 'webcam' && (
                    <video
                      ref={enrollVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )}

                  {enrollMode === 'manual_upload' && (
                    <div className="text-center p-6 text-slate-400 space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-indigo-400 opacity-60" />
                      <p className="text-xs">{t('manual_upload_hint', 'Select each angle slot on the right to upload corresponding photo.')}</p>
                    </div>
                  )}

                  {/* Top Floating Active Guidance Header */}
                  {enrollMode === 'webcam' && (
                    <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-center z-20">
                      <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/60 shadow-2xl flex items-center space-x-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-[11px] font-extrabold tracking-wider text-cyan-200 uppercase">
                          {anglesConfig[activeAngleIndex]?.instruction}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Dynamic Pose Guidance Overlay */}
                  {enrollMode === 'webcam' && (
                    <>
                      {anglesConfig[activeAngleIndex]?.guideType === 'center' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-cyan-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                            <div className="w-40 h-56 rounded-[42%] border border-cyan-500/40" />
                            <div className="absolute w-8 h-8 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            </div>
                          </div>
                        </div>
                      )}

                      {anglesConfig[activeAngleIndex]?.guideType === 'left' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
                          <div className="flex flex-col items-center space-y-1.5 animate-bounce bg-purple-950/85 p-3.5 rounded-2xl border-2 border-purple-400 shadow-2xl">
                            <ArrowLeft className="w-8 h-8 text-purple-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_turn_left', 'QUAY TRÁI')}</span>
                          </div>
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-purple-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]" />
                        </div>
                      )}

                      {anglesConfig[activeAngleIndex]?.guideType === 'right' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-blue-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)]" />
                          <div className="flex flex-col items-center space-y-1.5 animate-bounce bg-blue-950/85 p-3.5 rounded-2xl border-2 border-blue-400 shadow-2xl">
                            <ArrowRight className="w-8 h-8 text-blue-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_turn_right', 'QUAY PHẢI')}</span>
                          </div>
                        </div>
                      )}

                      {anglesConfig[activeAngleIndex]?.guideType === 'down' && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-amber-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.4)]" />
                          <div className="absolute bottom-3.5 flex items-center space-x-2 animate-bounce bg-amber-950/85 px-4 py-2 rounded-2xl border-2 border-amber-400 shadow-2xl">
                            <ArrowDown className="w-5 h-5 text-amber-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_tilt_down', 'HƠI CÚI CẰM XUỐNG')}</span>
                          </div>
                        </div>
                      )}

                      {anglesConfig[activeAngleIndex]?.guideType === 'up' && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="absolute top-14 flex items-center space-x-2 animate-bounce bg-emerald-950/85 px-4 py-2 rounded-2xl border-2 border-emerald-400 shadow-2xl">
                            <ArrowUp className="w-5 h-5 text-emerald-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_look_up_smile', 'NGẨNG LÊN & CƯỜI TỰ NHIÊN')}</span>
                          </div>
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-emerald-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Direct Angle Quick Selection Strip */}
                <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                  {anglesConfig.map((angle, idx) => {
                    const isReady = !!anglePhotos[angle.id];
                    const isActive = idx === activeAngleIndex;
                    return (
                      <button
                        type="button"
                        key={angle.id}
                        onClick={() => setActiveAngleIndex(idx)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center space-x-1 ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                            : isReady
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{angle.step}. {angle.badge.split(' ')[0]}</span>
                        {isReady && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Primary Snap Button */}
                {enrollMode === 'webcam' && (
                  <button
                    type="button"
                    onClick={handleSnapCurrentAngle}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xl shadow-indigo-600/30 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {(t('capture_angle_btn', 'Chụp Góc {angle}: {title}'))
                        .replace('{angle}', activeAngleIndex + 1)
                        .replace('{title}', anglesConfig[activeAngleIndex]?.title || '')}
                    </span>
                  </button>
                )}
              </div>

              {/* Right Column (5 cols): 5 Angle Slots */}
              <div className="md:col-span-5 space-y-2.5">
                {anglesConfig.map((angle, idx) => {
                  const isReady = !!anglePhotos[angle.id];
                  const preview = anglePhotos[angle.id];
                  const isActive = idx === activeAngleIndex;

                  return (
                    <div
                      key={angle.id}
                      onClick={() => setActiveAngleIndex(idx)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                          : isReady
                          ? 'bg-slate-900/80 border-emerald-500/40'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {preview ? (
                          <img src={preview} alt="Angle" className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50" />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {angle.step}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-xs text-white truncate">{angle.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">{angle.badge}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <label
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                          title={t('upload_photo_for_slot', 'Upload photo for this angle')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUploadForAngle(e, angle.id)}
                          />
                        </label>

                        {isReady ? (
                          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px]">
                            {angle.step}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Success Banner */}
            {enrollSuccessResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-400 text-white text-xs space-y-1 mt-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{t('enroll_success_title', '5 Vectors Enrolled Successfully!')}</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  {(t('enroll_success_desc', 'Stored {count} biometric vectors in PostgreSQL pgvector repository.'))
                    .replace('{count}', enrollSuccessResult.total_registered || 5)}
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {t('btn_close', 'Close')}
              </button>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-mono">
                  {readyPhotosCount} / 5 {t('angles_ready', 'angles ready')}
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
                      <span>{t('extracting_vectors', 'Extracting vectors...')}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t('btn_extract_and_save_5_vectors', 'Extract & Save 5 Vectors (512D)')}</span>
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
