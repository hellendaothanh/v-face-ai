import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  CalendarDays,
  CalendarCheck,
  Search, 
  RefreshCw, 
  Briefcase, 
  FileSignature, 
  ClipboardCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  User,
  Users,
  Timer
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const RequestManagement = () => {
  const { t, language } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests' | 'daily_summary'

  // Data States
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Filters for Requests
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');

  // Daily Summary States
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryReports, setSummaryReports] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    employee_id: '',
    request_type: 'HALF_DAY_LEAVE_AM',
    target_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [approvalNote, setApprovalNote] = useState('Reviewed and approved');
  const [approverName, setApproverName] = useState('HR Manager');
  const [rejectReason, setRejectReason] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const REQUEST_TYPE_CONFIG = {
    HALF_DAY_LEAVE_AM: {
      label: t('req_half_day_am'),
      badge: 'Morning Leave (0.5d)',
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      icon: Timer,
    },
    HALF_DAY_LEAVE_PM: {
      label: t('req_half_day_pm'),
      badge: 'Afternoon Leave (0.5d)',
      color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
      icon: CalendarCheck,
    },
    BUSINESS_TRIP: {
      label: t('req_business_trip'),
      badge: 'Business Trip (1.0d)',
      color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
      icon: Building2,
    },
    LATE_EXCUSE: {
      label: t('req_late_excuse'),
      badge: 'Late Excuse (1.0d)',
      color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
      icon: FileSignature,
    },
  };

  const STATUS_CONFIG = {
    PENDING: {
      label: t('status_pending'),
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: Clock,
    },
    APPROVED: {
      label: t('status_approved'),
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: t('status_rejected'),
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      icon: XCircle,
    },
  };

  // Fetch Employees for dropdown
  const fetchEmployeesList = async () => {
    try {
      const res = await api.getEmployees({ page: 1, page_size: 100 });
      if (res.data?.items) {
        setEmployees(res.data.items);
        if (res.data.items.length > 0 && !createForm.employee_id) {
          setCreateForm((prev) => ({ ...prev, employee_id: res.data.items[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching employees list:', err);
    }
  };

  // Fetch Requests List
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRequests({
        status: statusFilter || undefined,
        request_type: typeFilter || undefined,
        employee_code: searchEmployee.trim() || undefined,
        page,
        page_size: pageSize,
      });
      if (res.data) {
        setRequests(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchEmployee, page, pageSize]);

  // Fetch Daily Summary
  const fetchDailySummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await api.getDailySummary({
        target_date: summaryDate,
      });
      if (res.data) {
        setSummaryReports(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching daily summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [summaryDate]);

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'requests') {
      fetchRequests();
    } else {
      fetchDailySummary();
    }
  }, [activeSubTab, fetchRequests, fetchDailySummary]);

  // Handle Create Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!createForm.employee_id || !createForm.reason.trim()) {
      alert('Please select employee and provide a reason');
      return;
    }
    setFormSubmitting(true);
    try {
      await api.createRequest(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        employee_id: employees[0]?.id || '',
        request_type: 'HALF_DAY_LEAVE_AM',
        target_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchRequests();
      setActionFeedback({
        type: 'success',
        message: 'Submitted attendance exception request successfully.',
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Approve Request
  const handleApprove = async () => {
    if (!selectedRequest) return;
    setFormSubmitting(true);
    try {
      const res = await api.approveRequest(selectedRequest.id, {
        approved_by: approverName,
        note: approvalNote,
      });
      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
      setActionFeedback({
        type: 'success',
        message: res.message || 'Request approved successfully.',
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Reject Request
  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      alert('Please provide rejection reason');
      return;
    }
    setFormSubmitting(true);
    try {
      await api.rejectRequest(selectedRequest.id, {
        rejected_by: approverName,
        note: rejectReason,
      });
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
      setActionFeedback({
        type: 'info',
        message: 'Request rejected.',
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const localeCode = language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Action Notification */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Selection */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
              activeSubTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>{t('requests_list_title')}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('daily_summary')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
              activeSubTab === 'daily_summary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{t('daily_summary_title')}</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {activeSubTab === 'requests' ? (
            <>
              <button
                onClick={fetchRequests}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
                title={t('refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>{t('create_request_btn')}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <button
                onClick={fetchDailySummary}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
                title={t('refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: REQUESTS LIST & APPROVAL */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{t('total')}</span>
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{total}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{t('status_pending')}</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">{pendingCount}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{t('status_approved')}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{approvedCount}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{t('status_rejected')}</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono">{rejectedCount}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => {
                  setSearchEmployee(e.target.value);
                  setPage(1);
                }}
                placeholder={t('search_employee_placeholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-800"
            >
              <option value="">{t('filter_status_all')}</option>
              <option value="PENDING">{t('status_pending')}</option>
              <option value="APPROVED">{t('status_approved')}</option>
              <option value="REJECTED">{t('status_rejected')}</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-800"
            >
              <option value="">{t('all')}</option>
              <option value="HALF_DAY_LEAVE_AM">{t('req_half_day_am')}</option>
              <option value="HALF_DAY_LEAVE_PM">{t('req_half_day_pm')}</option>
              <option value="BUSINESS_TRIP">{t('req_business_trip')}</option>
              <option value="LATE_EXCUSE">{t('req_late_excuse')}</option>
            </select>
          </div>

          {/* Requests Table */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">{t('table_header_employee')}</th>
                    <th className="py-4 px-6">{t('request_type')}</th>
                    <th className="py-4 px-6">{t('target_date')}</th>
                    <th className="py-4 px-6">{t('reason_label')}</th>
                    <th className="py-4 px-6 text-center">{t('status')}</th>
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
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-slate-400">
                        {t('no_data')}
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const typeConfig = REQUEST_TYPE_CONFIG[req.request_type] || {};
                      const statusConfig = STATUS_CONFIG[req.status] || {};
                      const TypeIcon = typeConfig.icon || FileText;
                      const StatusIcon = statusConfig.icon || Clock;

                      return (
                        <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white">
                              {req.employee?.full_name || t('unknown')}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {req.employee?.employee_code} • {req.employee?.department}
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold border text-[11px] ${typeConfig.color}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              <span>{typeConfig.label}</span>
                            </span>
                          </td>

                          <td className="py-4 px-6 font-mono font-semibold text-slate-200">
                            {new Date(req.target_date).toLocaleDateString(localeCode)}
                          </td>

                          <td className="py-4 px-6 max-w-xs">
                            <div className="text-slate-200 line-clamp-2">{req.reason}</div>
                            {req.note && (
                              <div className="text-[10px] text-emerald-400/90 mt-1 flex items-center space-x-1">
                                <Check className="w-3 h-3 flex-shrink-0" />
                                <span>{req.note} ({req.approved_by})</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold border text-[10px] ${statusConfig.badge}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusConfig.label}</span>
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setIsApproveModalOpen(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all hover:scale-105"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('approve')}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setIsRejectModalOpen(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t('reject')}</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono">
                                {t('status')} {statusConfig.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{t('total')}: <strong className="text-white font-mono">{total}</strong></span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
                >
                  {t('previous_page')}
                </button>
                <span>{t('page')} {page} {t('of')} {Math.max(1, Math.ceil(total / pageSize))}</span>
                <button
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
                >
                  {t('next_page')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY ATTENDANCE SUMMARY REPORT */}
      {activeSubTab === 'daily_summary' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CalendarCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <span>
                {t('daily_summary_title')} (<strong>{new Date(summaryDate).toLocaleDateString(localeCode)}</strong>)
              </span>
            </div>
            <span className="font-semibold text-slate-200 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
              {t('total')}: {summaryReports.length}
            </span>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">{t('employee_code')}</th>
                    <th className="py-4 px-6">{t('full_name')}</th>
                    <th className="py-4 px-6">{t('time')} (IN / OUT)</th>
                    <th className="py-4 px-6">{t('request_type')}</th>
                    <th className="py-4 px-6 text-center">{t('calculated_workdays')}</th>
                    <th className="py-4 px-6 text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingSummary ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>{t('loading')}</span>
                      </td>
                    </tr>
                  ) : summaryReports.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-slate-400">
                        {t('no_data')}
                      </td>
                    </tr>
                  ) : (
                    summaryReports.map((report) => (
                      <tr key={report.employee_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-white">
                          {report.employee_code}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white">{report.full_name}</div>
                          <div className="text-[10px] text-slate-400">{report.department}</div>
                        </td>
                        <td className="py-4 px-6 font-mono">
                          <div className="text-emerald-400">
                            IN: {report.first_check_in ? new Date(report.first_check_in).toLocaleTimeString(localeCode) : '---'}
                          </div>
                          <div className="text-cyan-400">
                            OUT: {report.last_check_out ? new Date(report.last_check_out).toLocaleTimeString(localeCode) : '---'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {report.approved_request_type ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                              <span>{REQUEST_TYPE_CONFIG[report.approved_request_type]?.badge || report.approved_request_type}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Standard</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                            report.work_units >= 1.0
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                              : report.work_units > 0
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                          }`}>
                            {report.work_units.toFixed(1)} {t('work_units_credited')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-slate-200">
                          {report.status_label}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE REQUEST */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-700 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('create_request_modal_title')}</h3>
                <p className="text-xs text-slate-400">{t('header_requests_sub')}</p>
              </div>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('select_employee')} *</label>
                <select
                  required
                  value={createForm.employee_id}
                  onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white bg-slate-900 border border-slate-800 focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('request_type')} *</label>
                <select
                  value={createForm.request_type}
                  onChange={(e) => setCreateForm({ ...createForm, request_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white bg-slate-900 border border-slate-800 focus:outline-none"
                >
                  <option value="HALF_DAY_LEAVE_AM">{t('req_half_day_am')}</option>
                  <option value="HALF_DAY_LEAVE_PM">{t('req_half_day_pm')}</option>
                  <option value="BUSINESS_TRIP">{t('req_business_trip')}</option>
                  <option value="LATE_EXCUSE">{t('req_late_excuse')}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('target_date')} *</label>
                <input
                  type="date"
                  required
                  value={createForm.target_date}
                  onChange={(e) => setCreateForm({ ...createForm, target_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white border border-slate-800 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('reason_label')} *</label>
                <textarea
                  required
                  rows={3}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Provide reason or justification..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white border border-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-colors"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE REQUEST */}
      {isApproveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700 relative text-xs">
            <button
              onClick={() => setIsApproveModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('approve')}</h3>
                <p className="text-[11px] text-slate-400">{t('header_requests_sub')}</p>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 mb-4">
              <div>{t('table_header_employee')}: <strong className="text-white">{selectedRequest.employee?.full_name}</strong></div>
              <div>{t('request_type')}: <strong className="text-indigo-400">{REQUEST_TYPE_CONFIG[selectedRequest.request_type]?.label}</strong></div>
              <div>{t('target_date')}: <strong className="text-white font-mono">{new Date(selectedRequest.target_date).toLocaleDateString(localeCode)}</strong></div>
              <div>{t('reason_label')}: <span className="text-slate-300">{selectedRequest.reason}</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('approved_by')}</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white border border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white border border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={formSubmitting}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 transition-colors"
              >
                {formSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{t('approve')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT REQUEST */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700 relative text-xs">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('reject')}</h3>
                <p className="text-[11px] text-slate-400">{t('reason_label')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('reason_label')} *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-white border border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={formSubmitting}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 transition-colors"
              >
                {formSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>{t('reject')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestManagement;
