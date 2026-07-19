'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export interface SystemModule {
  id: string;
  module_key: string;
  module_name: string;
  category: string;
  is_enabled: boolean;
}

interface ModuleContextValue {
  modules: SystemModule[];
  isLoading: boolean;
  isModuleEnabled: (key: string) => boolean;
}

const ModuleContext = createContext<ModuleContextValue>({
  modules: [],
  isLoading: true,
  isModuleEnabled: () => true, // Safe default: allow all until loaded
});

export function ModuleProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['settings', 'modules'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/settings/modules');
        return res.data as SystemModule[];
      } catch {
        // If endpoint fails (unauthenticated / network issue), default to all enabled
        return [] as SystemModule[];
      }
    },
    // Refresh every 60s so sidebar stays in sync across tabs
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: !!token && user?.hierarchy_level !== 1,
  });

  const isModuleEnabled = useMemo(() => {
    return (key: string): boolean => {
      if (isLoading) return true; // Don't flash-hide during load
      const mod = modules.find((m) => m.module_key === key);
      // If not yet seeded or unknown key, default to enabled
      if (!mod) return true;
      return mod.is_enabled;
    };
  }, [modules, isLoading]);

  return (
    <ModuleContext.Provider value={{ modules, isLoading, isModuleEnabled }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  return useContext(ModuleContext);
}
