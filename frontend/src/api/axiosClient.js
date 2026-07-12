import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT ──
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('transitops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ──
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-redirect if we're not already on the login page
      // and this isn't the login request itself
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('transitops_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
