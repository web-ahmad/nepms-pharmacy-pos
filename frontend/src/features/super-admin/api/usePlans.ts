// features/super-admin/api/usePlans.ts
// TanStack Query hooks for platform Subscription Plans.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/plans';

export interface Plan {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features_limits: Record<string, number | string>;
  is_active: boolean;
  active_pharmacy_count: number;
  created_at: string | null;
}

export interface PlanInput {
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features_limits?: Record<string, number | string>;
  is_active?: boolean;
}

const planKeys = { all: ['sa-plans'] as const };

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: async () => (await api.get<Plan[]>(BASE)).data,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PlanInput) => (await api.post<Plan>(BASE, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<PlanInput> }) =>
      (await api.patch<Plan>(`${BASE}/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`${BASE}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}
