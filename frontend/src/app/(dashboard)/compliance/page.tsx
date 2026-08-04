'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ShieldCheck, ShieldAlert, Activity, AlertTriangle, CheckCircle2, Users,
  LogIn, Download, Search, Filter, RefreshCcw, Trash2, Clock, FileClock,
  ChevronLeft, ChevronRight, Info, Loader2, Fingerprint,
} from 'lucide-react';
import {
  useComplianceOverview, useSecuritySignals, useAuditTrail, useLoginHistory,
  useRetention, useUpdateRetention, usePurgeExpired, exportAuditCsv,
  type AuditFilters, type AuditEntry,
} from '@/features/compliance/services/compliance.api';
import {
  MetricCard, Panel, ActionButton, AnimatedNumber, UsageBar,
} from '@/features/system/components/system-ui';

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
  high: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  low: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
};

const fmtWhen = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(/[Z+]/.test(v.slice(10)) ? v : `${v}Z`);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-PK', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const prettyType = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Shared empty/error state so a failed call never renders a blank panel. */
function LoadState({ isLoading, error, empty, emptyText, children }: {
  isLoading: boolean; error: unknown; empty: boolean; emptyText: string; children: React.ReactNode;
}) {
  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;
  if (error) {
    const detail = (error as any)?.response?.data?.detail;
    const status = (error as any)?.response?.status;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800/50 dark:bg-rose-900/20">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
            {status === 403 ? "You don't have permission to view this" : 'Could not load this section'}
          </p>
          <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-300">
            {typeof detail === 'string' ? detail : 'The server rejected the request. Try refreshing.'}
          </p>
        </div>
      </div>
    );
  }
  if (empty) return <p className="py-10 text-center text-sm text-zinc-400">{emptyText}</p>;
  return <>{children}</>;
}

