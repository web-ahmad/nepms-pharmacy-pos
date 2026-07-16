import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Account, 
  JournalEntry, 
  TrialBalanceResponse, 
  ProfitLossResponse, 
  BalanceSheetResponse,
  LedgerResponse
} from '../types/accounts';

// Chart of Accounts
export const useChartAccounts = () => {
  return useQuery({
    queryKey: ['accounts', 'chart'],
    queryFn: async () => {
      const res = await api.get('/api/v1/accounts/chart');
      return res.data as Account[];
    }
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Account>) => {
      const res = await api.post('/api/v1/accounts/chart', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      const res = await api.put(`/api/v1/accounts/chart/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/accounts/chart/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

export const useSeedAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/accounts/seed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

// Journal Entries
export const useJournalEntries = () => {
  return useQuery({
    queryKey: ['accounts', 'journals'],
    queryFn: async () => {
      const res = await api.get('/api/v1/accounts/journals');
      return res.data as JournalEntry[];
    }
  });
};

export const useCreateJournal = () => {
  return useMutation({
    mutationFn: async (data: Partial<JournalEntry>) => {
      const res = await api.post('/api/v1/accounts/journals', data);
      return res.data;
    }
  });
};

// Reports
export const useLedger = (params: { account_id?: string; start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['accounts', 'ledger', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.account_id) query.append('account_id', params.account_id);
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      
      const res = await api.get(`/api/v1/accounts/ledger?${query.toString()}`);
      return res.data as LedgerResponse;
    }
  });
};

export const useTrialBalance = (params: { start_date?: string; end_date?: string } = {}) => {
  return useQuery({
    queryKey: ['accounts', 'trial-balance', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      
      const res = await api.get(`/api/v1/accounts/reports/trial-balance?${query.toString()}`);
      return res.data as TrialBalanceResponse;
    }
  });
};

export const useProfitLoss = () => {
  return useQuery({
    queryKey: ['accounts', 'profit-loss'],
    queryFn: async () => {
      const res = await api.get('/api/v1/accounts/reports/profit-loss');
      return res.data as ProfitLossResponse;
    }
  });
};

export const useBalanceSheet = () => {
  return useQuery({
    queryKey: ['accounts', 'balance-sheet'],
    queryFn: async () => {
      const res = await api.get('/api/v1/accounts/reports/balance-sheet');
      return res.data as BalanceSheetResponse;
    }
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['accounts', 'dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/v1/accounts/dashboard-stats');
      return res.data as import('../types/accounts').DashboardStatsResponse;
    }
  });
};

export const useForceRebuildAccounting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/accounts/force-rebuild');
      return res.data as {
        message: string;
        synced: { sales: number; expenses: number; payroll: number; errors: string[] };
        accounts_recalculated: number;
      };
    },
    onSuccess: () => {
      // Invalidate all accounting queries so the dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
};
