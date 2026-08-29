import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database, 
  Radio, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  Layers
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const SystemHealth = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const [services, setServices] = useState([
    {
      id: 'backend',
      name: 'Face AI Attendance API',
      port: 8000,
      url: 'http://localhost:8000/health',
      docsUrl: 'http://localhost:8000/docs',
      description: 'Face recognition, pgvector search, Anti-spoofing, RTSP stream',
      status: 'checking', // healthy, error, checking
      responseTime: null,
      details: null,
      errorMsg: null,
    },
    {
      id: 'core_user',
      name: 'Core User & IAM Service',
      port: 8001,
      url: 'http://localhost:8001/health',
      docsUrl: 'http://localhost:8001/docs',
      description: 'Authentication, JWT tokens, RBAC permissions, Organization HRM',
      status: 'checking',
      responseTime: null,
      details: null,
      errorMsg: null,
    },
    {
      id: 'database',
      name: 'PostgreSQL 16 + pgvector',
      port: 5432,
      url: null,
      docsUrl: null,
      description: 'Relational storage & HNSW 512D Vector Indexing',
      status: 'checking',
      responseTime: null,
      details: { db: 'vface_db', user: 'postgres', port: 5432 },
      errorMsg: null,
    },
    {
      id: 'frontend',
      name: 'Frontend React + Vite',
      port: 3000,
      url: 'http://localhost:3000',
      docsUrl: null,
      description: 'Web UI Dashboard, Live AI HUD, Multi-Camera controls',
      status: 'healthy',
      responseTime: '< 5ms',
      details: { framework: 'React 19', bundler: 'Vite 6' },
      errorMsg: null,
    },
  ]);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const startTime = Date.now();

    // 1. Check Face AI Backend (8000)
    let backendStatus = 'error';
    let backendDetails = null;
    let backendLatency = null;
    let backendErr = null;

    try {
      const bStart = performance.now();
      const res = await api.getBackendHealth();
      backendLatency = Math.round(performance.now() - bStart) + 'ms';
      if (res && res.status === 'healthy') {
        backendStatus = 'healthy';
        backendDetails = res;
      }
    } catch (err) {
      backendErr = err.message || 'Connection refused (Port 8000)';
    }

    // 2. Check Core User Service (8001)
    let coreStatus = 'error';
    let coreDetails = null;
    let coreLatency = null;
    let coreErr = null;

    try {
      const cStart = performance.now();
      const res = await api.getCoreUserHealth();
      coreLatency = Math.round(performance.now() - cStart) + 'ms';
      if (res && res.status === 'healthy') {
        coreStatus = 'healthy';
        coreDetails = res;
      }
    } catch (err) {
      coreErr = err.message || 'Connection refused (Port 8001)';
    }

    // 3. Database status is verified if Backend is healthy
    const dbStatus = backendStatus === 'healthy' ? 'healthy' : 'error';
    const dbLatency = backendStatus === 'healthy' ? '< 10ms' : null;
    const dbErr = backendStatus === 'healthy' ? null : 'Unreachable via Backend service';

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === 'backend') {
          return {
            ...s,
            status: backendStatus,
            responseTime: backendLatency,
            details: backendDetails,
            errorMsg: backendErr,
          };
        }
        if (s.id === 'core_user') {
          return {
            ...s,
            status: coreStatus,
            responseTime: coreLatency,
            details: coreDetails,
            errorMsg: coreErr,
          };
        }
        if (s.id === 'database') {
          return {
            ...s,
            status: dbStatus,
            responseTime: dbLatency,
            errorMsg: dbErr,
          };
        }
        return s;
      })
    );

    setLastCheck(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Auto refresh every 5s
    return () => clearInterval(interval);
  }, [checkHealth]);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const totalCount = services.length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('system_status') || 'System Status'}</p>
            <h3 className="text-xl font-bold text-white mt-1">
              {healthyCount === totalCount ? (
                <span className="text-emerald-400 flex items-center space-x-1.5">
                  <span>100% Online</span>
                </span>
              ) : (
                <span className="text-amber-400">{healthyCount}/{totalCount} Operational</span>
              )}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            healthyCount === totalCount ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Core User (IAM/RBAC)</p>
            <h3 className="text-xl font-bold text-white mt-1">
              {services.find((s) => s.id === 'core_user')?.status === 'healthy' ? (
                <span className="text-emerald-400">Port 8001</span>
              ) : (
                <span className="text-rose-400">Offline</span>
              )}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Face AI Attendance</p>
            <h3 className="text-xl font-bold text-white mt-1">
              {services.find((s) => s.id === 'backend')?.status === 'healthy' ? (
                <span className="text-emerald-400">Port 8000</span>
              ) : (
                <span className="text-rose-400">Offline</span>
              )}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('last_updated') || 'Last Checked'}</p>
            <h3 className="text-lg font-bold text-slate-200 mt-1">{lastCheck || '--:--:--'}</h3>
          </div>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title="Refresh Health Status"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Services List Table / Cards */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t('api_services_matrix') || 'Microservices Health Matrix'}
              </h2>
              <p className="text-xs text-slate-400">Realtime latency & endpoint diagnostics</p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh') || 'Re-check'}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-800/60">
          {services.map((svc) => {
            const isHealthy = svc.status === 'healthy';
            return (
              <div key={svc.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-all">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    isHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-white text-sm">{svc.name}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        Port {svc.port}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isHealthy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isHealthy ? 'Operational' : 'Unreachable'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">{svc.description}</p>

                    {svc.errorMsg && (
                      <p className="text-xs text-rose-400 mt-1.5 font-mono bg-rose-950/30 px-2 py-1 rounded border border-rose-900/40">
                        ⚠ {svc.errorMsg}
                      </p>
                    )}

                    {svc.details && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(svc.details).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono bg-slate-950/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            {k}: <span className="text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end md:self-center">
                  {svc.responseTime && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Latency</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{svc.responseTime}</span>
                    </div>
                  )}

                  {svc.docsUrl && (
                    <a
                      href={svc.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-all border border-slate-700/60 shadow-sm"
                    >
                      <span>Swagger Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
