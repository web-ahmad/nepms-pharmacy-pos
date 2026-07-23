// features/super-admin/api/useReferral.ts
// TanStack Query hooks for the platform Referral Program.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/referral';

export interface ReferralSettings {
  id: string;
  reward_type: 'percentage' | 'fixed';
  reward_value: number;
  reward_duration_months: number | null;
  is_active: boolean;
  terms: string | null;
}

export interface ReferralSettingsInput {
  reward_type: 'percentage' | 'fixed';
  reward_value: number;
  reward_duration_months?: number | null;
  is_active?: boolean;
  terms?: string | null;
}

export interface Referral {
  id: string;
  referrer_pharmacy_id: string;
  referrer_pharmacy_name: string;
  referred_pharmacy_id: string | null;
  referred_pharmacy_name: string | null;
  referral_code: string;
  status: 'pending' | 'converted' | 'rewarded';
  reward_amount: number | null;
  rewarded_at: string | null;
  created_at: string | null;
}

const referralKeys = {
  settings: ['sa-referral-settings'] as const,
  list: ['sa-referrals'] as const,
};

export function useReferralSettings() {
  return useQuery({
    queryKey: referralKeys.settings,
    queryFn: async () => (await api.get<ReferralSettings>(`${BASE}/settings`)).data,
  });
}

export function useUpdateReferralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReferralSettingsInput) =>
      (await api.put<ReferralSettings>(`${BASE}/settings`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.settings }),
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: referralKeys.list,
    queryFn: async () => (await api.get<Referral[]>(`${BASE}/referrals`)).data,
  });
}

export function useMarkReferralRewarded() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`${BASE}/referrals/${id}/mark-rewarded`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.list }),
  });
}
