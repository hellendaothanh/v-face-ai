import axios from 'axios';

// -----------------------------------------------------------------------------
// Face AI & Attendance API Client (Port 8000)
// -----------------------------------------------------------------------------
const BACKEND_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const extractErrorMessage = (error, defaultMsg) => {
  const data = error.response?.data;
  if (!data) return error.message || defaultMsg;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.detail === 'string' && data.detail) return data.detail;
  if (typeof data.detail === 'object' && data.detail !== null) {
    return data.detail.message || JSON.stringify(data.detail);
  }
  if (typeof data.message === 'object' && data.message !== null) {
    return data.message.message || JSON.stringify(data.message);
  }
  return error.message || defaultMsg;
};

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = extractErrorMessage(error, 'Đã xảy ra lỗi khi kết nối Face AI Backend.');
    return Promise.reject(new Error(errorMsg));
  }
);

// -----------------------------------------------------------------------------
// Core User & IAM API Client (Port 8001)
// -----------------------------------------------------------------------------
const CORE_USER_BASE_URL = 'http://localhost:8001/api/v1';

const coreUserClient = axios.create({
  baseURL: CORE_USER_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

coreUserClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vface_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

coreUserClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = extractErrorMessage(error, 'Đã xảy ra lỗi khi kết nối Core User Service.');
    return Promise.reject(new Error(errorMsg));
  }
);

