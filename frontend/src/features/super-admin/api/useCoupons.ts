// features/super-admin/api/useCoupons.ts
// TanStack Query hooks for platform Coupons.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/coupons';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  times_redeemed: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface CouponInput {
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_redemptions?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

const couponKeys = { all: ['sa-coupons'] as const };

export function useCoupons() {
  return useQuery({
    queryKey: couponKeys.all,
    queryFn: async () => (await api.get<Coupon[]>(BASE)).data,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CouponInput) => (await api.post<Coupon>(BASE, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.all }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CouponInput> }) =>
      (await api.patch<Coupon>(`${BASE}/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.all }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`${BASE}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.all }),
  });
}
