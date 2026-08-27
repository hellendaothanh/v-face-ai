import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Camera,
  Plus,
  RefreshCw,
  Power,
  MapPin,
  LogIn,
  LogOut,
  ArrowLeftRight,
  Trash2,
  Edit3,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Laptop,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';

const PURPOSE_MAP = {
  CHECK_IN: {
    label: 'Cổng Vào (Check-in)',
    icon: LogIn,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  CHECK_OUT: {
    label: 'Cổng Ra (Check-out)',
    icon: LogOut,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  BOTH: {
    label: 'Hai Chiều (Cả Hai)',
    icon: ArrowLeftRight,
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
};

const RTSP_PRESETS = [
  {
    name: 'FaceTime HD (MacBook)',
    url: '0',
    location: 'Bàn lễ tân / Cửa A',
    purpose: 'CHECK_IN',
  },
  {
    name: 'Tapo C200 (IP RTSP)',
    url: 'rtsp://hautph:H%40utph1983%21%40%23@192.168.1.8:554/stream1',
    location: 'Sảnh chính Tòa nhà',
    purpose: 'BOTH',
  },
  {
    name: 'Hikvision / Dahua (Cổng Ra B)',
    url: 'rtsp://admin:admin123@192.168.1.101:554/stream1',
    location: 'Cổng xuất cảnh - Cửa Ra B',
    purpose: 'CHECK_OUT',
  },
];

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    device_name: '',
    rtsp_url: '',
    location: 'Văn phòng chính',
    purpose: 'CHECK_IN',
    is_active: true,
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getDevices();
      if (res.data) {
        setDevices(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách thiết bị', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Handle Toggle Active/Inactive
  const handleToggle = async (device) => {
    try {
      setTogglingId(device.id);
      const res = await api.toggleDevice(device.id);
      if (res.data) {
        showToast(
          `Thiết bị "${device.device_name}" đã được ${
            res.data.is_active ? 'BẬT (Khởi chạy luồng)' : 'TẮT (Tạm dừng luồng)'
          }.`
        );
        fetchDevices();
      }
    } catch (err) {
      showToast(err.message || 'Không thể đổi trạng thái thiết bị', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Create Device
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.device_name.trim() || !formData.rtsp_url.trim()) {
      showToast('Vui lòng điền đầy đủ tên thiết bị và địa chỉ luồng RTSP', 'error');
      return;
    }

    try {
      await api.createDevice(formData);
      showToast(`Đã thêm camera "${formData.device_name}" thành công!`);
      setShowAddModal(false);
      setFormData({
        device_name: '',
        rtsp_url: '',
        location: 'Văn phòng chính',
        purpose: 'CHECK_IN',
        is_active: true,
      });
      fetchDevices();
    } catch (err) {
      showToast(err.message || 'Lỗi khi thêm thiết bị mới', 'error');
    }
  };

  // Handle Edit Device
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;

    try {
      await api.updateDevice(editingDevice.id, {
        device_name: editingDevice.device_name,
        rtsp_url: editingDevice.rtsp_url,
        location: editingDevice.location,
        purpose: editingDevice.purpose,
        is_active: editingDevice.is_active,
      });
      showToast(`Đã cập nhật camera "${editingDevice.device_name}" thành công!`);
      setShowEditModal(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật thiết bị', 'error');
    }
  };

  // Handle Delete Device
  const handleDelete = async (device) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa camera "${device.device_name}" khỏi hệ thống?`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      showToast(`Đã xóa camera "${device.device_name}" thành công.`);
      fetchDevices();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa thiết bị', 'error');
    }
  };

  const applyPreset = (preset) => {
    setFormData({
      device_name: preset.name,
      rtsp_url: preset.url,
      location: preset.location,
      purpose: preset.purpose,
      is_active: true,
    });
  };

  const activeCount = devices.filter((d) => d.is_active).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-semibold transition-all border ${
            notification.type === 'error'
              ? 'bg-red-950/90 border-red-500/80 text-red-200 shadow-red-500/20'
              : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-emerald-500/20'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center space-x-3">
            <Server className="w-7 h-7 text-indigo-400" />
            <span>Quản Lý Thiết Bị Camera Tập Trung</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý đa luồng (Multi-threading) RTSP & Webcam cho toàn bộ chi nhánh và cửa ra vào.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center space-x-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Camera Mới</span>
          </button>
        </div>
      </div>

      {/* Status Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tổng Thiết Bị Đăng Ký</div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">{devices.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Đang Hoạt Động (Active)</div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{activeCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tạm Dừng (Standby)</div>
            <div className="text-2xl font-extrabold text-slate-400 font-mono mt-1">
              {devices.length - activeCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Camera Grid Cards */}
      {loading && devices.length === 0 ? (
        <div className="py-24 text-center text-slate-500 text-sm space-y-2">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-400" />
          <p>Đang tải danh sách thiết bị camera...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="py-24 text-center glass-panel rounded-3xl border border-slate-800 p-8 space-y-4">
          <Camera className="w-12 h-12 mx-auto text-slate-600" />
          <div className="text-slate-300 font-bold text-base">Chưa có thiết bị camera nào</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bấm nút "Thêm Camera Mới" để cấu hình camera FaceTime trên máy tính hoặc địa chỉ luồng RTSP camera IP.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Camera Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isWebcam = device.rtsp_url === '0' || device.rtsp_url.toLowerCase().includes('webcam');
            const purposeInfo = PURPOSE_MAP[device.purpose] || PURPOSE_MAP.CHECK_IN;
            const PurposeIcon = purposeInfo.icon;
            const isToggling = togglingId === device.id;

            return (
              <div
                key={device.id}
                className={`glass-panel p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  device.is_active
                    ? 'border-indigo-500/40 shadow-xl shadow-indigo-500/5 hover:border-indigo-500/70'
                    : 'border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon + Live Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-2xl border ${
                          device.is_active
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {isWebcam ? <Laptop className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-wide line-clamp-1">
                          {device.device_name}
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{device.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Active/Inactive Live Switch Button */}
                    <button
                      onClick={() => handleToggle(device)}
                      disabled={isToggling}
                      title={device.is_active ? 'Bấm để tắt luồng' : 'Bấm để bật luồng'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        device.is_active ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          device.is_active ? 'translate-x-6' : 'translate-x-1'
                        } ${isToggling ? 'opacity-50' : ''}`}
                      />
                    </button>
                  </div>

                  {/* RTSP Stream URL Codeblock */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 break-all space-y-1">
                    <div className="text-[10px] text-slate-500 font-sans uppercase font-bold tracking-wider">
                      {isWebcam ? 'Thiết bị Video Cục Bộ' : 'Địa chỉ RTSP Stream'}
                    </div>
                    <div className="text-indigo-300 line-clamp-2">{device.rtsp_url}</div>
                  </div>

                  {/* Purpose & Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Purpose Badge */}
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${purposeInfo.color}`}
                    >
                      <PurposeIcon className="w-3.5 h-3.5" />
                      <span>{purposeInfo.label}</span>
                    </span>

                    {/* Active Status Badge */}
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        device.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          device.is_active ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                        }`}
                      />
                      <span>{device.is_active ? 'Đang chạy' : 'Tạm dừng'}</span>
                    </span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Cập nhật: {new Date(device.updated_at).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingDevice(device);
                        setShowEditModal(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                      title="Sửa cấu hình"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(device)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all"
                      title="Xóa camera"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Thêm Camera Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Thêm Thiết Bị Camera Mới</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Chọn cấu hình mẫu nhanh:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {RTSP_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-left transition-all text-xs space-y-1 hover:bg-indigo-950/20"
                  >
                    <div className="font-bold text-slate-200 line-clamp-1">{preset.name}</div>
                    <div className="text-[10px] text-indigo-400 font-mono truncate">{preset.url}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Camera / Thiết Bị *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Camera Cửa Ra Vào Chính"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Địa chỉ RTSP Stream hoặc Chỉ số Webcam (0, 1...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="rtsp://user:pass@192.168.1.100:554/stream1 hoặc 0"
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm font-mono focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhập số <strong>0</strong> nếu dùng webcam máy tính hoặc URL luồng RTSP của Tapo/Hikvision/Dahua.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vị Trí / Chi Nhánh
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tầng 1 - Sảnh chính"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mục Đích Điểm Danh
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                  >
                    <option value="CHECK_IN">Cổng Vào (CHECK_IN)</option>
                    <option value="CHECK_OUT">Cổng Ra (CHECK_OUT)</option>
                    <option value="BOTH">Hai Chiều (BOTH)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                />
                <label htmlFor="is_active_checkbox" className="text-xs text-slate-300 cursor-pointer">
                  Khởi chạy kết nối và phân tích khuôn mặt ngay sau khi lưu
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
                >
                  Lưu & Khởi Chạy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sửa Cấu Hình Camera */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Chỉnh Sửa Thiết Bị Camera</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDevice(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Camera / Thiết Bị *
                </label>
                <input
                  type="text"
                  required
                  value={editingDevice.device_name}
                  onChange={(e) =>
                    setEditingDevice({ ...editingDevice, device_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Địa chỉ RTSP Stream hoặc Chỉ số Webcam *
                </label>
                <input
                  type="text"
                  required
                  value={editingDevice.rtsp_url}
                  onChange={(e) =>
                    setEditingDevice({ ...editingDevice, rtsp_url: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm font-mono focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vị Trí / Chi Nhánh
                  </label>
                  <input
                    type="text"
                    value={editingDevice.location}
                    onChange={(e) =>
                      setEditingDevice({ ...editingDevice, location: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mục Đích Điểm Danh
                  </label>
                  <select
                    value={editingDevice.purpose}
                    onChange={(e) =>
                      setEditingDevice({ ...editingDevice, purpose: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm focus:outline-none transition-colors"
                  >
                    <option value="CHECK_IN">Cổng Vào (CHECK_IN)</option>
                    <option value="CHECK_OUT">Cổng Ra (CHECK_OUT)</option>
                    <option value="BOTH">Hai Chiều (BOTH)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDevice(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