export default function CompliancePage() {
  const { data, isLoading, error, refetch, isRefetching } = useComplianceOverview();
  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
          >
            <ShieldCheck size={21} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Compliance Center</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Immutable audit trail, risk signals and retention policy
            </p>
          </div>
        </div>
        <ActionButton icon={RefreshCcw} label="Refresh" subtle busy={isRefetching} onClick={() => refetch()} />
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard index={0} isLoading={isLoading} icon={Activity} tone="blue"
          label="Total events" value={k?.total_events ?? 0} hint={`${k?.events_24h ?? 0} in last 24h`} />
        <MetricCard index={1} isLoading={isLoading} icon={ShieldAlert} tone="rose"
          label="High severity" value={k?.high_severity ?? 0} hint="Needs review" />
        <MetricCard index={2} isLoading={isLoading} icon={Fingerprint} tone="amber"
          label="Sensitive" value={k?.sensitive_actions ?? 0} hint="Voids, exports, deletions" />
        <MetricCard index={3} isLoading={isLoading} icon={Users} tone="violet"
          label="Actors" value={k?.distinct_actors ?? 0} hint="Distinct staff on record" />
        <MetricCard index={4} isLoading={isLoading} icon={LogIn} tone="emerald"
          label="Sign-ins 24h" value={k?.logins_24h ?? 0} hint={`${k?.failed_logins_7d ?? 0} failed this week`} />
        <MetricCard index={5} isLoading={isLoading} icon={AlertTriangle} tone="cyan"
          label="Failed 24h" value={k?.failed_logins_24h ?? 0} hint="Sign-in failures" />
      </div>

      {error && (
        <LoadState isLoading={false} error={error} empty={false} emptyText="">
          <span />
        </LoadState>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><TrendPanel timeline={data?.timeline} /></div>
        <SignalsPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SeverityPanel severity={data?.severity} eventTypes={data?.event_types} />
        <RetentionPanel />
      </div>

      <AuditTrailPanel />
      <LoginPanel />
    </div>
  );
}

/* ── Trend ────────────────────────────────────────────────────────────── */
function TrendPanel({ timeline }: { timeline?: { date: string; count: number }[] }) {
  const data = timeline ?? [];
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Panel index={0} title="Event volume" subtitle="Audit events recorded per day (last 14 days)" icon={Activity}>
      {data.length === 0 ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="flex h-40 items-end gap-1.5">
          {data.map((d, i) => (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                transition={{ duration: 0.7, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 transition-opacity group-hover:opacity-80"
              />
              <span className="text-[9px] text-zinc-400">{d.date.slice(8)}</span>
              <span className="pointer-events-none absolute -top-7 rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ── Security signals ─────────────────────────────────────────────────── */
function SignalsPanel() {
  const { data, isLoading, error } = useSecuritySignals();
  const signals = data ?? [];

  const style = (lvl: string) =>
    lvl === 'high' ? 'border-rose-200 bg-rose-50 dark:border-rose-800/50 dark:bg-rose-900/20'
    : lvl === 'medium' ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20'
    : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20';

  const Icon = (lvl: string) => lvl === 'ok' ? CheckCircle2 : lvl === 'high' ? ShieldAlert : AlertTriangle;
  const iconTone = (lvl: string) =>
    lvl === 'high' ? 'text-rose-500' : lvl === 'medium' ? 'text-amber-500' : 'text-emerald-500';

  return (
    <Panel index={1} title="Risk signals" subtitle="Derived from your live audit data" icon={ShieldAlert}>
      <LoadState isLoading={isLoading} error={error} empty={signals.length === 0} emptyText="No signals.">
        <div className="space-y-2.5">
          {signals.map((s, i) => {
            const I = Icon(s.level);
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-start gap-3 rounded-xl border p-3 ${style(s.level)}`}
              >
                <I size={16} className={`mt-0.5 shrink-0 ${iconTone(s.level)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{s.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{s.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </LoadState>
    </Panel>
  );
}

/* ── Severity + types ─────────────────────────────────────────────────── */
function SeverityPanel({ severity, eventTypes }: {
  severity?: { severity: string; count: number }[];
  eventTypes?: { event_type: string; count: number }[];
}) {
  const sev = severity ?? [];
  const types = eventTypes ?? [];
  const sevTotal = Math.max(1, sev.reduce((s, r) => s + r.count, 0));
  const typeMax = Math.max(1, ...types.map((t) => t.count));

  return (
    <Panel index={2} title="Breakdown" subtitle="By severity and event type" icon={Filter}>
      {sev.length === 0 ? (
        <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="space-y-5">
          <div className="space-y-2.5">
            {sev.map((r) => (
              <div key={r.severity}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.low}`}>
                    {prettyType(r.severity)}
                  </span>
                  <span className="font-mono text-zinc-500"><AnimatedNumber value={r.count} /></span>
                </div>
                <UsageBar percent={(r.count / sevTotal) * 100}
                  tone={r.severity === 'high' || r.severity === 'critical' ? 'rose' : r.severity === 'medium' ? 'amber' : 'blue'} />
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Top event types</p>
            <div className="space-y-2">
              {types.map((t, i) => (
                <motion.div key={t.event_type}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{prettyType(t.event_type)}</span>
                    <span className="font-mono text-zinc-500">{t.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${(t.count / typeMax) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ── Retention ────────────────────────────────────────────────────────── */
function RetentionPanel() {
  const { data: cfg, isLoading, error } = useRetention();
  const update = useUpdateRetention();
  const purge = usePurgeExpired();

  const save = (patch: Record<string, unknown>) =>
    update.mutate(patch, {
      onSuccess: () => toast.success('Retention policy updated'),
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not save policy'),
    });

  const doPurge = () => {
    if (!confirm('Permanently delete audit records older than the retention window?\n\nThis cannot be undone.')) return;
    purge.mutate(undefined, {
      onSuccess: (r) => {
        const total = r.results.reduce((s, x) => s + x.deleted, 0);
        toast.success(total ? `Purged ${total.toLocaleString()} expired records` : 'Nothing past retention yet', { duration: 5000 });
      },
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Purge failed'),
    });
  };

  const FIELDS = [
    { key: 'audit_events_retention_days', label: 'Audit events', hint: 'Voids, expiry, exports' },
    { key: 'login_history_retention_days', label: 'Login history', hint: 'Sign-in attempts' },
    { key: 'activity_log_retention_days', label: 'Activity logs', hint: 'Account admin actions' },
  ] as const;

  return (
    <Panel
      index={3} title="Data retention" subtitle="How long each trail is kept" icon={FileClock}
      action={<ActionButton icon={Trash2} label="Purge now" danger busy={purge.isPending} onClick={doPurge} />}
    >
      <LoadState isLoading={isLoading} error={error} empty={!cfg} emptyText="No policy found.">
        {cfg && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <RetentionField
                  key={f.key} label={f.label} hint={f.hint}
                  value={Number(cfg[f.key])}
                  onCommit={(v) => save({ [f.key]: v })}
                />
              ))}
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
              <Info size={13} className="mt-0.5 shrink-0" />
              Purging is permanent. Export the trail to CSV first if you need an archive for auditors.
            </p>
          </div>
        )}
      </LoadState>
    </Panel>
  );
}

function RetentionField({ label, hint, value, onCommit }: {
  label: string; hint: string; value: number; onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  return (
    <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{label}</p>
      <p className="mb-2 text-[11px] text-zinc-400">{hint}</p>
      <div className="flex items-center gap-1.5">
        <input
          type="number" min={7} max={3650} value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const n = Math.max(7, Math.min(3650, Number(local) || 7));
            setLocal(String(n));
            if (n !== value) onCommit(n);
          }}
          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="shrink-0 text-xs text-zinc-400">days</span>
      </div>
    </div>
  );
}

/* ── Audit trail ──────────────────────────────────────────────────────── */
const PAGE = 25;

function AuditTrailPanel() {
  const [filters, setFilters] = useState<AuditFilters>({ limit: PAGE, offset: 0 });
  const [searchBox, setSearchBox] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, error } = useAuditTrail(filters);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor((filters.offset ?? 0) / PAGE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const patch = (p: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...p, offset: 0 }));

  const doExport = async () => {
    setExporting(true);
    try {
      await exportAuditCsv({ ...filters, limit: undefined, offset: undefined });
      toast.success('Audit trail exported');
    } catch (e: any) {
      toast.error(e?.response?.status === 403
        ? 'You need the compliance:export permission to download the trail.'
        : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const select = 'rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900';

  return (
    <Panel
      index={4} title="Audit trail" subtitle={`${total.toLocaleString()} recorded events`} icon={FileClock}
      action={<ActionButton icon={exporting ? Loader2 : Download} label="Export CSV" subtle busy={exporting} onClick={doExport} />}
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchBox}
            onChange={(e) => setSearchBox(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') patch({ search: searchBox || undefined }); }}
            onBlur={() => patch({ search: searchBox || undefined })}
            placeholder="Search event, staff or transaction…"
            className={`${select} w-full pl-9`}
          />
        </div>
        <select className={select} value={filters.severity ?? ''} onChange={(e) => patch({ severity: e.target.value || undefined })}>
          <option value="">All severities</option>
          {['critical', 'high', 'medium', 'low'].map((s) => <option key={s} value={s}>{prettyType(s)}</option>)}
        </select>
        <select className={select} value={filters.days ?? ''} onChange={(e) => patch({ days: e.target.value ? Number(e.target.value) : undefined })}>
          <option value="">All time</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button
          onClick={() => patch({ sensitive_only: !filters.sensitive_only })}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            filters.sensitive_only
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              : 'border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
          }`}
        >
          Sensitive only
        </button>
      </div>

      <LoadState isLoading={isLoading} error={error} empty={rows.length === 0}
        emptyText="No events match these filters.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                {['When', 'Event', 'Severity', 'Staff', 'Branch', 'Reference'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              <AnimatePresence initial={false}>
                {rows.map((r: AuditEntry, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.25) }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{fmtWhen(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        {prettyType(r.event_type)}
                        {r.is_sensitive && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 ring-1 ring-inset ring-amber-300 dark:text-amber-300 dark:ring-amber-700">
                            sensitive
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.low}`}>
                        {prettyType(r.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.staff_name}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.branch_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {r.transaction_id ? r.transaction_id.slice(0, 8) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-zinc-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - PAGE) }))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + PAGE }))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </LoadState>
    </Panel>
  );
}

/* ── Login history ────────────────────────────────────────────────────── */
function LoginPanel() {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const { data, isLoading, error } = useLoginHistory(onlyFailed, 50);
  const rows = data ?? [];

  return (
    <Panel
      index={5} title="Sign-in history" subtitle="Who signed in, from where and on what device" icon={LogIn}
      action={
        <button
          onClick={() => setOnlyFailed((v) => !v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            onlyFailed
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
              : 'border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
          }`}
        >
          {onlyFailed ? 'Showing failures' : 'Failures only'}
        </button>
      }
    >
      <LoadState isLoading={isLoading} error={error} empty={rows.length === 0}
        emptyText={onlyFailed ? 'No failed sign-ins recorded.' : 'No sign-in history recorded yet.'}>
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {rows.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                r.success
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-900/25 dark:text-rose-400'
              }`}>
                {r.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{r.user}</p>
                <p className="truncate text-[11px] text-zinc-400">
                  {[r.ip_address, r.browser, r.os].filter(Boolean).join(' · ') || 'Unknown device'}
                  {r.failure_reason ? ` — ${r.failure_reason}` : ''}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-400">
                <Clock size={11} className="mr-1 inline" />{fmtWhen(r.created_at)}
              </span>
            </motion.li>
          ))}
        </ul>
      </LoadState>
    </Panel>
  );
}
