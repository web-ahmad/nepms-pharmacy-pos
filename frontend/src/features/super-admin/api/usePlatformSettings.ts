// features/super-admin/api/usePlatformSettings.ts
// TanStack Query hooks for global Platform Settings (singleton).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/settings';

export interface PlatformSettings {
  id: string;
  platform_name: string;
  support_email: string | null;
  support_phone: string | null;
  default_currency_code: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  feature_flags: Record<string, boolean>;
}

export interface PlatformSettingsInput {
  platform_name: string;
  support_email?: string | null;
  support_phone?: string | null;
  default_currency_code?: string | null;
  maintenance_mode?: boolean;
  maintenance_message?: string | null;
  feature_flags?: Record<string, boolean>;
}

const settingsKeys = { all: ['sa-platform-settings'] as const };

export function usePlatformSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => (await api.get<PlatformSettings>(BASE)).data,
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PlatformSettingsInput) =>
      (await api.put<PlatformSettings>(BASE, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
