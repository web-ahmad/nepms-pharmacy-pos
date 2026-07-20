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

// Request interceptor to inject JWT token.
//
// Reading order:
//   1. Zustand in-memory state  (fastest, already set after setAuth())
//   2. localStorage fallback    (covers SSR-rehydration and hard-reload races
//                                where Zustand persist hasn't finished yet)
//
// IMPORTANT: The Zustand persist middleware writes to localStorage
// synchronously on set(), so by the time the first request fires after
// a successful login the token WILL be in localStorage even if the Zustand
// in-memory store hasn't propagated yet in some edge cases.
api.interceptors.request.use(
  (config) => {
    // Primary: Zustand in-memory state (available immediately after setAuth)
    let token = useAuthStore.getState().accessToken;

    // Fallback: localStorage (covers hard-reloads & initial-render races)
    if (!token && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nepms-auth-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Zustand persist wraps state under a `state` key
          token = parsed?.state?.accessToken ?? null;
        }
      } catch {
        // Silently ignore parse errors; request will proceed without token
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Inject the current active branch ID into headers
      const branchId = useAuthStore.getState().branchId;
      if (branchId) {
        config.headers['X-Branch-Id'] = branchId;
      } else {
        config.headers['X-Branch-Id'] = 'all';
      }
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
      const url = error.config?.url ?? '';
      // Don't logout/redirect on the login endpoint itself
      const isLoginEndpoint = url.includes('/auth/login');

      if (!isLoginEndpoint && typeof window !== 'undefined') {
        console.warn('[api] 401 Unauthorized →', url, '— clearing session');
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
