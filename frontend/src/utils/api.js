import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('clearscan_auth');
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (_) {}
  }
  return config;
});

// Handle 401 globally — clear auth and redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('clearscan_auth');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Named helpers ─────────────────────────────────────────────────────────────
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  modalities: () => api.get('/search/modalities'),
  bodyParts: (modality_id) => api.get('/search/body-parts', { params: { modality_id } }),
  protocols: (body_part_id) => api.get('/search/protocols', { params: { body_part_id } }),
  catalog: () => api.get('/catalog/full'),
};

export const paymentAPI = {
  // Checkout for a confirmed appointment (from the email pay link)
  createCheckout: (appointmentId) => api.post(`/payments/checkout/${appointmentId}`),
  getSession: (sessionId) => api.get(`/payments/session/${sessionId}`),
};

export const appointmentAPI = {
  // Step 1: request an appointment (no payment)
  book: (data) => api.post('/appointments/book', data),
  mine: () => api.get('/appointments/my'),
  get: (id) => api.get(`/appointments/${id}`),
  confirm: (code) => api.get(`/appointments/confirm/${code}`),
  // Secure referral upload via tokenized email link
  getUploadInfo: (token) => api.get(`/appointments/upload/${token}`),
  uploadReferral: (token, data) => api.post(`/appointments/upload/${token}`, data),
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const aiAPI = {
  // Plain-English scan finder
  findScan: (text) => api.post('/ai/scan-finder', { text }),
  // Referral extraction — accepts a File object, converts to base64
  extractReferral: async (file) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    return api.post('/ai/extract-referral', {
      file_base64: base64,
      media_type: file.type,
    });
  },
};

export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  // Centers
  getCenters: (params) => api.get('/admin/centers', { params }),
  getCenter: (id) => api.get(`/admin/centers/${id}`),
  createCenter: (data) => api.post('/admin/centers', data),
  updateCenter: (id, data) => api.put(`/admin/centers/${id}`, data),
  deleteCenter: (id) => api.delete(`/admin/centers/${id}`),
  getCenterPricing: (id) => api.get(`/admin/centers/${id}/pricing`),
  upsertPricing: (id, data) => api.post(`/admin/centers/${id}/pricing`, data),
  bulkUpdatePricing: (id, data) => api.put(`/admin/centers/${id}/pricing/bulk`, data),
  publishPricing: (id, resend = false) => api.post(`/admin/centers/${id}/publish-pricing${resend ? '?resend=true' : ''}`),
  // Appointments
  getAppointments: (params) => api.get('/admin/appointments', { params }),
  confirmAppointment: (id, appointment_datetime) => api.post(`/admin/appointments/${id}/confirm`, { appointment_datetime }),
  updateAppointmentStatus: (id, status) => api.patch(`/admin/appointments/${id}/status`, { status }),
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  promoteUser: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
};
