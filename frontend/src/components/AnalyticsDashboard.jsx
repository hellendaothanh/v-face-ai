import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Award,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  CheckCircle2,
  Building2,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import api from '../services/api';

const AnalyticsDashboard = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [densityData, setDensityData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRangeDays, setDateRangeDays] = useState(7);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [weeklyRes, deptRes, densityRes, summaryRes] = await Promise.allSettled([
        api.getWeeklyPunctuality({ days: dateRangeDays }),
        api.getDepartmentLateness({ days: 30 }),
        api.getHourlyDensity(),
        api.getAnalyticsSummary(),
      ]);

      if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.data) {
        setWeeklyData(weeklyRes.value.data);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.data) {
        setDeptData(deptRes.value.data);
      }
      if (densityRes.status === 'fulfilled' && densityRes.value?.data) {
        setDensityData(densityRes.value.data);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setSummaryData(summaryRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRangeDays]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1 bg-slate-950/95">
          <div className="font-bold text-white mb-1">{label}</div>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-slate-400">{entry.name}:</span>
              <span className="font-mono font-bold text-white">
                {entry.value}
                {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Color palette for department bars
  const DEPT_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center space-x-3">
            <TrendingUp className="w-7 h-7 text-indigo-400" />
            <span>Dashboard Phân Tích & Báo Cáo Chuyên Sâu (HRM BI)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Biểu đồ xu hướng đúng giờ, mật độ khung giờ check-in và tỷ lệ đi muộn của từng phòng ban.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Date Filter Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDateRangeDays(7)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                dateRangeDays === 7
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              7 Ngày
            </button>
            <button
              onClick={() => setDateRangeDays(14)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                dateRangeDays === 14
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              14 Ngày
            </button>
            <button
              onClick={() => setDateRangeDays(30)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                dateRangeDays === 30
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              30 Ngày
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center space-x-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Punctuality Rate */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tỷ Lệ Đúng Giờ Tuần Này
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-black text-white font-mono">
              {summaryData?.overall_punctuality_rate ?? 96.5}%
            </div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+2.4%</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Mục tiêu SLA:</span>
            <span className="text-emerald-400 font-mono font-bold">&gt; 95%</span>
          </div>
        </div>

        {/* Card 2: Today Total Check-ins */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Check-in Hôm Nay
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-black text-white font-mono">
              {summaryData?.today_checkins ?? 0}
            </div>
            <span className="text-xs text-slate-400">lượt quét</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tổng nhân sự:</span>
            <span className="text-indigo-400 font-mono font-bold">
              {summaryData?.total_active_employees ?? 0} người
            </span>
          </div>
        </div>

        {/* Card 3: Peak Arrival Time */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Khung Giờ Cao Điểm Nhất
            </span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-cyan-300 font-mono">
              {summaryData?.peak_arrival_slot ?? '08:00 - 08:30'}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Lưu lượng:</span>
            <span className="text-cyan-400 font-mono font-bold">Chiếm 65% lượt đến</span>
          </div>
        </div>

        {/* Card 4: Most Punctual Department */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Phòng Ban Chuyên Cần Nhất
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-amber-300 tracking-wide">
              {summaryData?.top_punctual_department ?? 'Kỹ thuật'}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tỷ lệ đúng giờ:</span>
            <span className="text-amber-400 font-mono font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* Row 1: Biểu đồ 1 (LineChart - Xu hướng đúng giờ theo tuần) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Biểu đồ 1: Xu Hướng Đúng Giờ Theo Ngày ({dateRangeDays} Ngày Gần Nhất)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi tỷ lệ (%) nhân viên đi làm đúng giờ (trước 08:30 hoặc có đơn công tác/ngoại lệ được duyệt).
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            LineChart Analytics
          </span>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="punctualityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="display_date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="punctuality_rate"
                name="Tỷ lệ đúng giờ"
                unit="%"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: '#38bdf8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Biểu đồ 2 (BarChart - Đi muộn theo phòng ban) + Biểu đồ 3 (AreaChart - Mật độ khung giờ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Biểu đồ 2: BarChart Phòng Ban */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Biểu đồ 2: Tỷ Lệ Đi Muộn Theo Phòng Ban
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thống kê số lượt đi muộn và tỷ lệ đi muộn của từng phòng ban trong 30 ngày qua.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              BarChart
            </span>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="department"
                  stroke="#64748b"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }}
                />
                <Bar
                  dataKey="late_count"
                  name="Số lượt đi muộn"
                  unit=" lượt"
                  fill="#f43f5e"
                  radius={[8, 8, 0, 0]}
                >
                  {deptData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 && entry.late_count > 0 ? '#f43f5e' : DEPT_COLORS[index % DEPT_COLORS.length]}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="on_time_count"
                  name="Số lượt đúng giờ"
                  unit=" lượt"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 3: AreaChart Mật độ check-in theo khung giờ */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Biểu đồ 3: Mật Độ Check-in Theo Khung Giờ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phân bố số lượng nhân viên chấm công theo các khung giờ 30 phút trong ngày.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              AreaChart
            </span>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={densityData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <defs>
                  <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: '#cbd5e1', fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="checkin_count"
                  name="Số người check-in"
                  unit=" người"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#densityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
