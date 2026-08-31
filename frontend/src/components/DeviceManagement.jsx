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
  X,
  Building2,
  Wifi,
  Navigation,
  Globe,
  Radio,
  ExternalLink,
  Copy
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const DeviceManagement = () => {
  const { t } = useI18n();

  // Active Main Tab: 'cameras' | 'offices'
  const [activeMainTab, setActiveMainTab] = useState('cameras');

  // --- CAMERA DEVICES STATE ---
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [formData, setFormData] = useState({
    device_name: '',
    rtsp_url: '',
    location: 'Main Office',
    purpose: 'CHECK_IN',
    is_active: true,
  });

  // --- OFFICE LOCATIONS & GEOFENCING STATE ---
  const [offices, setOffices] = useState([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [myIp, setMyIp] = useState('');
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [officeFormData, setOfficeFormData] = useState({
    name: '',
    address: '',
    latitude: 21.0285,
    longitude: 105.8542,
    radius_meters: 500,
    public_ips: [],
    wifi_bssids: [],
    is_active: true,
  });
  const [newIpInput, setNewIpInput] = useState('');
  const [newBssidInput, setNewBssidInput] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- FETCH CAMERAS ---
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const res = await api.getDevices();
      if (res.data) {
        setDevices(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Cannot fetch devices list', 'error');
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // --- FETCH OFFICES & CLIENT IP ---
  const fetchOffices = useCallback(async () => {
    try {
      setLoadingOffices(true);
      const [resOffices, resIp] = await Promise.allSettled([
        api.getOffices(),
        api.getMyIp(),
      ]);

      if (resOffices.status === 'fulfilled' && resOffices.value?.data) {
        setOffices(resOffices.value.data);
      }
      if (resIp.status === 'fulfilled' && resIp.value?.data?.client_ip) {
        setMyIp(resIp.value.data.client_ip);
      }
    } catch (err) {
      showToast(err.message || 'Cannot fetch offices data', 'error');
    } finally {
      setLoadingOffices(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchOffices();
  }, [fetchDevices, fetchOffices]);

  // --- CAMERA HANDLERS ---
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

  const handleCreateDeviceSubmit = async (e) => {
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

  const handleEditDeviceSubmit = async (e) => {
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

  // --- OFFICE LOCATION HANDLERS ---
  const handleOpenAddOffice = () => {
    setEditingOffice(null);
    setOfficeFormData({
      name: '',
      address: '',
      latitude: 21.0285,
      longitude: 105.8542,
      radius_meters: 500,
      public_ips: myIp ? [myIp] : [],
      wifi_bssids: [],
      is_active: true,
    });
    setNewIpInput('');
    setNewBssidInput('');
    setShowOfficeModal(true);
  };

  const handleOpenEditOffice = (office) => {
    setEditingOffice(office);
    setOfficeFormData({
      name: office.name,
      address: office.address || '',
      latitude: office.latitude,
      longitude: office.longitude,
      radius_meters: office.radius_meters,
      public_ips: Array.isArray(office.public_ips) ? [...office.public_ips] : [],
      wifi_bssids: Array.isArray(office.wifi_bssids) ? [...office.wifi_bssids] : [],
      is_active: office.is_active,
    });
    setNewIpInput('');
    setNewBssidInput('');
    setShowOfficeModal(true);
  };

  const handleSaveOfficeSubmit = async (e) => {
    e.preventDefault();
    if (!officeFormData.name.trim()) {
      showToast('Vui lòng nhập tên văn phòng / chi nhánh', 'error');
      return;
    }

    try {
      if (editingOffice) {
        await api.updateOffice(editingOffice.id, officeFormData);
        showToast(`Cập nhật văn phòng "${officeFormData.name}" thành công!`);
      } else {
        await api.createOffice(officeFormData);
        showToast(`Thêm văn phòng "${officeFormData.name}" thành công!`);
      }
      setShowOfficeModal(false);
      fetchOffices();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu thông tin văn phòng', 'error');
    }
  };

  const handleDeleteOffice = async (office) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa văn phòng "${office.name}"?`)) {
      try {
        await api.deleteOffice(office.id);
        showToast(`Đã xóa văn phòng "${office.name}"`);
        fetchOffices();
      } catch (err) {
        showToast(err.message || 'Không thể xóa văn phòng', 'error');
      }
    }
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt của bạn không hỗ trợ định vị GPS', 'error');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficeFormData((prev) => ({
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
        }));
        setIsGettingGps(false);
        showToast('Đã lấy tọa độ GPS thực tế từ thiết bị của bạn!');
      },
      (error) => {
        setIsGettingGps(false);
        showToast(`Không thể lấy vị trí GPS: ${error.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddIpTag = () => {
    const ip = newIpInput.trim();
    if (!ip) return;
    if (officeFormData.public_ips.includes(ip)) {
      showToast('Địa chỉ IP này đã tồn tại trong danh sách', 'error');
      return;
    }
    setOfficeFormData((prev) => ({
      ...prev,
      public_ips: [...prev.public_ips, ip],
    }));
    setNewIpInput('');
  };

  const handleRemoveIpTag = (ipToRemove) => {
    setOfficeFormData((prev) => ({
      ...prev,
      public_ips: prev.public_ips.filter((ip) => ip !== ipToRemove),
    }));
  };

  const handleAddBssidTag = () => {
    const bssid = newBssidInput.trim();
    if (!bssid) return;
    if (officeFormData.wifi_bssids.includes(bssid)) {
      showToast('Mã BSSID/SSID này đã tồn tại', 'error');
      return;
    }
    setOfficeFormData((prev) => ({
      ...prev,
      wifi_bssids: [...prev.wifi_bssids, bssid],
    }));
    setNewBssidInput('');
  };

  const handleRemoveBssidTag = (bssidToRemove) => {
    setOfficeFormData((prev) => ({
      ...prev,
      wifi_bssids: prev.wifi_bssids.filter((b) => b !== bssidToRemove),
    }));
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
      url: 'rtsp://admin:password@192.168.1.100:554/stream1',
      location: 'Main Lobby',
      purpose: 'BOTH',
    },
    {
      name: 'Hikvision / Dahua (Exit Gate B)',
      url: 'rtsp://admin:password@192.168.1.101:554/stream1',
      location: 'Exit Gate B',
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

      {/* Main Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center space-x-3">
            {activeMainTab === 'cameras' ? (
              <Video className="w-7 h-7 text-cyan-400" />
            ) : (
              <Building2 className="w-7 h-7 text-indigo-400" />
            )}
            <span>
              {activeMainTab === 'cameras'
                ? t('devices_title')
                : 'Quản Lý Văn Phòng & Định Vị Geofence'}
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {activeMainTab === 'cameras'
              ? t('devices_sub')
              : 'Cấu hình tọa độ GPS, bán kính hợp lệ và danh sách nhiều IP Public Wi-Fi cho từng chi nhánh'}
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveMainTab('cameras')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'cameras'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Chấm Công ({devices.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('offices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'offices'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Văn Phòng & Geofence ({offices.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMERAS (IP CAMERA & RTSP STREAMS) */}
      {/* ========================================================================= */}
      {activeMainTab === 'cameras' && (
        <div className="space-y-6">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={fetchDevices}
              disabled={loadingDevices}
              className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all"
              title={t('refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loadingDevices ? 'animate-spin text-cyan-400' : ''}`} />
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

          {loadingDevices && devices.length === 0 ? (
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
                            {isWebcam ? <Laptop className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-white truncate">
                              {device.device_name}
                            </h3>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span className="truncate">{device.location || 'Văn phòng chính'}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${purposeInfo.color}`}
                        >
                          <PurposeIcon className="w-3 h-3" />
                          <span>{purposeInfo.label}</span>
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 font-mono text-[11px] text-slate-400 truncate flex items-center space-x-2">
                        <Server className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{device.rtsp_url}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                          <div className="text-[10px] text-slate-500 font-semibold">{t('status')}</div>
                          <div className="text-xs font-bold mt-0.5 flex items-center justify-center space-x-1">
                            {device.is_connected ? (
                              <span className="text-emerald-400 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t('online')}</span>
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center space-x-1">
                                <XCircle className="w-3 h-3" />
                                <span>{t('offline')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                          <div className="text-[10px] text-slate-500 font-semibold">{t('fps_speed')}</div>
                          <div className="text-xs font-bold text-cyan-400 mt-0.5">
                            {device.fps ? `${device.fps.toFixed(1)}` : '0.0'}
                          </div>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                          <div className="text-[10px] text-slate-500 font-semibold">{t('checkin_count')}</div>
                          <div className="text-xs font-bold text-white mt-0.5">
                            {device.processed_count || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleToggle(device)}
                        disabled={isToggling}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          device.is_active
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className={`w-3.5 h-3.5 ${isToggling ? 'animate-spin' : ''}`} />
                        <span>{device.is_active ? t('toggle_stop') : t('toggle_start')}</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setFormData({
                              device_name: device.device_name,
                              rtsp_url: device.rtsp_url,
                              location: device.location || '',
                              purpose: device.purpose,
                              is_active: device.is_active,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                          title={t('edit')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-all"
                          title={t('delete')}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTI-OFFICE LOCATIONS & PUBLIC IP GEOFENCING */}
      {/* ========================================================================= */}
      {activeMainTab === 'offices' && (
        <div className="space-y-6">
          {/* Client IP & Info Banner */}
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">Địa Chỉ IP Mạng Hiện Tại Của Bạn:</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                    {myIp || 'Đang kiểm tra...'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Khi nhân viên kết nối Wi-Fi văn phòng có IP trùng khớp với danh sách bên dưới, hệ thống sẽ tự động xác nhận đang có mặt tại cơ quan.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <button
                onClick={fetchOffices}
                disabled={loadingOffices}
                className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all"
                title="Làm mới danh sách văn phòng"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOffices ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button
                onClick={handleOpenAddOffice}
                className="flex-1 md:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Văn Phòng / Chi Nhánh</span>
              </button>
            </div>
          </div>

          {/* Offices List Cards */}
          {loadingOffices && offices.length === 0 ? (
            <div className="py-24 text-center text-slate-500 text-xs space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
              <p>{t('loading')}</p>
            </div>
          ) : offices.length === 0 ? (
            <div className="py-24 glass-panel rounded-3xl border border-slate-800 text-center text-slate-500 text-xs space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-slate-300 font-semibold">Chưa có văn phòng / chi nhánh nào</p>
              <p className="text-slate-500">Hãy thêm văn phòng đầu tiên để thiết lập tọa độ GPS và dải IP Wi-Fi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {offices.map((office) => {
                const ips = Array.isArray(office.public_ips) ? office.public_ips : [];
                const bssids = Array.isArray(office.wifi_bssids) ? office.wifi_bssids : [];

                return (
                  <div
                    key={office.id}
                    className={`glass-panel rounded-3xl p-6 border transition-all duration-300 space-y-5 ${
                      office.is_active
                        ? 'border-slate-800 hover:border-indigo-500/50 shadow-xl'
                        : 'border-slate-800/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* Office Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-white truncate">
                              {office.name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                office.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              {office.is_active ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{office.address || 'Chưa cập nhật địa chỉ'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditOffice(office)}
                          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
                          title="Chỉnh sửa văn phòng"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffice(office)}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition-all"
                          title="Xóa văn phòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* GPS Coordinates & Radius Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Vĩ độ (Lat)</span>
                        <span className="font-mono font-bold text-slate-200">{office.latitude}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Kinh độ (Lng)</span>
                        <span className="font-mono font-bold text-slate-200">{office.longitude}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Bán kính Geofence</span>
                        <span className="font-bold text-indigo-400">{office.radius_meters}m</span>
                      </div>
                    </div>

                    {/* Public IP Addresses list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                        <span className="flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Danh sách IP Public Wi-Fi ({ips.length}):</span>
                        </span>
                      </div>
                      {ips.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Chưa cấu hình IP Public cho văn phòng này</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {ips.map((ip, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] flex items-center space-x-1.5"
                            >
                              <Wifi className="w-3 h-3 text-indigo-400" />
                              <span>{ip}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Wi-Fi BSSID / SSID list if any */}
                    {bssids.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/60">
                        <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Mã Wi-Fi BSSID / SSID:</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {bssids.map((bssid, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-[11px]"
                            >
                              {bssid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open Google Maps button */}
                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <a
                        href={`https://www.google.com/maps?q=${office.latitude},${office.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-all font-semibold"
                      >
                        <span>Xem vị trí trên Google Maps</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT OFFICE LOCATION */}
      {/* ========================================================================= */}
      {showOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingOffice ? 'Chỉnh Sửa Văn Phòng / Chi Nhánh' : 'Thêm Văn Phòng / Chi Nhánh Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Thiết lập tọa độ GPS và danh sách các địa chỉ IP Public</p>
                </div>
              </div>
              <button
                onClick={() => setShowOfficeModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficeSubmit} className="space-y-5">
              {/* Office Name & Address */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tên Văn Phòng / Chi Nhánh <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trụ sở chính Hà Nội, Chi nhánh Quận 1 TP.HCM..."
                    value={officeFormData.name}
                    onChange={(e) => setOfficeFormData({ ...officeFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Địa Chỉ Chi Tiết
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 123 Phố Huế, P. Hàng Bài, Q. Hai Bà Trưng, Hà Nội"
                    value={officeFormData.address}
                    onChange={(e) => setOfficeFormData({ ...officeFormData, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* GPS Coordinates & Geolocation Helper */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Navigation className="w-4 h-4 text-indigo-400" />
                    <span>Tọa Độ GPS & Bán Kính Chấm Công</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentGps}
                    disabled={isGettingGps}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'Đang định vị...' : 'Lấy tọa độ hiện tại của tôi'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={officeFormData.latitude}
                      onChange={(e) =>
                        setOfficeFormData({ ...officeFormData, latitude: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={officeFormData.longitude}
                      onChange={(e) =>
                        setOfficeFormData({ ...officeFormData, longitude: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bán kính hợp lệ (mét)</label>
                    <input
                      type="number"
                      min="10"
                      max="50000"
                      required
                      value={officeFormData.radius_meters}
                      onChange={(e) =>
                        setOfficeFormData({
                          ...officeFormData,
                          radius_meters: parseFloat(e.target.value) || 500,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Public IP Addresses Management */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Danh Sách IP Public Của Wi-Fi Văn Phòng</span>
                  </label>
                  {myIp && !officeFormData.public_ips.includes(myIp) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOfficeFormData((prev) => ({
                          ...prev,
                          public_ips: [...prev.public_ips, myIp],
                        }));
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm IP hiện tại ({myIp})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="VD: 14.162.144.10 hoặc dải mạng 192.168.1.0/24"
                    value={newIpInput}
                    onChange={(e) => setNewIpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIpTag();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddIpTag}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    Thêm IP
                  </button>
                </div>

                {/* IP Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {officeFormData.public_ips.length === 0 ? (
                    <span className="text-[11px] text-slate-500">Chưa có IP nào được thêm</span>
                  ) : (
                    officeFormData.public_ips.map((ip, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 font-mono text-xs flex items-center space-x-1.5"
                      >
                        <Wifi className="w-3 h-3 text-indigo-400" />
                        <span>{ip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIpTag(ip)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Wi-Fi BSSID / SSID Input */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Tên Mạng Wi-Fi / BSSID (Tùy chọn)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="VD: vface_corp_5g hoặc a4:91:b1:..."
                    value={newBssidInput}
                    onChange={(e) => setNewBssidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBssidTag();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBssidTag}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {officeFormData.wifi_bssids.map((bssid, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs flex items-center space-x-1.5"
                    >
                      <span>{bssid}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBssidTag(bssid)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Toggle & Buttons */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={officeFormData.is_active}
                    onChange={(e) => setOfficeFormData({ ...officeFormData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-white">Kích hoạt văn phòng này</span>
                </label>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowOfficeModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {editingOffice ? 'Cập Nhật Văn Phòng' : 'Thêm Văn Phòng'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CAMERA DEVICE */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>{t('modal_add_camera_title')}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeviceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t('camera_name')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cổng chính Tầng 1, Camera Hội trường..."
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t('rtsp_stream_url')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="rtsp://admin:pass@192.168.1.x:554/stream hoặc 0 (Webcam)"
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{t('presets')}:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {RTSP_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          device_name: preset.name,
                          rtsp_url: preset.url,
                          location: preset.location,
                          purpose: preset.purpose,
                        })
                      }
                      className="text-left px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 flex items-center justify-between group transition-all"
                    >
                      <span className="font-semibold text-white group-hover:text-cyan-400">
                        {preset.name}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px] truncate max-w-[200px]">
                        {preset.url}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('location')}
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cổng A, Lễ tân..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('purpose')}
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
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
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="is_active_checkbox" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  {t('auto_start_worker')}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all"
                >
                  {t('add_camera_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CAMERA DEVICE */}
      {/* ========================================================================= */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <span>{t('modal_edit_camera_title')}</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDeviceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t('camera_name')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t('rtsp_stream_url')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('location')}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('purpose')}
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
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
                  id="edit_is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit_is_active_checkbox" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  {t('camera_active_status')}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
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
