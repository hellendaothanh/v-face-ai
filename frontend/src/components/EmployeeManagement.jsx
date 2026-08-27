import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UserPlus, 
  Upload, 
  Search, 
  Trash2, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Camera,
  Aperture,
  Video,
  Laptop,
  HelpCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  RotateCcw,
  Zap,
  Target,
  Compass
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

// Helper to convert base64 data URI to File
const base64ToFile = (dataUrl, filename) => {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error('Failed to convert base64 to file:', e);
    return null;
  }
};

const EmployeeManagement = () => {
  const { t } = useI18n();

  // Dynamic 5 Face Angles Configuration
  const FACE_ANGLES = [
    {
      id: 'straight',
      step: 1,
      title: t('angle_1_title'),
      desc: t('angle_1_desc'),
      badge: t('angle_1_badge'),
      icon: Target,
    },
    {
      id: 'left',
      step: 2,
      title: t('angle_2_title'),
      desc: t('angle_2_desc'),
      badge: t('angle_2_badge'),
      icon: ArrowLeft,
    },
    {
      id: 'right',
      step: 3,
      title: t('angle_3_title'),
      desc: t('angle_3_desc'),
      badge: t('angle_3_badge'),
      icon: ArrowRight,
    },
    {
      id: 'down',
      step: 4,
      title: t('angle_4_title'),
      desc: t('angle_4_desc'),
      badge: t('angle_4_badge'),
      icon: ArrowDown,
    },
    {
      id: 'up_smile',
      step: 5,
      title: t('angle_5_title'),
      desc: t('angle_5_desc'),
      badge: t('angle_5_badge'),
      icon: ArrowUp,
    },
  ];

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Add Employee Form State
  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone_number: '',
    department: '',
    position: '',
    is_active: true,
  });
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [formError, setFormError] = useState('');

  // 5-Angle Multi-Template Registration State
  const [angleFiles, setAngleFiles] = useState({});
  const [anglePreviews, setAnglePreviews] = useState({});
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [regMode, setRegMode] = useState('backend_cam'); // 'backend_cam' | 'manual_upload' | 'browser_webrtc'
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [isUploadingFaces, setIsUploadingFaces] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // WebRTC Browser Camera States (Fallback option)
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
      });
      if (res.data) {
        setEmployees(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Start Browser WebRTC Camera
  const startWebcam = async () => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Webcam access error:', err);
      setCameraError('Camera access denied or webcam in use by another application.');
      setIsCameraActive(false);
    }
  };

  // Stop Browser WebRTC Camera
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Open 5-Angle Face Register Modal
  const openRegisterModal = (emp) => {
    setSelectedEmployee(emp);
    setAngleFiles({});
    setAnglePreviews({});
    setActiveAngleIndex(0);
    setUploadResult(null);
    setRegMode('backend_cam'); // Default to backend camera stream (ZERO permission conflicts)
    setIsUploadModalOpen(true);
  };

  // Close Face Register Modal
  const closeRegisterModal = () => {
    stopWebcam();
    setIsUploadModalOpen(false);
  };

  // 1. Primary Capture: Snap from Backend Stream
  const handleCaptureBackendSnapshot = async () => {
    if (isCapturingSnapshot) return;
    setIsCapturingSnapshot(true);

    const currentAngle = FACE_ANGLES[activeAngleIndex];
    try {
      const res = await api.captureLiveSnapshot();
      if (res.data?.image_base64) {
        const filename = `angle_${currentAngle.step}_${currentAngle.id}_${Date.now()}.jpg`;
        const file = base64ToFile(res.data.image_base64, filename);
        if (file) {
          setAngleFiles((prev) => ({ ...prev, [currentAngle.id]: file }));
          setAnglePreviews((prev) => ({ ...prev, [currentAngle.id]: res.data.image_base64 }));
          setUploadResult(null);

          // Auto advance to next unfilled angle
          const nextUnfilled = FACE_ANGLES.findIndex(
            (a, idx) => idx > activeAngleIndex && !angleFiles[a.id]
          );
          if (nextUnfilled !== -1) {
            setActiveAngleIndex(nextUnfilled);
          } else {
            const firstUnfilled = FACE_ANGLES.findIndex((a) => !angleFiles[a.id] && a.id !== currentAngle.id);
            if (firstUnfilled !== -1) {
              setActiveAngleIndex(firstUnfilled);
            }
          }
        }
      }
    } catch (err) {
      alert(`Capture failed: ${err.message}`);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // 2. Secondary Capture: WebRTC Browser Camera Snap
  const handleCaptureWebRTCAngle = () => {
    if (!videoRef.current || !isCameraActive) return;

    const currentAngle = FACE_ANGLES[activeAngleIndex];
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    // Mirror horizontally
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const filename = `angle_${currentAngle.step}_${currentAngle.id}_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      setAngleFiles((prev) => ({ ...prev, [currentAngle.id]: file }));
      setAnglePreviews((prev) => ({ ...prev, [currentAngle.id]: url }));
      setUploadResult(null);

      const nextUnfilled = FACE_ANGLES.findIndex(
        (a, idx) => idx > activeAngleIndex && !angleFiles[a.id]
      );
      if (nextUnfilled !== -1) {
        setActiveAngleIndex(nextUnfilled);
      } else {
        const firstUnfilled = FACE_ANGLES.findIndex((a) => !angleFiles[a.id] && a.id !== currentAngle.id);
        if (firstUnfilled !== -1) {
          setActiveAngleIndex(firstUnfilled);
        }
      }
    }, 'image/jpeg', 0.95);
  };

  // Handle individual file input for a specific angle
  const handleFileChangeForAngle = (angleId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAngleFiles((prev) => ({ ...prev, [angleId]: file }));
    setAnglePreviews((prev) => ({ ...prev, [angleId]: url }));
    setUploadResult(null);
  };

  // Remove photo for a specific angle
  const handleRemoveAnglePhoto = (angleId) => {
    setAngleFiles((prev) => {
      const copy = { ...prev };
      delete copy[angleId];
      return copy;
    });
    setAnglePreviews((prev) => {
      const copy = { ...prev };
      delete copy[angleId];
      return copy;
    });
  };

  // Count ready photos
  const readyPhotosCount = Object.keys(angleFiles).length;
  const isAllAnglesReady = readyPhotosCount === 5;

  // Submit all 5 photos to Backend via single FormData
  const handleSave5AnglesFaceVectors = async () => {
    if (!isAllAnglesReady || !selectedEmployee) return;
    setIsUploadingFaces(true);
    setUploadResult(null);

    const formData = new FormData();
    FACE_ANGLES.forEach((angle) => {
      const file = angleFiles[angle.id];
      if (file) {
        formData.append('images', file);
      }
    });

    try {
      const res = await api.registerFace(selectedEmployee.id, formData);
      setUploadResult({
        success: res.success,
        message: res.message,
        data: res.data,
      });
      fetchEmployees();
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.message || 'Face vector registration failed.',
      });
    } finally {
      setIsUploadingFaces(false);
    }
  };

  // Create Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmittingEmployee(true);
    try {
      await api.createEmployee(newEmployee);
      setIsAddModalOpen(false);
      setNewEmployee({
        employee_code: '',
        full_name: '',
        email: '',
        phone_number: '',
        department: '',
        position: '',
        is_active: true,
      });
      fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Cannot create employee.');
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp) => {
    if (window.confirm(`${t('delete_employee_confirm')} (${emp.full_name})`)) {
      try {
        await api.deleteEmployee(emp.id);
        fetchEmployees();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('search_employee_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEmployees}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('add_employee')}</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">{t('employee_code')}</th>
                <th className="py-4 px-6">{t('full_name')}</th>
                <th className="py-4 px-6">{t('department')} / {t('position')}</th>
                <th className="py-4 px-6">{t('email')} / {t('phone')}</th>
                <th className="py-4 px-6 text-center">{t('registered_faces')}</th>
                <th className="py-4 px-6 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>{t('loading')}</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    {t('no_data')}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-4 px-6 font-mono font-bold text-white">
                      {emp.employee_code}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{emp.full_name}</div>
                      <div className="text-xs text-slate-400">ID: {emp.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-200">{emp.department}</div>
                      <div className="text-xs text-slate-400">{emp.position}</div>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <div className="text-slate-300">{emp.email}</div>
                      <div className="text-slate-400">{emp.phone_number || '---'}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {emp.registered_faces_count >= 5 ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{emp.registered_faces_count} / 5</span>
                        </span>
                      ) : emp.registered_faces_count > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{emp.registered_faces_count} 512D</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{t('no_faces_registered')}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openRegisterModal(emp)}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{t('register_face_btn')}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{t('total_employees')}: <strong className="text-white">{total}</strong></span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              {t('previous_page')}
            </button>
            <span>{t('page')} {page} {t('of')} {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              {t('next_page')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Add New Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-700 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('create_employee_modal_title')}</h3>
                <p className="text-xs text-slate-400">{t('header_employees_sub')}</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('employee_code_label')} *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.employee_code}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employee_code: e.target.value.toUpperCase() })}
                    placeholder="VD: EMP001"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('full_name_label')} *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('email_label')} *</label>
                  <input
                    type="email"
                    required
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('phone')}</label>
                  <input
                    type="text"
                    value={newEmployee.phone_number}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone_number: e.target.value })}
                    placeholder="0987654321"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('department_label')} *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="Engineering / IT"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('position_label')} *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="Senior AI Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmployee}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingEmployee && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('create_employee_btn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: 5-Angle Multi-Template Face Registration */}
      {isUploadModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-700 relative max-h-[90vh] flex flex-col my-auto">
            <button
              onClick={closeRegisterModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{t('photo_registration_modal_title')}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('table_header_employee')}: <strong className="text-white">{selectedEmployee.full_name}</strong> ({t('employee_code')}: <span className="font-mono text-indigo-400">{selectedEmployee.employee_code}</span>)
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex space-x-1">
                {/* Method 1: Backend Stream Snapshot */}
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('backend_cam');
                    stopWebcam();
                  }}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    regMode === 'backend_cam'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('capture_from_camera')}</span>
                </button>

                {/* Method 2: Manual Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('manual_upload');
                    stopWebcam();
                  }}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    regMode === 'manual_upload'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('upload_from_disk')}</span>
                </button>
              </div>

              {/* Progress Count Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 text-xs">{t('status')}:</span>
                <span className={`font-mono font-bold text-xs ${isAllAnglesReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {readyPhotosCount} / 5
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {/* Method 1: Backend Live Stream Snapshot */}
              {regMode === 'backend_cam' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl">
                      <img
                        src="http://localhost:8000/api/v1/camera/video_feed"
                        alt="Live Backend Feed"
                        className="w-full h-full object-cover"
                      />

                      {/* HUD Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5">
                        <div className="flex justify-between items-start z-10">
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-600/90 text-white backdrop-blur-md shadow-lg flex items-center space-x-1.5 border border-indigo-400/40">
                            {React.createElement(FACE_ANGLES[activeAngleIndex].icon, { className: "w-3.5 h-3.5 text-indigo-200" })}
                            <span>{FACE_ANGLES[activeAngleIndex].title}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/70 text-slate-200 backdrop-blur-md border border-slate-700">
                            {activeAngleIndex + 1} / 5
                          </span>
                        </div>

                        <div className="text-center z-10">
                          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-black/85 text-emerald-300 backdrop-blur-md border border-emerald-500/30 shadow-lg inline-flex items-center space-x-1.5">
                            <Compass className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{FACE_ANGLES[activeAngleIndex].desc}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                      <div className="text-xs text-slate-300 min-w-0">
                        <div className="font-semibold text-white truncate">{FACE_ANGLES[activeAngleIndex].title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{FACE_ANGLES[activeAngleIndex].desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCaptureBackendSnapshot}
                        disabled={isCapturingSnapshot}
                        className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                      >
                        {isCapturingSnapshot ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Aperture className="w-4 h-4" />
                        )}
                        <span>{t('snap_this_angle')}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5 Angles Slots */}
                  <div className="lg:col-span-5 space-y-2">
                    {FACE_ANGLES.map((angle, idx) => {
                      const hasPhoto = !!angleFiles[angle.id];
                      const isActive = activeAngleIndex === idx;

                      return (
                        <div
                          key={angle.id}
                          onClick={() => setActiveAngleIndex(idx)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                            isActive
                              ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                              : hasPhoto
                              ? 'bg-slate-900/70 border-emerald-500/40 hover:border-emerald-500/70'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 flex items-center justify-center relative">
                            {hasPhoto ? (
                              <img
                                src={anglePreviews[angle.id]}
                                alt={angle.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              React.createElement(angle.icon, { className: "w-5 h-5 text-slate-400" })
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">{angle.title}</span>
                              {hasPhoto && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{angle.desc}</div>
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {hasPhoto ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAnglePhoto(angle.id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title={t('delete_photo_angle')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                {t('step_missing')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Method 2: Manual Upload */}
              {regMode === 'manual_upload' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                    <span>{t('photo_registration_sub')}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {FACE_ANGLES.map((angle) => {
                      const hasPhoto = !!angleFiles[angle.id];

                      return (
                        <div
                          key={angle.id}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                            hasPhoto
                              ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg'
                              : 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                                {React.createElement(angle.icon, { className: "w-3.5 h-3.5 text-indigo-400" })}
                                <span>{angle.badge}</span>
                              </span>
                              {hasPhoto && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mb-3 line-clamp-2">{angle.desc}</p>
                          </div>

                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center relative group mb-3">
                            {hasPhoto ? (
                              <>
                                <img
                                  src={anglePreviews[angle.id]}
                                  alt={angle.title}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAnglePhoto(angle.id)}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                  title={t('delete')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <label
                                htmlFor={`upload-${angle.id}`}
                                className="cursor-pointer flex flex-col items-center justify-center p-3 text-center space-y-1 w-full h-full hover:bg-slate-900/60 transition-colors"
                              >
                                <Upload className="w-5 h-5 text-indigo-400" />
                                <span className="text-[10px] text-indigo-300 font-semibold">{t('upload_from_disk')}</span>
                              </label>
                            )}

                            <input
                              type="file"
                              id={`upload-${angle.id}`}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => handleFileChangeForAngle(angle.id, e)}
                              className="hidden"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload Result Feedback */}
              {uploadResult && (
                <div
                  className={`p-4 rounded-2xl text-xs space-y-2 animate-fade-in ${
                    uploadResult.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {uploadResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>{uploadResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 flex-shrink-0">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>512D ArcFace vectors indexed via pgvector HNSW.</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={closeRegisterModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  {t('close')}
                </button>

                <button
                  type="button"
                  onClick={handleSave5AnglesFaceVectors}
                  disabled={!isAllAnglesReady || isUploadingFaces}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xl transition-all ${
                    isAllAnglesReady
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  {isUploadingFaces ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{t('extracting_vectors')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{t('save_and_extract_vectors')} ({readyPhotosCount}/5)</span>
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

export default EmployeeManagement;
