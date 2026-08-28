import axios from 'axios';

// API Base URL configured for local backend
const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for unified response extracting and error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Đã xảy ra lỗi khi kết nối máy chủ.';
    return Promise.reject(new Error(errorMsg));
  }
);

export const api = {
  // Employee APIs
  getEmployees: (params = {}) => apiClient.get('/employees', { params }),
  getEmployeeDetail: (id) => apiClient.get(`/employees/${id}`),
  createEmployee: (data) => apiClient.post('/employees', data),
  deleteEmployee: (id) => apiClient.delete(`/employees/${id}`),
  registerFace: (employeeId, formData) =>
    apiClient.post(`/employees/${employeeId}/register-face`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Attendance APIs
  getAttendanceHistory: (params = {}) => apiClient.get('/attendance', { params }),
  getAttendanceLogs: (params = {}) => apiClient.get('/attendance', { params }),
  faceCheckIn: (formData) =>
    apiClient.post('/attendance/check-in', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Attendance Requests & Exceptions APIs
  getRequests: (params = {}) => apiClient.get('/requests', { params }),
  createRequest: (data) => apiClient.post('/requests', data),
  approveRequest: (id, data = {}) => apiClient.put(`/requests/${id}/approve`, data),
  rejectRequest: (id, data = {}) => apiClient.put(`/requests/${id}/reject`, data),
  getDailySummary: (params = {}) => apiClient.get('/requests/daily-summary', { params }),

  // Multi-Device Camera Management APIs
  getDevices: () => apiClient.get('/devices'),
  createDevice: (data) => apiClient.post('/devices', data),
  toggleDevice: (id) => apiClient.put(`/devices/${id}/toggle`),
  updateDevice: (id, data) => apiClient.put(`/devices/${id}`, data),
  deleteDevice: (id) => apiClient.delete(`/devices/${id}`),

  // Analytics & BI Reporting APIs
  getWeeklyPunctuality: (params = {}) => apiClient.get('/analytics/weekly-punctuality', { params }),
  getDepartmentLateness: (params = {}) => apiClient.get('/analytics/department-lateness', { params }),
  getHourlyDensity: (params = {}) => apiClient.get('/analytics/hourly-density', { params }),
  getAnalyticsSummary: () => apiClient.get('/analytics/summary'),

  // Camera RTSP / Webcam Stream APIs
  getCameraStatus: () => apiClient.get('/camera/status'),
  startCamera: (payload = {}) => apiClient.post('/camera/start', payload),
  stopCamera: () => apiClient.post('/camera/stop'),
  captureLiveSnapshot: () => apiClient.post('/camera/snapshot'),
  registerFaceFromLiveCamera: (employeeId) =>
    apiClient.post(`/camera/register-face/${employeeId}`),
};

export default api;
