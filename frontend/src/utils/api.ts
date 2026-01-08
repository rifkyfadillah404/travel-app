import axios from 'axios';

// Get backend URL
// Use ngrok URL for mobile/remote testing
const API_URL = 'https://pseudolegal-kurtis-farinosely.ngrok-free.dev/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests and prevent caching
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Prevent caching for all GET requests by adding timestamp
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
    // Remove strict headers that might trigger CORS issues
    // config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    // config.headers['Pragma'] = 'no-cache';
    // config.headers['Expires'] = '0';
  }

  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect if we get a 401 AND it's not a login attempt
    // Also check if we actually have a token to begin with
    const token = localStorage.getItem('token');

    if (error.response?.status === 401 && token && !error.config.url.includes('/login')) {
      console.warn('Session expired or invalid token');
      // Don't auto-remove token here, let appStore handle the logic
      // This prevents race conditions where a single failed request logs you out
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),
  loginQR: (qrToken: string) =>
    api.post('/auth/login-qr', { qrToken }),
  register: (name: string, phone: string, password: string, groupId: number) =>
    api.post('/auth/register', { name, phone, password, groupId }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Admin
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data: { name: string; phone: string; password?: string; role?: string }) =>
    api.post('/admin/users', data),
  updateUser: (id: string, data: { name?: string; phone?: string; role?: string }) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  regenerateQR: (id: string) => api.post(`/admin/users/${id}/regenerate-qr`),
  getUserQR: (id: string) => api.get(`/admin/users/${id}/qr`),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateLocation: (latitude: number, longitude: number) =>
    api.post('/users/location', { latitude, longitude }),
  updateProfile: (avatar: string) => 
    api.put('/users/profile', { avatar }),
};

// Groups
export const groupsAPI = {
  getCurrent: () => api.get('/groups'),
  getById: (id: string) => api.get(`/groups/${id}`),
  join: (joinCode: string) => api.post('/groups/join', { joinCode }),
  leave: () => api.post('/groups/leave'),
};

// Panic
export const panicAPI = {
  getAll: () => api.get('/panic'),
  create: (message: string, latitude: number, longitude: number) =>
    api.post('/panic', { message, latitude, longitude }),
  resolve: (id: string) => api.put(`/panic/${id}/resolve`),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (settings: {
    isGpsActive?: boolean;
    trackingInterval?: number;
    radiusLimit?: number;
    isAppActive?: boolean;
  }) => api.put('/settings', settings),
};

// Itinerary
export const itineraryAPI = {
  getAll: () => api.get('/itinerary'),
  getByDay: (day: number) => api.get(`/itinerary/day/${day}`),
  getByGroup: (groupId: number) => api.get(`/itinerary/group/${groupId}`),
  create: (data: any) => api.post('/itinerary', data),
  createForGroup: (groupId: number, data: any) => api.post(`/itinerary/group/${groupId}`, data),
  update: (id: string, data: any) => api.put(`/itinerary/${id}`, data),
  delete: (id: string) => api.delete(`/itinerary/${id}`),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
};

// Groups Admin
export const groupsAdminAPI = {
  getAll: () => api.get('/admin/groups'),
  create: (data: any) => api.post('/admin/groups', data),
  update: (id: string, data: any) => api.put(`/admin/groups/${id}`, data),
};

export default api;
