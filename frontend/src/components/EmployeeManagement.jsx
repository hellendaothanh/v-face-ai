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

// 5 Face Angles Configuration
const FACE_ANGLES = [
  {
    id: 'straight',
    step: 1,
    title: '1. Ảnh trực diện',
    desc: 'Nhìn thẳng vào camera, biểu cảm tự nhiên',
    badge: 'Chính diện',
    icon: Target,
  },
  {
    id: 'left',
    step: 2,
    title: '2. Nghiêng trái nhẹ',
    desc: 'Quay mặt sang trái góc nhẹ (15° - 20°)',
    badge: 'Nghiêng trái 15°',
    icon: ArrowLeft,
  },
  {
    id: 'right',
    step: 3,
    title: '3. Nghiêng phải nhẹ',
    desc: 'Quay mặt sang phải góc nhẹ (15° - 20°)',
    badge: 'Nghiêng phải 15°',
    icon: ArrowRight,
  },
  {
    id: 'down',
    step: 4,
    title: '4. Cúi đầu nhẹ',
    desc: 'Hơi cúi cằm xuống một góc nhỏ',
    badge: 'Cúi nhẹ',
    icon: ArrowDown,
  },
  {
    id: 'up_smile',
    step: 5,
    title: '5. Ngửa mặt / Cười',
    desc: 'Hơi ngước cằm lên hoặc mỉm cười nhẹ',
    badge: 'Ngửa / Cười',
    icon: ArrowUp,
  },
];

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
  // angleFiles: { straight: File, left: File, right: File, down: File, up_smile: File }
  const [angleFiles, setAngleFiles] = useState({});
  const [anglePreviews, setAnglePreviews] = useState({});
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [regMode, setRegMode] = useState('backend_cam'); // 'backend_cam' (No browser permission needed) | 'manual_upload' | 'browser_webrtc'
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
      setCameraError('Trình duyệt đang chặn quyền Camera hoặc Camera đang bị ứng dụng khác sử dụng.');
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

  // 1. Primary Capture: Snap from Backend Stream (MacBook M4 or Tapo C200)
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
      alert(`Không thể chụp từ camera backend: ${err.message}`);
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
        message: err.message || 'Lỗi khi trích xuất vector khuôn mặt.',
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
      setFormError(err.message || 'Không thể tạo nhân viên.');
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${emp.full_name} (${emp.employee_code})?`)) {
      try {
        await api.deleteEmployee(emp.id);
        fetchEmployees();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
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
            placeholder="Tìm kiếm theo tên, mã NV, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEmployees}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Nhân Viên Mới</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">Mã NV</th>
                <th className="py-4 px-6">Họ và Tên</th>
                <th className="py-4 px-6">Phòng ban / Vị trí</th>
                <th className="py-4 px-6">Email / Điện thoại</th>
                <th className="py-4 px-6 text-center">Vector Đa Mẫu</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Đang tải danh sách nhân viên...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    Không tìm thấy nhân viên nào.
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
                          <span>{emp.registered_faces_count} Mẫu (Tối ưu 5 góc)</span>
                        </span>
                      ) : emp.registered_faces_count > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{emp.registered_faces_count} Vector 512D</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Chưa có mẫu</span>
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
                          <span>Đăng Ký 5 Góc Mặt</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Xóa nhân viên"
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
          <span>Tổng số nhân viên: <strong className="text-white">{total}</strong></span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Trước
            </button>
            <span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Sau
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
                <h3 className="text-lg font-bold text-white">Thêm Nhân Viên Mới</h3>
                <p className="text-xs text-slate-400">Nhập thông tin định danh nhân viên</p>
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
                  <label className="block text-slate-300 font-medium mb-1">Mã Nhân Viên *</label>
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
                  <label className="block text-slate-300 font-medium mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Công Việc *</label>
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
                  <label className="block text-slate-300 font-medium mb-1">Số Điện Thoại</label>
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
                  <label className="block text-slate-300 font-medium mb-1">Phòng Ban *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="VD: Phòng Kỹ Thuật"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vị Trí / Chức Danh *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="VD: Senior AI Engineer"
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
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmployee}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingEmployee && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Nhân Viên</span>
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
                  <span>Đăng Ký Khuôn Mặt Đa Mẫu (Kịch Bản 5 Góc)</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Tối ưu Camera Tapo C200
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nhân viên: <strong className="text-white">{selectedEmployee.full_name}</strong> (Mã NV: <span className="font-mono text-indigo-400">{selectedEmployee.employee_code}</span>)
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex space-x-1">
                {/* Method 1: Backend Stream Snapshot (Zero Browser Permission Issue!) */}
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
                  <span>Chụp Luồng Camera Máy (Khuyên dùng)</span>
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
                  <span>Tải Lên 5 File Ảnh</span>
                </button>

                {/* Method 3: Browser WebRTC */}
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('browser_webrtc');
                    startWebcam();
                  }}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    regMode === 'browser_webrtc'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Webcam Trình Duyệt</span>
                </button>
              </div>

              {/* Progress Count Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 text-xs">Tiến độ:</span>
                <span className={`font-mono font-bold text-xs ${isAllAnglesReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {readyPhotosCount} / 5 góc ảnh
                </span>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {/* Method 1: Backend Live Stream Snapshot (No Browser Permission Issues!) */}
              {regMode === 'backend_cam' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Backend Live Stream Viewfinder */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl">
                      <img
                        src="http://localhost:8000/api/v1/camera/video_feed"
                        alt="Live Backend Feed"
                        className="w-full h-full object-cover"
                      />

                      {/* Dynamic Directional Arrows & HUD Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5">
                        {/* Top Bar Indicator */}
                        <div className="flex justify-between items-start z-10">
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-600/90 text-white backdrop-blur-md shadow-lg flex items-center space-x-1.5 border border-indigo-400/40">
                            {React.createElement(FACE_ANGLES[activeAngleIndex].icon, { className: "w-3.5 h-3.5 text-indigo-200" })}
                            <span>{FACE_ANGLES[activeAngleIndex].title}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/70 text-slate-200 backdrop-blur-md border border-slate-700">
                            Góc {activeAngleIndex + 1} / 5
                          </span>
                        </div>

                        {/* Center Interactive Directional Guidance & Arrows */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {/* 1. Straight Angle */}
                          {FACE_ANGLES[activeAngleIndex].id === 'straight' && (
                            <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-[60px] border-2 border-dashed border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)] flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-emerald-400 rounded-full animate-ping opacity-40" />
                              <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black shadow-lg flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>NHÌN THẲNG CHÍNH DIỆN</span>
                              </div>
                            </div>
                          )}

                          {/* 2. Turn Left Angle (15-20 deg) */}
                          {FACE_ANGLES[activeAngleIndex].id === 'left' && (
                            <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-[60px] border-2 border-dashed border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.35)] flex items-center justify-center">
                              {/* Glowing Left Arrow */}
                              <div className="absolute -left-12 sm:-left-16 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 animate-pulse">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-indigo-600 border-2 border-indigo-300 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/80 animate-bounce">
                                  <ArrowLeft className="w-6 h-6 stroke-[3]" />
                                </div>
                                <div className="bg-indigo-950/90 border border-indigo-400 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black text-indigo-200 shadow-xl whitespace-nowrap">
                                  XOAY TRÁI 15°
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. Turn Right Angle (15-20 deg) */}
                          {FACE_ANGLES[activeAngleIndex].id === 'right' && (
                            <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-[60px] border-2 border-dashed border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.35)] flex items-center justify-center">
                              {/* Glowing Right Arrow */}
                              <div className="absolute -right-12 sm:-right-16 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 animate-pulse">
                                <div className="bg-cyan-950/90 border border-cyan-400 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black text-cyan-200 shadow-xl whitespace-nowrap">
                                  XOAY PHẢI 15°
                                </div>
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-cyan-600 border-2 border-cyan-300 text-white flex items-center justify-center shadow-2xl shadow-cyan-500/80 animate-bounce">
                                  <ArrowRight className="w-6 h-6 stroke-[3]" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. Tilt Down Angle */}
                          {FACE_ANGLES[activeAngleIndex].id === 'down' && (
                            <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-[60px] border-2 border-dashed border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center">
                              {/* Glowing Down Arrow */}
                              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 animate-pulse">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500 border-2 border-amber-200 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/80 animate-bounce">
                                  <ArrowDown className="w-5 h-5 stroke-[3]" />
                                </div>
                                <div className="bg-amber-950/90 border border-amber-400 px-2.5 py-0.5 rounded-lg text-[10px] font-black text-amber-200 shadow-xl whitespace-nowrap">
                                  CÚI NHẸ ĐẦU XUỐNG
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. Tilt Up / Smile Angle */}
                          {FACE_ANGLES[activeAngleIndex].id === 'up_smile' && (
                            <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-[60px] border-2 border-dashed border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.35)] flex items-center justify-center">
                              {/* Glowing Up Arrow */}
                              <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 animate-pulse">
                                <div className="bg-purple-950/90 border border-purple-400 px-2.5 py-0.5 rounded-lg text-[10px] font-black text-purple-200 shadow-xl whitespace-nowrap">
                                  NGỬA CẰM LÊN / CƯỜI NHẸ
                                </div>
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 border-2 border-purple-300 text-white flex items-center justify-center shadow-2xl shadow-purple-500/80 animate-bounce">
                                  <ArrowUp className="w-5 h-5 stroke-[3]" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Guide Prompt */}
                        <div className="text-center z-10">
                          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-black/85 text-emerald-300 backdrop-blur-md border border-emerald-500/30 shadow-lg inline-flex items-center space-x-1.5">
                            <Compass className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{FACE_ANGLES[activeAngleIndex].desc}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Snapshot Button */}
                    <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                      <div className="text-xs text-slate-300 min-w-0">
                        <div className="font-semibold text-white truncate">Đang chụp: {FACE_ANGLES[activeAngleIndex].title}</div>
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
                        <span>Chụp Góc Này</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: 5 Angle Progress Slots */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Trạng thái 5 góc mặt:
                    </div>
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
                          {/* Thumbnail / Placeholder */}
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

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">{angle.title}</span>
                              {hasPhoto && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{angle.desc}</div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {hasPhoto ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAnglePhoto(angle.id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Xóa ảnh góc này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                Chưa có
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Method 2: Manual 5-Angle File Upload Mode */}
              {regMode === 'manual_upload' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                    <span>
                      Vui lòng chọn đủ 5 ảnh chân dung rõ nét theo từng góc độ để AI nhận diện góc nghiêng & cúi đầu chính xác nhất trên Camera Tapo C200.
                    </span>
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

                          {/* Image Dropzone / Preview */}
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
                                  title="Xóa ảnh"
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
                                <span className="text-[10px] text-indigo-300 font-semibold">Chọn file ảnh</span>
                                <span className="text-[9px] text-slate-500">JPG, PNG, WEBP</span>
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

                          {/* Re-pick button if has photo */}
                          {hasPhoto && (
                            <label
                              htmlFor={`upload-${angle.id}`}
                              className="cursor-pointer text-center py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition-colors"
                            >
                              Đổi ảnh khác
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Method 3: Browser WebRTC Camera View */}
              {regMode === 'browser_webrtc' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
                      />

                      {!isCameraActive && (
                        <div className="text-center p-6 space-y-3 max-w-md">
                          <Camera className="w-10 h-10 text-rose-400 mx-auto" />
                          <div className="text-xs font-semibold text-rose-300">{cameraError}</div>
                          <div className="text-[11px] text-slate-400 bg-slate-900 p-3 rounded-xl border border-slate-800 text-left space-y-1">
                            <div className="font-bold text-slate-300 flex items-center space-x-1">
                              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Gợi ý khắc phục:</span>
                            </div>
                            <div>1. Bấm vào biểu tượng <strong>Ổ khóa / Camera</strong> trên thanh địa chỉ URL $\rightarrow$ <strong>Cho phép (Allow)</strong>.</div>
                            <div>2. Hoặc chuyển sang tab <strong>"Chụp Luồng Camera Máy"</strong> ở trên để chụp trực tiếp không cần cấp quyền trình duyệt!</div>
                          </div>
                          <button
                            onClick={startWebcam}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-xs text-white hover:bg-indigo-500 font-semibold shadow-md"
                          >
                            Thử Lại
                          </button>
                        </div>
                      )}
                    </div>

                    {isCameraActive && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleCaptureWebRTCAngle}
                          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                        >
                          <Aperture className="w-4 h-4" />
                          <span>Chụp Góc Này</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Trạng thái 5 góc:
                    </div>
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
                              ? 'bg-slate-900/70 border-emerald-500/40'
                              : 'bg-slate-900/40 border-slate-800'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                            {hasPhoto ? (
                              <img src={anglePreviews[angle.id]} alt={angle.title} className="w-full h-full object-cover" />
                            ) : (
                              React.createElement(angle.icon, { className: "w-4 h-4 text-slate-400" })
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-xs font-bold text-white truncate">
                            {angle.title}
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

                  {uploadResult.data?.results && (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-emerald-500/20">
                      {uploadResult.data.results.map((res, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-xl bg-black/40 border border-slate-800 text-[11px] space-y-0.5"
                        >
                          <div className="font-semibold text-white truncate">Góc #{i + 1}</div>
                          <div className={res.success ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            {res.success ? '✔ Trích xuất 512D' : '✖ Thất bại'}
                          </div>
                          {res.blur_score !== null && res.blur_score !== undefined && (
                            <div className="text-slate-400 text-[10px]">
                              Độ nét: <strong className="text-slate-200">{res.blur_score}</strong>
                            </div>
                          )}
                          {res.detection_score && (
                            <div className="text-slate-400 text-[10px]">
                              AI Score: <strong className="text-slate-200">{(res.detection_score * 100).toFixed(1)}%</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 flex-shrink-0">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>5 Vector được lưu độc lập trên PostgreSQL HNSW index.</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={closeRegisterModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Đóng
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
                      <span>Đang trích xuất 5 Vector 512D...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isAllAnglesReady
                          ? 'Gửi Dữ Liệu & Lưu 5 Vector Mẫu'
                          : `Cần đủ 5 ảnh (${readyPhotosCount}/5)`}
                      </span>
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
