import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Calculator,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Radio,
  MapPin,
  FileSpreadsheet,
  FileText,
  Send,
  Bell,
  Sliders,
  Cpu,
  Check,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

export default function ShiftAndPayrollManager() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts', 'payroll', 'access_control', 'reports_ott'

  // Shifts state
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newShift, setNewShift] = useState({
    shift_code: '',
    shift_name: '',
    shift_type: 'STANDARD',
    start_time: '08:00:00',
    end_time: '17:00:00',
    grace_period_minutes: 15,
    work_hours: 8.0,
    is_overnight: false,
    is_split_shift: false,
    split_break_start: '14:00:00',
    split_break_end: '17:00:00',
    rotation_days: 7,
    allow_auto_match: true,
  });
  const [newAssignment, setNewAssignment] = useState({
    employee_id: '',
    shift_id: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  // Auto-match test state
  const [autoMatchCheckin, setAutoMatchCheckin] = useState('08:15');
  const [autoMatchResult, setAutoMatchResult] = useState(null);
  const [testingAutoMatch, setTestingAutoMatch] = useState(false);

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);
  const [toast, setToast] = useState(null);

  // IoT Access Control state
  const [gateStatus, setGateStatus] = useState('LOCKED'); // 'LOCKED', 'UNLOCKED'
  const [relayCountdown, setRelayCountdown] = useState(0);
  const [lastIoTEvent, setLastIoTEvent] = useState(null);
  const [triggeringRelay, setTriggeringRelay] = useState(false);

  // Enterprise Reports state
  const [reportType, setReportType] = useState('attendance'); // 'attendance', 'violations'
  const [reportFormat, setReportFormat] = useState('xlsx');   // 'xlsx', 'pdf', 'csv'
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportDept, setReportDept] = useState('');
  const [exportingReport, setExportingReport] = useState(false);

  // OTT Notification state
  const [ottChannel, setOttChannel] = useState('TELEGRAM'); // 'TELEGRAM', 'SLACK', 'ZALO'
  const [ottEvent, setOttEvent] = useState('STRANGER_THREAT');
  const [ottCustomTitle, setOttCustomTitle] = useState('');
  const [ottCustomMsg, setOttCustomMsg] = useState('');
  const [ottLogs, setOttLogs] = useState([]);
  const [sendingOTT, setSendingOTT] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load shifts & assignments
  const loadShiftsData = async () => {
    setLoadingShifts(true);
    try {
      const [shiftsRes, assignRes, empRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/shifts/assignments'),
        api.get('/employees')
      ]);
      setShifts(shiftsRes.data || []);
      setAssignments(assignRes.data || []);
      setEmployees(empRes.data?.data || empRes.data || []);
    } catch (err) {
      console.error('Error loading shifts data:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  // Load payroll records
  const loadPayrollData = async () => {
    try {
      const res = await api.get(`/payroll/records?month=${selectedMonth}&year=${selectedYear}`);
      setPayrollRecords(res.data || []);
    } catch (err) {
      console.error('Error loading payroll records:', err);
    }
  };

  // Load OTT Notification History
  const loadOTTLogs = async () => {
    try {
      const res = await api.get('/notifications/ott/history?limit=20');
      setOttLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error loading OTT logs:', err);
    }
  };

  useEffect(() => {
    loadShiftsData();
    loadPayrollData();
    loadOTTLogs();
  }, [selectedMonth, selectedYear]);

  // Handle create shift
  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newShift,
        split_break_start: newShift.is_split_shift ? newShift.split_break_start : null,
        split_break_end: newShift.is_split_shift ? newShift.split_break_end : null,
        rotation_days: newShift.shift_type === 'ROTATING' ? parseInt(newShift.rotation_days) || 7 : null,
      };
      await api.post('/shifts', payload);
      showToast(t('toast_create_shift_success'));
      setShowShiftModal(false);
      loadShiftsData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi khi tạo ca làm việc', 'error');
    }
  };

  // Handle assign shift
  const handleAssignShift = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts/assignments', newAssignment);
      showToast(t('toast_assign_shift_success'));
      setShowAssignModal(false);
      loadShiftsData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi khi gán ca', 'error');
    }
  };

  // Handle delete assignment
  const handleDeleteAssignment = async (id) => {
    try {
      await api.delete(`/shifts/assignments/${id}`);
      showToast('Đã xóa phân ca');
      loadShiftsData();
    } catch (err) {
      showToast('Lỗi khi xóa phân ca', 'error');
    }
  };

  // Handle Auto-Match Test
  const handleTestAutoMatch = async () => {
    setTestingAutoMatch(true);
    try {
      const res = await api.post('/shifts/auto-match', {
        checkin_time: autoMatchCheckin
      });
      setAutoMatchResult(res.data);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi kiểm tra so khớp ca', 'error');
    } finally {
      setTestingAutoMatch(false);
    }
  };

  // Handle Calculate Payroll
  const handleCalculatePayroll = async () => {
    setCalculatingPayroll(true);
    try {
      const res = await api.post(`/payroll/calculate?month=${selectedMonth}&year=${selectedYear}`);
      const count = res.data?.data?.length || res.data?.length || 0;
      showToast(t('toast_calc_payroll_success').replace('{count}', count));
      loadPayrollData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi khi tính lương tự động', 'error');
    } finally {
      setCalculatingPayroll(false);
    }
  };

  // Handle Export Reports (Excel, PDF, CSV)
  const handleDownloadReport = async () => {
    setExportingReport(true);
    try {
      let endpoint = reportType === 'attendance' ? '/reports/attendance/export' : '/reports/violations/export';
      const params = new URLSearchParams();
      params.append('format', reportFormat);
      if (reportFromDate) params.append('from_date', reportFromDate);
      if (reportToDate) params.append('to_date', reportToDate);
      if (reportDept && reportType === 'attendance') params.append('department', reportDept);

      const response = await api.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = reportFormat === 'xlsx' ? 'xlsx' : reportFormat === 'pdf' ? 'pdf' : 'csv';
      link.setAttribute('download', `VFace_${reportType.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast(t('toast_report_download_success'));
    } catch (err) {
      console.error('Error downloading report:', err);
      showToast('Lỗi khi tải xuất báo cáo', 'error');
    } finally {
      setExportingReport(false);
    }
  };

  // Handle Send Test OTT Alert
  const handleSendTestOTT = async () => {
    setSendingOTT(true);
    try {
      let defaultTitle = '';
      let defaultMsg = '';
      if (ottEvent === 'STRANGER_THREAT') {
        defaultTitle = '⚠️ CẢNH BÁO AN NINH: PHÁT HIỆN NGƯỜI LẠ (STRANGER THREAT)';
        defaultMsg = '📍 Vị trí: Sảnh Lễ Tân Cổng Chính • Tình trạng: Mặt không khớp CSDL vector 512D.';
      } else if (ottEvent === 'PPE_VIOLATION') {
        defaultTitle = '🛡️ CẢNH BÁO VI PHẠM ĐỒ BẢO HỘ LAO ĐỘNG (PPE ALERT)';
        defaultMsg = '👤 Nhân sự: Nguyễn Văn A (NV009) • Vị trí: Xưởng Cơ Khí • Lỗi: Không đeo khẩu trang/mũ.';
      } else {
        defaultTitle = '📢 THÔNG BÁO DUYỆT ĐƠN NGHỈ PHÉP: ✅ ĐÃ DUYỆT';
        defaultMsg = 'Đơn nghỉ phép ngày 30/08/2026 của bạn đã được Trưởng phòng phê duyệt.';
      }

      await api.post('/notifications/ott/test', {
        channel: ottChannel,
        event_type: ottEvent,
        title: ottCustomTitle || defaultTitle,
        message: ottCustomMsg || defaultMsg
      });

      showToast(t('toast_ott_dispatched').replace('{channel}', ottChannel));
      loadOTTLogs();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi khi phát lệnh thông báo OTT', 'error');
    } finally {
      setSendingOTT(false);
    }
  };

  // Handle Trigger IoT Relay
  const handleTriggerRelay = async () => {
    setTriggeringRelay(true);
    try {
      const res = await api.post('/devices/GATE_MAIN_01/trigger-relay?duration=3.0&employee_code=ADMIN_SIM');
      setGateStatus('UNLOCKED');
      setLastIoTEvent(res.data?.data || null);
      showToast(t('toast_relay_triggered'));

      setRelayCountdown(3);
      const timer = setInterval(() => {
        setRelayCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGateStatus('LOCKED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Lỗi khi kích hoạt rơ-le IoT', 'error');
    } finally {
      setTriggeringRelay(false);
    }
  };

  // Payroll Metrics
  const totalGross = payrollRecords.reduce((sum, r) => sum + (r.gross_salary || 0), 0);
  const totalNet = payrollRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const totalOTHours = payrollRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  const totalLateCount = payrollRecords.reduce((sum, r) => sum + (r.late_arrivals_count || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                {t('header_shifts_payroll_title')}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {t('header_shifts_payroll_sub')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'shifts'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('tab_shifts_scheduling')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'payroll'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            {t('tab_payroll_engine')}
          </button>
          <button
            onClick={() => setActiveTab('reports_ott')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'reports_ott'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            {t('tab_reports_ott')}
          </button>
          <button
            onClick={() => setActiveTab('access_control')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'access_control'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-amber-400" />
            {t('tab_access_control')}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SHIFTS & ROSTER SCHEDULING */}
      {/* ========================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              {t('shifts_list_title')}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition-all"
              >
                <Users className="w-4 h-4 text-blue-400" />
                {t('btn_assign_shift')}
              </button>
              <button
                onClick={() => setShowShiftModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('btn_add_shift')}
              </button>
            </div>
          </div>

          {/* Auto-Match Testing Widget */}
          <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                {t('auto_match_title')}
              </div>
              <span className="text-xs text-slate-500">{t('auto_match_sub')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Giờ Check-in Thực Tế:</span>
                <input
                  type="time"
                  value={autoMatchCheckin}
                  onChange={(e) => setAutoMatchCheckin(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                onClick={handleTestAutoMatch}
                disabled={testingAutoMatch}
                className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {testingAutoMatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {t('btn_test_auto_match')}
              </button>

              {autoMatchResult && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-xs text-cyan-300">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Khớp ca: <strong>{autoMatchResult.shift_name}</strong> ({autoMatchResult.start_time} - {autoMatchResult.end_time})
                    {autoMatchResult.is_split_shift && <span className="ml-1 text-amber-400">[Ca Gãy]</span>}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shifts Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl space-y-4 transition-all hover:shadow-xl group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                      {shift.shift_code}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2 group-hover:text-blue-300 transition-colors">
                      {shift.shift_name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium border ${
                      shift.is_split_shift
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : shift.shift_type === 'ROTATING'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        : shift.is_overnight
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}
                  >
                    {shift.is_split_shift
                      ? 'Ca Gãy (Split)'
                      : shift.shift_type === 'ROTATING'
                      ? `Ca Xoay (${shift.rotation_days || 7}d)`
                      : shift.is_overnight
                      ? t('th_overnight')
                      : t('th_daytime')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block">{language === 'vi' ? 'Khung Giờ:' : 'Time Window:'}</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">
                      {shift.start_time} - {shift.end_time}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block">{language === 'vi' ? 'Giờ Công:' : 'Work Hours:'}</span>
                    <span className="text-blue-400 font-semibold mt-0.5 block">
                      {shift.work_hours} {t('th_hours_per_day')}
                    </span>
                  </div>
                </div>

                {shift.is_split_shift && shift.split_break_start && (
                  <div className="text-xs bg-amber-950/20 border border-amber-500/20 p-2 rounded-lg text-amber-300">
                    Nghỉ giữa ca: {shift.split_break_start} - {shift.split_break_end}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>
                    {t('th_grace_period')}: <strong className="text-slate-200">{shift.grace_period_minutes}m</strong>
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {language === 'vi' ? 'Đang hoạt động' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Assignments Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {t('active_assignments_title')} ({assignments.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="p-3">{t('th_employee_name')}</th>
                    <th className="p-3">{t('th_employee_code')}</th>
                    <th className="p-3">{t('th_assigned_shift')}</th>
                    <th className="p-3">{t('th_effective_from')}</th>
                    <th className="p-3 text-right">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {assignments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-white">{item.employee_name || 'N/A'}</td>
                      <td className="p-3 font-mono text-blue-400">{item.employee_code || 'N/A'}</td>
                      <td className="p-3">
                        <span className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded text-xs">
                          {item.shift_name} ({item.shift_code})
                        </span>
                      </td>
                      <td className="p-3">{item.effective_from}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteAssignment(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-500">
                        {language === 'vi'
                          ? 'Chưa có phân ca nhân viên nào được gán.'
                          : 'No shift assignments created yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUTOMATED PAYROLL ENGINE */}
      {/* ========================================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-300">
                {language === 'vi' ? 'Kỳ Bảng Lương:' : 'Payroll Period:'}
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {language === 'vi' ? `Tháng ${i + 1}` : `Month ${i + 1}`}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCalculatePayroll}
                disabled={calculatingPayroll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {calculatingPayroll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {t('btn_calc_payroll')}
              </button>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">{t('kpi_net_salary_pool')}</span>
              <div className="text-xl font-black text-emerald-400">
                {totalNet.toLocaleString()} ₫
              </div>
              <span className="text-xs text-slate-500 block">
                {t('kpi_gross_payroll')} {totalGross.toLocaleString()} ₫
              </span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">{t('kpi_calculated_staff')}</span>
              <div className="text-xl font-black text-blue-400">
                {payrollRecords.length} {language === 'vi' ? 'Nhân sự' : 'Personnel'}
              </div>
              <span className="text-xs text-slate-500 block">
                {language === 'vi' ? 'Đã tổng hợp công tự động' : 'Attendance aggregated'}
              </span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">{t('kpi_total_ot')}</span>
              <div className="text-xl font-black text-amber-400">
                {totalOTHours.toFixed(1)} h
              </div>
              <span className="text-xs text-slate-500 block">{t('kpi_ot_rate_info')}</span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">{t('kpi_total_late')}</span>
              <div className="text-xl font-black text-rose-400">
                {totalLateCount} {language === 'vi' ? 'Lượt' : 'Times'}
              </div>
              <span className="text-xs text-slate-500 block">
                {t('kpi_deduction_info')} -50.000₫ / {language === 'vi' ? 'lần' : 'time'}
              </span>
            </div>
          </div>

          {/* Detailed Payroll Breakdown Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              {t('payroll_breakdown_title')}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="p-3">{t('th_employee_name')}</th>
                    <th className="p-3">{t('th_worked_days')}</th>
                    <th className="p-3">{t('th_ot_hours')}</th>
                    <th className="p-3">{t('th_late_count')}</th>
                    <th className="p-3">{t('th_base_salary')}</th>
                    <th className="p-3">{t('th_ot_pay')}</th>
                    <th className="p-3 text-right">{t('th_net_salary')}</th>
                    <th className="p-3 text-center">{t('th_status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {payrollRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        {r.employee_name}
                        <span className="block text-xs font-mono text-slate-500">{r.employee_code}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-blue-400">{r.actual_work_days}</span> / {r.standard_work_days}
                      </td>
                      <td className="p-3 font-semibold text-amber-400">{r.overtime_hours}h</td>
                      <td className="p-3">
                        <span className={r.late_arrivals_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {r.late_arrivals_count}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{r.base_salary?.toLocaleString()} ₫</td>
                      <td className="p-3 font-mono text-amber-300">+{r.overtime_pay?.toLocaleString()} ₫</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {r.net_salary?.toLocaleString()} ₫
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-semibold">
                          {r.status || t('status_completed')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {payrollRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500">
                        {language === 'vi'
                          ? 'Chưa có dữ liệu tính lương cho tháng này. Nhấn [Tính Lương Tự Động] để bắt đầu.'
                          : 'No payroll data for this month. Click [Auto Calculate Payroll] to compute.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ENTERPRISE REPORTS & OTT BOT GATEWAY */}
      {/* ========================================================= */}
      {activeTab === 'reports_ott' && (
        <div className="space-y-6">
          {/* Section 1: Multi-Format Export Center */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('export_center_title')}</h3>
                <p className="text-slate-400 text-xs mt-0.5">{t('export_center_sub')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_export_type')}</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="attendance">{t('opt_attendance_logs')}</option>
                  <option value="violations">{t('opt_security_violations')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_export_format')}</label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="xlsx">Microsoft Excel (.xlsx)</option>
                  <option value="pdf">Adobe PDF Report (.pdf)</option>
                  <option value="csv">Standard CSV (.csv)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_from_date')}</label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_to_date')}</label>
                <input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleDownloadReport}
                disabled={exportingReport}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {exportingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t('btn_download_report')} ({reportFormat.toUpperCase()})
              </button>
            </div>
          </div>

          {/* Section 2: OTT Bot Gateway & Test Dispatcher */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('ott_gateway_title')}</h3>
                <p className="text-slate-400 text-xs mt-0.5">{t('ott_gateway_sub')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_ott_channel')}</label>
                <select
                  value={ottChannel}
                  onChange={(e) => setOttChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="TELEGRAM">Telegram Bot (@VFaceAlertBot)</option>
                  <option value="SLACK">Slack Webhook (#security-alerts)</option>
                  <option value="ZALO">Zalo Official Account (Zalo OA)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{t('label_alert_event')}</label>
                <select
                  value={ottEvent}
                  onChange={(e) => setOttEvent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STRANGER_THREAT">{t('opt_stranger_threat')}</option>
                  <option value="PPE_VIOLATION">{t('opt_ppe_violation')}</option>
                  <option value="LEAVE_RESOLUTION">{t('opt_leave_resolution')}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSendTestOTT}
                  disabled={sendingOTT}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
                >
                  {sendingOTT ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('btn_send_test_ott')}
                </button>
              </div>
            </div>

            {/* OTT Logs Table */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                {t('ott_logs_title')}
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 bg-slate-950/40">
                      <th className="p-2.5">{t('th_ott_channel')}</th>
                      <th className="p-2.5">{t('th_ott_event')}</th>
                      <th className="p-2.5">{t('th_ott_title')}</th>
                      <th className="p-2.5">{t('th_ott_status')}</th>
                      <th className="p-2.5 text-right">{t('th_ott_time')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {ottLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/20">
                        <td className="p-2.5 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              log.channel === 'TELEGRAM'
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                : log.channel === 'SLACK'
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {log.channel}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">{log.event_type}</td>
                        <td className="p-2.5 text-white font-medium truncate max-w-xs">{log.title}</td>
                        <td className="p-2.5">
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs">
                            {log.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-slate-500 font-mono">
                          {log.created_at ? log.created_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {ottLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-500">
                          Chưa có sự kiện thông báo OTT nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: IOT ACCESS CONTROL & GEOFENCING */}
      {/* ========================================================= */}
      {activeTab === 'access_control' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gate Barrier Simulator */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {t('gate_simulator_title')}
                    </h3>
                    <p className="text-slate-400 text-xs">Wiegand 26-bit / MQTT / GPIO Relay</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    gateStatus === 'UNLOCKED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {gateStatus === 'UNLOCKED' ? t('gate_status_unlocked') : t('gate_status_locked')}
                </span>
              </div>

              {/* Turnstile Visual Box */}
              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-4">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                    gateStatus === 'UNLOCKED'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/25 scale-110'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  {gateStatus === 'UNLOCKED' ? <Zap className="w-12 h-12 animate-bounce" /> : <ShieldCheck className="w-12 h-12" />}
                </div>

                {relayCountdown > 0 && (
                  <div className="text-xs font-bold text-emerald-400 animate-pulse">
                    {language === 'vi' ? `Tự động đóng lại sau: ${relayCountdown}s` : `Auto-relocking in: ${relayCountdown}s`}
                  </div>
                )}

                <button
                  onClick={handleTriggerRelay}
                  disabled={triggeringRelay || gateStatus === 'UNLOCKED'}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {t('btn_trigger_relay')}
                </button>
              </div>

              {/* Wiegand Telemetry Box */}
              {lastIoTEvent && (
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="text-slate-400 flex justify-between">
                    <span>{t('wiegand_code_label')}</span>
                    <span className="text-blue-400 font-bold">{lastIoTEvent.wiegand_hex}</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>{t('mqtt_topic_label')}</span>
                    <span className="text-emerald-400">{lastIoTEvent.mqtt_topic}</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>{t('triggered_at_label')}</span>
                    <span className="text-slate-300">{lastIoTEvent.timestamp}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Geofencing Details */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('geofence_zone_title')}
                  </h3>
                  <p className="text-slate-400 text-xs">GPS Haversine Distance & Wi-Fi BSSID</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('hq_coords_label')}</span>
                    <span className="font-mono text-slate-200">10.7769° N, 106.7009° E</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('allowed_radius_label')}</span>
                    <span className="font-bold text-emerald-400">500 meters</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('wifi_bssid_label')}</span>
                    <span className="font-mono text-purple-300">00:1A:2B:3C:4D:5E (VFace-Corporate)</span>
                  </div>
                </div>

                <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl text-slate-300 space-y-1">
                  <strong className="text-purple-300 block">{t('geofence_desc_title')}</strong>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {t('geofence_desc_body')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW WORK SHIFT */}
      {/* ========================================================= */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              {t('modal_add_shift_title')}
            </h3>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">{t('th_shift_code')}:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SHIFT_SPLIT_01"
                    value={newShift.shift_code}
                    onChange={(e) => setNewShift({ ...newShift, shift_code: e.target.value.toUpperCase() })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">{t('th_shift_name')}:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ca Gãy Nhà Hàng"
                    value={newShift.shift_name}
                    onChange={(e) => setNewShift({ ...newShift, shift_name: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Loại Ca:</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="STANDARD">Ca Tiêu Chuẩn (08:00 - 17:00)</option>
                  <option value="MORNING">Ca Sáng (06:00 - 14:00)</option>
                  <option value="AFTERNOON">Ca Chiều (14:00 - 22:00)</option>
                  <option value="NIGHT">Ca Đêm (22:00 - 06:00)</option>
                  <option value="SPLIT">Ca Gãy (Split Shift)</option>
                  <option value="ROTATING">Ca Xoay Luân Phiên (Rotating Shift)</option>
                  <option value="FLEXIBLE">Ca Linh Hoạt (Flexible Hours)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">
                    {language === 'vi' ? 'Giờ Bắt Đầu:' : 'Start Time:'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">
                    {language === 'vi' ? 'Giờ Kết Thúc:' : 'End Time:'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Split Shift Checkbox & Intervals */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShift.is_split_shift}
                    onChange={(e) => setNewShift({ ...newShift, is_split_shift: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  {t('split_shift_label')}
                </label>

                {newShift.is_split_shift && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Nghỉ từ:</span>
                      <input
                        type="time"
                        value={newShift.split_break_start}
                        onChange={(e) => setNewShift({ ...newShift, split_break_start: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Đến:</span>
                      <input
                        type="time"
                        value={newShift.split_break_end}
                        onChange={(e) => setNewShift({ ...newShift, split_break_end: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rotating Shift Cycle */}
              {newShift.shift_type === 'ROTATING' && (
                <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/20 space-y-1">
                  <label className="text-xs text-purple-300 font-medium block">{t('rotation_days_label')}</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newShift.rotation_days}
                    onChange={(e) => setNewShift({ ...newShift, rotation_days: parseInt(e.target.value) || 7 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">{t('th_grace_period')} (m):</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={newShift.grace_period_minutes}
                    onChange={(e) => setNewShift({ ...newShift, grace_period_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">
                    {language === 'vi' ? 'Số Giờ Công Chuẩn:' : 'Standard Hours:'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newShift.work_hours}
                    onChange={(e) => setNewShift({ ...newShift, work_hours: parseFloat(e.target.value) || 8.0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 transition-all"
                >
                  {t('btn_save_shift')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSIGN SHIFT */}
      {/* ========================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {t('modal_assign_shift_title')}
            </h3>

            <form onSubmit={handleAssignShift} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">
                  {language === 'vi' ? 'Chọn Nhân Viên:' : 'Select Employee:'}
                </label>
                <select
                  required
                  value={newAssignment.employee_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, employee_id: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t('select_employee_placeholder')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">
                  {language === 'vi' ? 'Chọn Ca Làm Việc:' : 'Select Work Shift:'}
                </label>
                <select
                  required
                  value={newAssignment.shift_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, shift_id: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t('select_shift_placeholder')}</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shift_name} ({s.shift_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">
                  {language === 'vi' ? 'Ngày Bắt Đầu Hiệu Lực:' : 'Effective Start Date:'}
                </label>
                <input
                  type="date"
                  required
                  value={newAssignment.effective_from}
                  onChange={(e) => setNewAssignment({ ...newAssignment, effective_from: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 transition-all"
                >
                  {t('btn_confirm_assign')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
