import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/system';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SystemHealth {
  database_status: string;
  database_engine: string;
  database_latency_ms: number;
  database_size_mb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_used_percent: number;
  cpu_cores: number;
  uptime_seconds: number;
  queues_pending: number;
  last_backup_at: string | null;
  last_backup_age_hours: number | null;
  backup_count: number;
  scheduler_active: boolean;
}

export interface FootprintRow { table: string; label: string; rows: number }

export interface BackupRecord {
  id: string;
  file_name: string;
  size_mb: number;
  status: string;
  created_by: string;
  created_at: string;
}

export interface AutomationConfig {
  auto_backup_enabled: boolean;
  auto_backup_hour: number;
  backup_retention_days: number;
  auto_cleanup_enabled: boolean;
  log_retention_days: number;
  scheduler_active: boolean;
}

export interface OcrJob {
  id: string;
  file_path: string;
  status: string;
  extracted_text?: string | null;
  created_at: string;
  processed_at?: string | null;
}

// ── Health ────────────────────────────────────────────────────────────────────
export const useSystemHealth = (refetchMs = 15_000) =>
  useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => (await api.get<SystemHealth>(`${BASE}/health`)).data,
    refetchInterval: refetchMs,
    retry: false,
  });

export const useDataFootprint = () =>
  useQuery({
    queryKey: ['system', 'footprint'],
    queryFn: async () => (await api.get<FootprintRow[]>(`${BASE}/data-footprint`)).data,
    retry: false,
  });

// ── Backups ───────────────────────────────────────────────────────────────────
export const useBackups = () =>
  useQuery({
    queryKey: ['system', 'backups'],
    queryFn: async () => (await api.get<BackupRecord[]>(`${BASE}/backups`)).data,
    retry: false,
  });

const invalidateSystem = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['system', 'backups'] });
  qc.invalidateQueries({ queryKey: ['system', 'health'] });
};

export const useTriggerBackup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<BackupRecord>(`${BASE}/backups/trigger`)).data,
    onSuccess: () => invalidateSystem(qc),
  });
};

export const useDeleteBackup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`${BASE}/backups/${id}`); },
    onSuccess: () => invalidateSystem(qc),
  });
};

export const usePruneBackups = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keep_days?: number) =>
      (await api.post<{ removed: number; keep_days: number }>(`${BASE}/backups/prune`, { keep_days })).data,
    onSuccess: () => invalidateSystem(qc),
  });
};

/** Streams the backup file to the browser as a download. */
export async function downloadBackup(record: BackupRecord) {
  const res = await api.get(`${BASE}/backups/${record.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = record.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Maintenance ───────────────────────────────────────────────────────────────
export interface VacuumResult { before_mb: number; after_mb: number; reclaimed_mb: number }
export interface CleanupResult {
  keep_days: number;
  results: { table: string; label: string; deleted: number }[];
}

export const useVacuum = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<VacuumResult>(`${BASE}/maintenance/vacuum`)).data,
    onSuccess: () => invalidateSystem(qc),
  });
};

export const useCleanupLogs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keep_days?: number) =>
      (await api.post<CleanupResult>(`${BASE}/maintenance/cleanup`, { keep_days })).data,
    onSuccess: () => invalidateSystem(qc),
  });
};

// ── Automation ────────────────────────────────────────────────────────────────
export const useAutomation = () =>
  useQuery({
    queryKey: ['system', 'automation'],
    queryFn: async () => (await api.get<AutomationConfig>(`${BASE}/automation`)).data,
    retry: false,
  });

export const useUpdateAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AutomationConfig>) =>
      (await api.patch<AutomationConfig>(`${BASE}/automation`, patch)).data,
    onSuccess: (data) => {
      qc.setQueryData(['system', 'automation'], data);
      qc.invalidateQueries({ queryKey: ['system', 'health'] });
    },
  });
};

// ── OCR queue ─────────────────────────────────────────────────────────────────
export const useOcrQueue = () =>
  useQuery({
    queryKey: ['system', 'ocr-queue'],
    queryFn: async () => (await api.get<OcrJob[]>(`${BASE}/ocr-queue`)).data,
    refetchInterval: 20_000,
    retry: false,
  });

// ── Names used by the older sub-pages, kept so they keep compiling ────────────
export const useOCRQueue = useOcrQueue;
export type OCRQueue = OcrJob;
export type BackupHistory = BackupRecord;
