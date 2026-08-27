import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  UserCheck,
  Building,
  Clock,
  Camera
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const AttendanceHistory = () => {
  const { t, language } = useI18n();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Filters State
  const [filters, setFilters] = useState({
    employee_code: '',
    department: '',
    start_date: '',
    end_date: '',
  });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        employee_code: filters.employee_code.trim() || undefined,
        department: filters.department.trim() || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      };
      const res = await api.getAttendanceHistory(params);
      if (res.data) {
        setRecords(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleResetFilters = () => {
    setFilters({
      employee_code: '',
      department: '',
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  const localeCode = language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter Panel */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>{t('att_history_title')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              {t('reset_filters')}
            </button>
            <button
              onClick={fetchAttendance}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              title={t('search')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t('att_filter_code')}</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('att_filter_code_placeholder')}
                value={filters.employee_code}
                onChange={(e) => setFilters({ ...filters, employee_code: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">{t('att_filter_dept')}</label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('att_filter_dept_placeholder')}
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">{t('att_filter_start')}</label>
            <div className="relative">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">{t('att_filter_end')}</label>
            <div className="relative">
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">{t('table_header_employee')}</th>
                <th className="py-4 px-6">{t('table_header_code')}</th>
                <th className="py-4 px-6">{t('table_header_dept')}</th>
                <th className="py-4 px-6">{t('table_header_time')}</th>
                <th className="py-4 px-6">{t('table_header_type')}</th>
                <th className="py-4 px-6">{t('table_header_confidence')}</th>
                <th className="py-4 px-6">{t('table_header_device')}</th>
                <th className="py-4 px-6 text-center">{t('table_header_photo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>{t('loading')}</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    {t('no_attendance_found')}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const empName = r.employee?.full_name || t('unknown');
                  const empCode = r.employee?.employee_code || '---';
                  const dept = r.employee?.department || '---';
                  const pos = r.employee?.position || '';
                  const initialChar = empName ? empName.charAt(0).toUpperCase() : 'N';

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {initialChar}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{empName}</div>
                            {pos && <div className="text-[11px] text-slate-400">{pos}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-indigo-300">
                        {empCode}
                      </td>

                      <td className="py-4 px-6 text-slate-300 text-xs">
                        {dept}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-300">
                        <div className="font-mono text-white">
                          {new Date(r.check_time).toLocaleTimeString(localeCode, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(r.check_time).toLocaleDateString(localeCode)}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.attendance_type === 'CHECK_IN'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : r.attendance_type === 'CHECK_OUT'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          <span>{r.attendance_type || 'AUTO'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{r.confidence_score ? `${(r.confidence_score * 100).toFixed(1)}%` : '---'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-400">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {r.device_id || 'Camera Gate'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {r.snapshot_url ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 mx-auto shadow">
                            <img
                              src={`http://localhost:8000${r.snapshot_url}`}
                              alt={empName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600">---</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{t('total')}: <strong className="text-white">{total}</strong></span>
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
    </div>
  );
};

export default AttendanceHistory;
