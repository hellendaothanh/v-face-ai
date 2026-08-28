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
import { useI18n } from '../i18n/I18nContext';

const DeviceManagement = () => {
  const { t } = useI18n();
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
    location: 'Main Office',
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
      showToast(err.message || 'Cannot fetch devices list', 'error');
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
          `Camera "${device.device_name}" ${
            res.data.is_active ? 'STARTED (Worker Active)' : 'STOPPED (Worker Standby)'
          }.`
        );
        fetchDevices();
      }
    } catch (err) {
      showToast(err.message || 'Cannot toggle device status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Create Device
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.device_name.trim() || !formData.rtsp_url.trim()) {
      showToast('Please fill in camera name and stream URL/index', 'error');
      return;
    }

    try {
      await api.createDevice(formData);
      showToast(`Added camera "${formData.device_name}" successfully!`);
      setShowAddModal(false);
      setFormData({
        device_name: '',
        rtsp_url: '',
        location: 'Main Office',
        purpose: 'CHECK_IN',
        is_active: true,
      });
      fetchDevices();
    } catch (err) {
      showToast(err.message || 'Error creating camera device', 'error');
    }
  };

  // Handle Edit Device
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;

    try {
      const payload = {
        device_name: formData.device_name,
        rtsp_url: formData.rtsp_url,
        location: formData.location,
        purpose: formData.purpose,
        is_active: formData.is_active,
      };
      await api.updateDevice(editingDevice.id, payload);
      showToast(`Updated camera "${formData.device_name}" successfully!`);
      setShowEditModal(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      showToast(err.message || 'Error updating camera device', 'error');
    }
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name,
      rtsp_url: device.rtsp_url,
      location: device.location || '',
      purpose: device.purpose,
      is_active: device.is_active,
    });
    setShowEditModal(true);
  };

  const handleDeleteDevice = async (device) => {
    if (window.confirm(`${t('delete_camera_confirm')} (${device.device_name})`)) {
      try {
        await api.deleteDevice(device.id);
        showToast(`Removed camera "${device.device_name}"`);
        fetchDevices();
      } catch (err) {
        showToast(err.message || 'Cannot delete camera device', 'error');
      }
    }
  };

  const PURPOSE_MAP = {
    CHECK_IN: {
      label: t('purpose_checkin'),
      icon: LogIn,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    CHECK_OUT: {
      label: t('purpose_checkout'),
      icon: LogOut,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
    BOTH: {
      label: t('purpose_both'),
      icon: ArrowLeftRight,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    },
  };

  const RTSP_PRESETS = [
    {
      name: 'Camera máy tính (Webcam)',
      url: '0',
      location: 'Reception / Gate A',
      purpose: 'CHECK_IN',
    },
    {
      name: 'Tapo C200 (IP RTSP)',
      url: 'rtsp://hautph:H%40utph1983%21%40%23@192.168.1.8:554/stream1',
      location: 'Main Lobby',
      purpose: 'BOTH',
    },
    {
      name: 'Hikvision / Dahua (Exit Gate B)',
      url: 'rtsp://admin:admin123@192.168.1.101:554/stream1',
      location: 'Customs / Exit B',
      purpose: 'CHECK_OUT',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center space-x-3 transition-all animate-bounce ${
            notification.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-rose-200'
              : 'bg-slate-900 border-indigo-500 text-white'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center space-x-3">
            <Video className="w-7 h-7 text-cyan-400" />
            <span>{t('devices_title')}</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('devices_sub')}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all"
            title={t('refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormData({
                device_name: '',
                rtsp_url: '',
                location: 'Main Office',
                purpose: 'CHECK_IN',
                is_active: true,
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_camera_btn')}</span>
          </button>
        </div>
      </div>

      {/* Devices Grid Cards */}
      {loading && devices.length === 0 ? (
        <div className="py-24 text-center text-slate-500 text-xs space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
          <p>{t('loading')}</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="py-24 glass-panel rounded-3xl border border-slate-800 text-center text-slate-500 text-xs space-y-3">
          <Camera className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-slate-300 font-semibold">{t('no_data')}</p>
          <p className="text-slate-500">{t('devices_sub')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isWebcam = device.rtsp_url === '0' || device.rtsp_url === '1';
            const purposeInfo = PURPOSE_MAP[device.purpose] || PURPOSE_MAP.CHECK_IN;
            const PurposeIcon = purposeInfo.icon;
            const isToggling = togglingId === device.id;

            return (
              <div
                key={device.id}
                className={`glass-panel rounded-3xl p-6 border transition-all duration-300 relative flex flex-col justify-between space-y-5 ${
                  device.is_active
                    ? 'border-slate-800 hover:border-cyan-500/50 shadow-xl'
                    : 'border-slate-800/60 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Card Top: Icon, Device Name, Location */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md flex-shrink-0 ${
                          device.is_active
                            ? isWebcam
                              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                              : 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {isWebcam ? <Laptop className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-white tracking-wide truncate">
                          {device.device_name}
                        </h4>
                        <div className="flex items-center space-x-1 text-xs text-slate-400 truncate mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                          <span className="truncate">{device.location || 'Main Office'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Switch Toggle */}
                    <button
                      onClick={() => handleToggle(device)}
                      disabled={isToggling}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none ${
                        device.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      title={device.is_active ? t('active') : t('standby')}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          device.is_active ? 'translate-x-6' : 'translate-x-1'
                        } ${isToggling ? 'animate-pulse' : ''}`}
                      />
                    </button>
                  </div>

                  {/* RTSP Stream Details */}
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Stream:</span>
                      <span className="font-mono text-cyan-300 font-semibold truncate max-w-[170px]">
                        {device.rtsp_url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('purpose')}:</span>
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${purposeInfo.color}`}
                      >
                        <PurposeIcon className="w-3 h-3" />
                        <span>{purposeInfo.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        device.is_active ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        device.is_active ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {device.is_active ? t('active') : t('standby')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(device)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={t('edit')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Camera */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-700 relative space-y-5">
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {showAddModal ? t('add_camera_btn') : t('edit_camera')}
                </h3>
                <p className="text-xs text-slate-400">{t('devices_sub')}</p>
              </div>
            </div>

            {/* Quick Presets for New Device */}
            {showAddModal && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('quick_presets')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RTSP_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          device_name: p.name,
                          rtsp_url: p.url,
                          location: p.location,
                          purpose: p.purpose,
                        })
                      }
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left text-[11px] text-slate-300 hover:text-white transition-all truncate"
                    >
                      <div className="font-semibold truncate">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={showAddModal ? handleCreateSubmit : handleEditSubmit}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('camera_name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tapo C200 Entrance Gate"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('rtsp_or_index')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="rtsp://user:pass@192.168.1.100:554/stream1 or 0"
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {t('location_branch')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Lobby Gate A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {t('purpose')}
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="CHECK_IN">{t('purpose_checkin')}</option>
                    <option value="CHECK_OUT">{t('purpose_checkout')}</option>
                    <option value="BOTH">{t('purpose_both')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="device-is-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
                />
                <label htmlFor="device-is-active" className="text-slate-300 font-medium cursor-pointer">
                  {t('active')}
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/30 transition-all"
                >
                  {t('save')}
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
