import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add local JWT if available (in case cookies are blocked or not set)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh on 401 Unauthorized
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refreshing if it is the login/register/logout/verify-email endpoint itself
    if (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/refresh') ||
      originalRequest.url.includes('/auth/verify-email')
    ) {
      return Promise.reject(error.response?.data || error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the cookie/tokens
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Note: The new cookies should be set by the browser. If we stored JWT in localStorage,
        // let's see if we need to extract it, but since refresh returns success with cookies,
        // we can just retry the original request.
        isRefreshing = false;
        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Clear local credentials and redirect if refresh fails
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Disconnect socket if exists
        // Only redirect to login if not already on a guest/public page to prevent infinite reload loop
        const currentPath = window.location.pathname;
        const isGuestPage = 
          currentPath === '/login' || 
          currentPath === '/register' || 
          currentPath.startsWith('/verify-email');
          
        if (!isGuestPage) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError.response?.data || refreshError);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default api;
