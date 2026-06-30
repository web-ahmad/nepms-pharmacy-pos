import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface SystemHealth {
  database_status: string;
  active_connections: number;
  storage_used_gb: number;
  storage_total_gb: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  queues_pending: number;
}

export interface BackupHistory {
  id: string;
  file_name: string;
  size_mb: number;
  status: string;
  created_by: string;
  created_at: string;
}

export interface OCRQueue {
  id: string;
  file_path: string;
  status: string;
  extracted_text?: string;
  created_at: string;
  processed_at?: string;
}

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      const res = await api.get('/api/v1/system/health');
      return res.data as SystemHealth;
    }
  });
};

export const useBackups = () => {
  return useQuery({
    queryKey: ['system', 'backups'],
    queryFn: async () => {
      const res = await api.get('/api/v1/system/backups');
      return res.data as BackupHistory[];
    }
  });
};

export const useTriggerBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/system/backups/trigger');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'backups'] });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'sensitive-actions'] });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'audit-logs'] });
    }
  });
};

export const useOCRQueue = () => {
  return useQuery({
    queryKey: ['system', 'ocr-queue'],
    queryFn: async () => {
      const res = await api.get('/api/v1/system/ocr-queue');
      return res.data as OCRQueue[];
    }
  });
};