export const api = {
  // ============================================================================
  // Face AI Attendance APIs (Port 8000)
  // ============================================================================
  // Employees
  getEmployees: (params = {}) => apiClient.get('/employees', { params }),
  getEmployeeDetail: (id) => apiClient.get(`/employees/${id}`),
  createEmployee: (data) => apiClient.post('/employees', data),
  updateEmployee: (id, data) => apiClient.put(`/employees/${id}`, data),
  deleteEmployee: (id) => apiClient.delete(`/employees/${id}`),
  registerFace: (employeeId, formData) =>
    apiClient.post(`/employees/${employeeId}/register-face`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  verifyEmployeeFace: (employeeId, formData) =>
    apiClient.post(`/employees/${employeeId}/verify-face`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Attendance History
  getAttendanceHistory: (params = {}) => apiClient.get('/attendance', { params }),
  getAttendanceLogs: (params = {}) => apiClient.get('/attendance', { params }),
  faceCheckIn: (formData) =>
    apiClient.post('/attendance/check-in', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Attendance Requests & Exceptions
  getRequests: (params = {}) => apiClient.get('/requests', { params }),
  createRequest: (data) => apiClient.post('/requests', data),
  approveRequest: (id, data = {}) => apiClient.put(`/requests/${id}/approve`, data),
  rejectRequest: (id, data = {}) => apiClient.put(`/requests/${id}/reject`, data),
  getDailySummary: (params = {}) => apiClient.get('/requests/daily-summary', { params }),

  // Multi-Device Camera Management
  getDevices: () => apiClient.get('/devices'),
  createDevice: (data) => apiClient.post('/devices', data),
  toggleDevice: (id) => apiClient.put(`/devices/${id}/toggle`),
  updateDevice: (id, data) => apiClient.put(`/devices/${id}`, data),
  deleteDevice: (id) => apiClient.delete(`/devices/${id}`),

  // Analytics & BI
  getWeeklyPunctuality: (params = {}) => apiClient.get('/analytics/weekly-punctuality', { params }),
  getDepartmentLateness: (params = {}) => apiClient.get('/analytics/department-lateness', { params }),
  getHourlyDensity: (params = {}) => apiClient.get('/analytics/hourly-density', { params }),
  getAnalyticsSummary: () => apiClient.get('/analytics/summary'),

  // Camera RTSP / Webcam Stream
  getCameraStatus: () => apiClient.get('/camera/status'),
  startCamera: (payload = {}) => apiClient.post('/camera/start', payload),
  stopCamera: () => apiClient.post('/camera/stop'),
  captureLiveSnapshot: () => apiClient.post('/camera/snapshot'),
  getDirectCameraSnapshotBlob: async () => {
    const res = await apiClient.post('/camera/snapshot');
    const base64Data = res?.data?.image_base64 || res?.image_base64;
    if (!base64Data) {
      throw new Error('Camera snapshot failed or returned empty image');
    }
    const response = await fetch(base64Data);
    return await response.blob();
  },
  registerFaceFromLiveCamera: (employeeId) =>
    apiClient.post(`/camera/register-face/${employeeId}`),

  // API Health Diagnostics
  getBackendHealth: () => axios.get('http://localhost:8000/health', { timeout: 5000 }).then(res => res.data),
  getCoreUserHealth: () => axios.get('http://localhost:8001/health', { timeout: 5000 }).then(res => res.data),

  // ============================================================================
  // Core User & IAM Microservice APIs (Port 8001)
  // ============================================================================
  // Face AI Authentication & Face ID Login
  faceLogin: (imageBlob) => {
    const formData = new FormData();
    formData.append('image', imageBlob, 'face_login.jpg');
    return apiClient.post('/auth/face-login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Auth & IAM (Core User Service)
  login: (username, password) => coreUserClient.post('/auth/login', { username, password }),
  changePassword: (data) => coreUserClient.post('/auth/change-password', data),
  updateMyProfile: (userId, data) => coreUserClient.put(`/users/${userId}/profile`, data),

  // Users & Profiles
  getCoreUsers: (params = {}) => coreUserClient.get('/users', { params }),
  getCoreUserDetail: (id) => coreUserClient.get(`/users/${id}`),
  createCoreUser: (data) => coreUserClient.post('/users', data),
  updateCoreUser: (id, data) => coreUserClient.put(`/users/${id}`, data),
  deleteCoreUser: (id) => coreUserClient.delete(`/users/${id}`),

  // RBAC Roles & Permissions
  getRoles: () => coreUserClient.get('/rbac/roles'),
  createRole: (data) => coreUserClient.post('/rbac/roles', data),
  updateRole: (id, data) => coreUserClient.patch(`/rbac/roles/${id}`, data),
  deleteRole: (id) => coreUserClient.delete(`/rbac/roles/${id}`),
  getPermissions: () => coreUserClient.get('/rbac/permissions'),

  // Organization (Departments & Positions)
  getDepartments: () => coreUserClient.get('/organization/departments'),
  createDepartment: (data) => coreUserClient.post('/organization/departments', data),
  updateDepartment: (id, data) => coreUserClient.patch(`/organization/departments/${id}`, data),
  deleteDepartment: (id) => coreUserClient.delete(`/organization/departments/${id}`),
  getPositions: () => coreUserClient.get('/organization/positions'),
  createPosition: (data) => coreUserClient.post('/organization/positions', data),
  updatePosition: (id, data) => coreUserClient.patch(`/organization/positions/${id}`, data),
  deletePosition: (id) => coreUserClient.delete(`/organization/positions/${id}`),

  // ITIL Helpdesk & Service Desk
  getTickets: (params = {}) => coreUserClient.get('/helpdesk/tickets', { params }),
  getTicketDetail: (id) => coreUserClient.get(`/helpdesk/tickets/${id}`),
  createTicket: (data) => coreUserClient.post('/helpdesk/tickets', data),
  updateTicket: (id, data) => coreUserClient.patch(`/helpdesk/tickets/${id}`, data),
  addTicketComment: (id, data) => coreUserClient.post(`/helpdesk/tickets/${id}/comments`, data),
  submitTicketFeedback: (id, data) => coreUserClient.post(`/helpdesk/tickets/${id}/feedback`, data),
  triggerAIDiagnose: (id) => coreUserClient.post(`/helpdesk/tickets/${id}/ai-diagnose`),

  // Knowledge Base (KB)
  getKBCategories: () => coreUserClient.get('/helpdesk/kb/categories'),
  createKBCategory: (data) => coreUserClient.post('/helpdesk/kb/categories', data),
  getKBArticles: (params = {}) => coreUserClient.get('/helpdesk/kb/articles', { params }),
  getKBArticleDetail: (id) => coreUserClient.get(`/helpdesk/kb/articles/${id}`),
  createKBArticle: (data) => coreUserClient.post('/helpdesk/kb/articles', data),
  updateKBArticle: (id, data) => coreUserClient.put(`/helpdesk/kb/articles/${id}`, data),
  deleteKBArticle: (id) => coreUserClient.delete(`/helpdesk/kb/articles/${id}`),
  markKBArticleHelpful: (id) => coreUserClient.post(`/helpdesk/kb/articles/${id}/helpful`),
};

export default api;
