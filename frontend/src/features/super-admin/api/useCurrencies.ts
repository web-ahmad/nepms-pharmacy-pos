// features/super-admin/api/useCurrencies.ts
// TanStack Query hooks for platform Currencies.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/currency';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface CurrencyInput {
  code: string;
  name: string;
  symbol: string;
  exchange_rate?: number;
  is_base?: boolean;
  is_active?: boolean;
}

const currencyKeys = { all: ['sa-currencies'] as const };

export function useCurrencies() {
  return useQuery({
    queryKey: currencyKeys.all,
    queryFn: async () => (await api.get<Currency[]>(BASE)).data,
  });
}

export function useCreateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CurrencyInput) => (await api.post<Currency>(BASE, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CurrencyInput> }) =>
      (await api.patch<Currency>(`${BASE}/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}

export function useSetBaseCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Currency>(`${BASE}/${id}/set-base`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}

export function useDeleteCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`${BASE}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}
