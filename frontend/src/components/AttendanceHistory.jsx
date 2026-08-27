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

const AttendanceHistory = () => {
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

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Filter Panel */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Bộ Lọc Lịch Sử Chấm Công</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              Đặt lại bộ lọc
            </button>
            <button
              onClick={fetchAttendance}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              title="Tìm kiếm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Mã Nhân Viên</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.employee_code}
                onChange={(e) => {
                  setFilters({ ...filters, employee_code: e.target.value });
                  setPage(1);
                }}
                placeholder="VD: EMP001"
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Phòng Ban</label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.department}
                onChange={(e) => {
                  setFilters({ ...filters, department: e.target.value });
                  setPage(1);
                }}
                placeholder="VD: Kỹ Thuật"
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Từ Ngày</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => {
                  setFilters({ ...filters, start_date: e.target.value });
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Đến Ngày</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => {
                  setFilters({ ...filters, end_date: e.target.value });
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">Thời Gian Điểm Danh</th>
                <th className="py-4 px-6">Mã NV</th>
                <th className="py-4 px-6">Họ và Tên</th>
                <th className="py-4 px-6">Phòng Ban</th>
                <th className="py-4 px-6">Loại Chấm Công</th>
                <th className="py-4 px-6 text-center">Độ Tin Cậy AI</th>
                <th className="py-4 px-6 text-right">Thiết Bị Ghi Nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Đang tải lịch sử chấm công...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    Không tìm thấy bản ghi chấm công nào phù hợp.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs">
                      <div className="text-white font-semibold">
                        {new Date(r.check_time).toLocaleTimeString('vi-VN')}
                      </div>
                      <div className="text-slate-400">
                        {new Date(r.check_time).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white">
                      {r.employee?.employee_code || '---'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {r.employee?.full_name || 'Nhân viên'}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300">
                      <div>{r.employee?.department || '---'}</div>
                      <div className="text-slate-400">{r.employee?.position || '---'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.attendance_type === 'AUTO'
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : r.attendance_type === 'CHECK_IN'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        <span>{r.attendance_type}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{(r.confidence_score * 100).toFixed(1)}%</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                      {r.device_id || 'Tapo C200'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tổng số lượt chấm công: <strong className="text-white">{total}</strong></span>
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
    </div>
  );
};

export default AttendanceHistory;
