import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  tenantId: string | null;
  branchId: string | null;
  isAuthenticated: boolean;
  
  setAuth: (token: string, user: User, tenantId: string, branchId: string) => void;
  setBranch: (branchId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      tenantId: null,
      branchId: null,
      isAuthenticated: false,

      setAuth: (token, user, tenantId, branchId) => 
        set({ 
          accessToken: token, 
          user, 
          tenantId, 
          branchId, 
          isAuthenticated: true 
        }),
        
      setBranch: (branchId) => 
        set({ branchId }),

      logout: () => 
        set({ 
          accessToken: null, 
          user: null, 
          tenantId: null, 
          branchId: null, 
          isAuthenticated: false 
        }),
    }),
    {
      name: 'nepms-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist access token so session survives hard reloads
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        user: state.user, 
        tenantId: state.tenantId, 
        branchId: state.branchId, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
