import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/compliance';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ComplianceKpis {
  total_events: number;
  events_24h: number;
  high_severity: number;
  sensitive_actions: number;
  distinct_actors: number;
  oldest_record: string | null;
  logins_24h: number;
  failed_logins_24h: number;
  failed_logins_7d: number;
  activity_log_count: number;
  login_history_count: number;
}

export interface ComplianceOverview {
  kpis: ComplianceKpis;
  severity: { severity: string; count: number }[];
  event_types: { event_type: string; count: number }[];
  timeline: { date: string; count: number }[];
}

export interface AuditEntry {
  id: string;
  event_type: string;
  severity: string;
  staff_id: string;
  staff_name: string;
  branch_id: string;
  branch_name: string | null;
  transaction_id: string | null;
  metadata: Record<string, unknown>;
  is_sensitive: boolean;
  created_at: string;
}

export interface AuditTrailPage {
  total: number;
  limit: number;
  offset: number;
  items: AuditEntry[];
}

export interface SecuritySignal {
  level: 'ok' | 'medium' | 'high';
  title: string;
  detail: string;
}

export interface LoginEntry {
  id: string;
  user: string;
  event_type: string;
  success: boolean;
  failure_reason: string | null;
  ip_address: string | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  created_at: string;
}

export interface RetentionPolicy {
  audit_events_retention_days: number;
  login_history_retention_days: number;
  activity_log_retention_days: number;
  auto_purge_enabled: boolean;
}

export interface AuditFilters {
  search?: string;
  severity?: string;
  event_type?: string;
  days?: number;
  sensitive_only?: boolean;
  limit?: number;
  offset?: number;
}

const cleanParams = (f: AuditFilters) =>
  Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== false),
  );

// ── Queries ───────────────────────────────────────────────────────────────────
export const useComplianceOverview = () =>
  useQuery({
    queryKey: ['compliance', 'overview'],
    queryFn: async () => (await api.get<ComplianceOverview>(`${BASE}/overview`)).data,
    refetchInterval: 60_000,
    retry: false,
  });

export const useSecuritySignals = () =>
  useQuery({
    queryKey: ['compliance', 'signals'],
    queryFn: async () => (await api.get<SecuritySignal[]>(`${BASE}/security-signals`)).data,
    retry: false,
  });

export const useAuditTrail = (filters: AuditFilters) =>
  useQuery({
    queryKey: ['compliance', 'audit-trail', filters],
    queryFn: async () =>
      (await api.get<AuditTrailPage>(`${BASE}/audit-trail`, { params: cleanParams(filters) })).data,
    placeholderData: keepPreviousData,
    retry: false,
  });

export const useLoginHistory = (onlyFailed = false, limit = 100) =>
  useQuery({
    queryKey: ['compliance', 'login-history', onlyFailed, limit],
    queryFn: async () =>
      (await api.get<LoginEntry[]>(`${BASE}/login-history`, { params: { only_failed: onlyFailed, limit } })).data,
    retry: false,
  });

export const useRetention = () =>
  useQuery({
    queryKey: ['compliance', 'retention'],
    queryFn: async () => (await api.get<RetentionPolicy>(`${BASE}/retention`)).data,
    retry: false,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────
export const useUpdateRetention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<RetentionPolicy>) =>
      (await api.put<RetentionPolicy>(`${BASE}/retention`, patch)).data,
    onSuccess: (data) => qc.setQueryData(['compliance', 'retention'], data),
  });
};

export const usePurgeExpired = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post<{ results: { table: string; label: string; deleted: number; keep_days: number }[] }>(
        `${BASE}/retention/purge`,
      )).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });
};

/** Streams the filtered audit trail to the browser as a CSV download. */
export async function exportAuditCsv(filters: AuditFilters) {
  const res = await api.get(`${BASE}/audit-trail/export`, {
    params: cleanParams(filters),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
