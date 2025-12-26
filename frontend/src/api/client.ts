import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Use Vite env var VITE_BACKEND_URL if provided, otherwise fall back to the dev proxy path '/api'
const backendOrigin = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
const apiBase = backendOrigin ? `${backendOrigin}/api` : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorData = error.response.data as { code?: string };
      
      if (errorData?.code === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;
        
        try {
          const tokens = useAuthStore.getState().tokens;
          if (tokens?.refreshToken) {
            // Use absolute refresh URL so it works whether the backend is on same origin or a remote host
            const refreshUrl = backendOrigin ? `${backendOrigin}/api/auth/refresh` : '/api/auth/refresh';
            const response = await axios.post(refreshUrl, {
              refreshToken: tokens.refreshToken,
            });
            
            const newTokens = response.data.tokens;
            useAuthStore.getState().setTokens(newTokens);
            
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    // If we reach here and status is 401 (not handled by refresh flow), force logout and redirect
    if (error.response?.status === 401) {
      try {
        useAuthStore.getState().logout();
      } catch (e) {
        // ignore
      }
      // Navigate to login without forcing full page reload to avoid 404 on SPA hosts
      try {
        window.history.replaceState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {
        // Fallback to full navigation if history APIs are unavailable
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
