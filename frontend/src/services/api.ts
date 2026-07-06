import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    let token = useAuthStore.getState().accessToken;
    
    // Fallback to reading directly from localStorage if Zustand hasn't rehydrated yet
    if (!token && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nepms-auth-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.state?.accessToken;
        }
      } catch (error) {
        console.error('Failed to parse auth storage', error);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('API 401 Unauthorized at URL:', error.config?.url);
      
      // Clear auth state
      useAuthStore.getState().logout();
      
      // Redirect to login if running in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
