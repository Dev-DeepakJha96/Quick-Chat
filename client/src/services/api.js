import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ====================
// Request Interceptor
// ====================
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ====================
// Response Interceptor
// ====================
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  (error) => {
    const { config: requestConfig, response } = error;
    
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        url: requestConfig?.url,
        status: response?.status,
        data: response?.data,
        message: error.message,
      });
    }

    // Handle specific status codes
    if (response) {
      switch (response.status) {
        case 401:
          // Don't redirect if already on login/register or if refresh itself fails
          if (window.location.pathname.includes('/login') || window.location.pathname.includes('/register')) {
            break;
          }
          
          if (requestConfig.url === '/auth/refresh') {
            // Refresh token itself failed — session is truly expired
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            return Promise.reject(error);
          }
          
          if (!isRefreshing) {
            isRefreshing = true;
            
            return api.post('/auth/refresh')
              .then((refreshResponse) => {
                isRefreshing = false;
                processQueue(null);
                
                if (refreshResponse.data?.data?.accessToken) {
                  localStorage.setItem('accessToken', refreshResponse.data.data.accessToken);
                }
                
                return api(requestConfig);
              })
              .catch((refreshError) => {
                isRefreshing = false;
                processQueue(refreshError);
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                toast.error('Session expired. Please login again.');
                window.location.href = '/login';
                return Promise.reject(refreshError);
              });
          }
          
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            return api(requestConfig);
          });
          
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
          
        case 404:
          toast.error('Resource not found');
          break;
          
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          const errorMessage = response.data?.message || 'Something went wrong';
          toast.error(errorMessage);
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;