'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Activity, Database, HardDrive, Cpu, Clock, ShieldCheck, DatabaseBackup,
  Download, Trash2, Zap, Eraser, RefreshCcw, Timer, Layers, ScanText,
  AlertTriangle, CalendarClock, Save,
} from 'lucide-react';
import {
  useSystemHealth, useDataFootprint, useBackups, useTriggerBackup, useDeleteBackup,
  usePruneBackups, downloadBackup, useVacuum, useCleanupLogs, useAutomation,
  useUpdateAutomation, useOcrQueue, type BackupRecord,
} from '@/features/system/services/system.api';
import {
  MetricCard, UsageBar, Panel, StatusDot, ActionButton, AnimatedNumber,
  fmtBytesMb, fmtUptime, fmtAgo,
} from '@/features/system/components/system-ui';

export default function SystemDashboard() {
  const { data: health, isLoading, refetch, isRefetching } = useSystemHealth();
  const { data: footprint } = useDataFootprint();

  const dbOk = health?.database_status === 'Healthy';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
          >
            <Activity size={21} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Control Center</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Live metrics, backups and automated maintenance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {health && <StatusDot ok={dbOk} label={`${health.database_engine} · ${health.database_status}`} />}
          <ActionButton icon={RefreshCcw} label="Refresh" subtle busy={isRefetching} onClick={() => refetch()} />
        </div>
      </motion.div>

      {/* ── KPI grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard index={0} isLoading={isLoading} icon={Database} tone="blue"
          label="Database" value={health?.database_size_mb ?? 0} decimals={1} suffix=" MB"
          hint={`${health?.database_latency_ms ?? 0} ms response`} />
        <MetricCard index={1} isLoading={isLoading} icon={HardDrive} tone="violet"
          label="Disk used" value={health?.disk_used_percent ?? 0} decimals={1} suffix="%"
          hint={`${health?.disk_free_gb ?? 0} GB free`} />
        <MetricCard index={2} isLoading={isLoading} icon={Clock} tone="emerald"
          label="Uptime" value={Math.floor((health?.uptime_seconds ?? 0) / 60)} suffix=" min"
          hint={fmtUptime(health?.uptime_seconds ?? 0)} />
        <MetricCard index={3} isLoading={isLoading} icon={DatabaseBackup} tone="cyan"
          label="Backups" value={health?.backup_count ?? 0}
          hint={`Last: ${fmtAgo(health?.last_backup_age_hours ?? null)}`} />
        <MetricCard index={4} isLoading={isLoading} icon={Cpu} tone="amber"
          label="CPU cores" value={health?.cpu_cores ?? 0} hint="Available to the server" />
        <MetricCard index={5} isLoading={isLoading} icon={Layers} tone="rose"
          label="Queue" value={health?.queues_pending ?? 0} hint="OCR jobs pending" />
      </div>

      {/* Backup freshness warning — actionable, not decorative */}
      <AnimatePresence>
        {health && (health.last_backup_age_hours == null || health.last_backup_age_hours > 48) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {health.last_backup_age_hours == null
                ? 'No backup has ever been taken. Run one now, or switch on the nightly schedule below.'
                : `Your last backup was ${fmtAgo(health.last_backup_age_hours)}. Consider enabling automatic nightly backups.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StoragePanel health={health} />
        <AutomationPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BackupsPanel />
        <MaintenancePanel />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <FootprintPanel rows={footprint} />
        <OcrPanel />
      </div>
    </div>
  );
}

/* ── Storage ──────────────────────────────────────────────────────────── */
function StoragePanel({ health }: { health?: ReturnType<typeof useSystemHealth>['data'] }) {
  return (
    <Panel index={0} title="Storage" subtitle="Disk and database footprint" icon={HardDrive}>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">Disk</span>
            <span className="text-zinc-500">
              {health?.disk_used_gb ?? 0} / {health?.disk_total_gb ?? 0} GB
            </span>
          </div>
          <UsageBar percent={health?.disk_used_percent ?? 0} tone="violet" />
          <p className="mt-1.5 text-xs text-zinc-400">
            <AnimatedNumber value={health?.disk_free_gb ?? 0} decimals={1} suffix=" GB" /> free
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Database file</p>
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              {fmtBytesMb(health?.database_size_mb ?? 0)}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Engine</p>
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{health?.database_engine ?? '—'}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Automation ───────────────────────────────────────────────────────── */
function AutomationPanel() {
  const { data: cfg, isLoading } = useAutomation();
  const update = useUpdateAutomation();

  const save = (patch: Record<string, unknown>) =>
    update.mutate(patch, {
      onSuccess: () => toast.success('Automation updated'),
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not save'),
    });

  return (
    <Panel
      index={1}
      title="Automation"
      subtitle="Scheduled backups and cleanup"
      icon={Zap}
      action={cfg && <StatusDot ok={cfg.scheduler_active} label={cfg.scheduler_active ? 'Scheduler running' : 'Scheduler off'} />}
    >
      {isLoading || !cfg ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="space-y-4">
          <Toggle
            label="Nightly database backup"
            hint={`Runs daily at ${String(cfg.auto_backup_hour).padStart(2, '0')}:00 and removes copies older than ${cfg.backup_retention_days} days`}
            checked={cfg.auto_backup_enabled}
            onChange={(v) => save({ auto_backup_enabled: v })}
          />
          {cfg.auto_backup_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-2 gap-3 overflow-hidden pl-1"
            >
              <NumberField label="Run at (hour)" value={cfg.auto_backup_hour} min={0} max={23}
                onCommit={(v) => save({ auto_backup_hour: v })} />
              <NumberField label="Keep for (days)" value={cfg.backup_retention_days} min={1} max={365}
                onCommit={(v) => save({ backup_retention_days: v })} />
            </motion.div>
          )}

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Toggle
              label="Automatic log cleanup"
              hint={`Prunes sessions, login history and activity logs older than ${cfg.log_retention_days} days (runs at 03:00)`}
              checked={cfg.auto_cleanup_enabled}
              onChange={(v) => save({ auto_cleanup_enabled: v })}
            />
            {cfg.auto_cleanup_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 w-1/2 overflow-hidden pl-1"
              >
                <NumberField label="Keep logs (days)" value={cfg.log_retention_days} min={7} max={730}
                  onCommit={(v) => save({ log_retention_days: v })} />
              </motion.div>
            )}
          </div>

          {!cfg.scheduler_active && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              The background scheduler isn&apos;t installed, so these run only when you trigger them manually below.
              Install <code className="font-mono">apscheduler</code> on the server to activate the schedule.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`m-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? 'ml-auto mr-0.5' : ''}`}
        />
      </button>
    </div>
  );
}

function NumberField({ label, value, min, max, onCommit }: {
  label: string; value: number; min: number; max: number; onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</label>
      <input
        type="number" min={min} max={max} value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Math.max(min, Math.min(max, Number(local) || min));
          setLocal(String(n));
          if (n !== value) onCommit(n);
        }}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

/* ── Backups ──────────────────────────────────────────────────────────── */
function BackupsPanel() {
  const { data: backups, isLoading } = useBackups();
  const trigger = useTriggerBackup();
  const del = useDeleteBackup();
  const prune = usePruneBackups();

  const rows = backups ?? [];

  const doBackup = () => trigger.mutate(undefined, {
    onSuccess: (b) => toast.success(`Backup created · ${b.size_mb} MB`),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Backup failed'),
  });

  const doDownload = async (rec: BackupRecord) => {
    try { await downloadBackup(rec); }
    catch { toast.error('That backup file is no longer on disk.'); }
  };

  const doDelete = (rec: BackupRecord) => {
    if (!confirm(`Delete ${rec.file_name}? The file is removed from disk.`)) return;
    del.mutate(rec.id, {
      onSuccess: () => toast.success('Backup deleted'),
      onError: () => toast.error('Could not delete backup'),
    });
  };

  const doPrune = () => prune.mutate(undefined, {
    onSuccess: (r) => toast.success(r.removed ? `Removed ${r.removed} old backup(s)` : 'Nothing old enough to remove'),
    onError: () => toast.error('Prune failed'),
  });

  return (
    <Panel
      index={2} title="Backups" subtitle="Real copies of the database file" icon={DatabaseBackup}
      action={
        <div className="flex gap-2">
          <ActionButton icon={Timer} label="Prune" subtle busy={prune.isPending} onClick={doPrune} />
          <ActionButton icon={Save} label="Back up now" busy={trigger.isPending} onClick={doBackup} />
        </div>
      }
    >
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No backups yet. Use &quot;Back up now&quot; to create one.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          <AnimatePresence initial={false}>
            {rows.map((b, i) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-900/25 dark:text-cyan-400">
                  <DatabaseBackup size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">{b.file_name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {fmtBytesMb(b.size_mb)} · {new Date(b.created_at.endsWith('Z') ? b.created_at : `${b.created_at}Z`).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => doDownload(b)} title="Download"
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/25">
                  <Download size={15} />
                </button>
                <button onClick={() => doDelete(b)} title="Delete"
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/25">
                  <Trash2 size={15} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}

/* ── Maintenance ──────────────────────────────────────────────────────── */
function MaintenancePanel() {
  const vacuum = useVacuum();
  const cleanup = useCleanupLogs();

  const doVacuum = () => vacuum.mutate(undefined, {
    onSuccess: (r) => toast.success(
      r.reclaimed_mb > 0
        ? `Reclaimed ${r.reclaimed_mb} MB · ${r.before_mb} → ${r.after_mb} MB`
        : 'Database already compact — nothing to reclaim',
      { duration: 5000 },
    ),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'VACUUM failed'),
  });

  const doCleanup = () => {
    if (!confirm('Permanently delete old sessions, login history, activity logs and notifications past the retention window?')) return;
    cleanup.mutate(undefined, {
      onSuccess: (r) => {
        const total = r.results.reduce((s, x) => s + x.deleted, 0);
        toast.success(total ? `Removed ${total.toLocaleString()} old rows` : 'Nothing old enough to remove', { duration: 5000 });
      },
      onError: () => toast.error('Cleanup failed'),
    });
  };

  return (
    <Panel index={3} title="Maintenance" subtitle="Run these any time — they act immediately" icon={Eraser}>
      <div className="space-y-3">
        <TaskRow
          icon={Zap} tone="text-violet-600 bg-violet-50 dark:bg-violet-900/25 dark:text-violet-400"
          title="Compact database"
          desc="Rebuilds the file to reclaim space freed by deleted rows (VACUUM)."
          action={<ActionButton icon={Zap} label="Run" subtle busy={vacuum.isPending} onClick={doVacuum} />}
        />
        <TaskRow
          icon={Eraser} tone="text-amber-600 bg-amber-50 dark:bg-amber-900/25 dark:text-amber-400"
          title="Clean old logs"
          desc="Prunes sessions, login history, activity logs and notifications past retention."
          action={<ActionButton icon={Eraser} label="Run" subtle busy={cleanup.isPending} onClick={doCleanup} />}
        />
      </div>
    </Panel>
  );
}

function TaskRow({ icon: Icon, tone, title, desc, action }: {
  icon: typeof Zap; tone: string; title: string; desc: string; action: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
          <p className="text-xs text-zinc-400">{desc}</p>
        </div>
      </div>
      {action}
    </motion.div>
  );
}

/* ── Data footprint ───────────────────────────────────────────────────── */
function FootprintPanel({ rows }: { rows?: { table: string; label: string; rows: number }[] }) {
  const data = rows ?? [];
  const max = Math.max(1, ...data.map((r) => r.rows));
  return (
    <Panel index={4} title="Data footprint" subtitle="Row counts across core tables" icon={Layers}>
      {data.length === 0 ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="space-y-2.5">
          {data.map((r, i) => (
            <motion.div
              key={r.table}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{r.label}</span>
                <span className="font-mono font-semibold text-zinc-500">
                  <AnimatedNumber value={r.rows} />
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.rows / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ── OCR queue ────────────────────────────────────────────────────────── */
function OcrPanel() {
  const { data, isLoading } = useOcrQueue();
  const jobs = data ?? [];
  const pending = jobs.filter((j) => ['Pending', 'Processing'].includes(j.status)).length;

  return (
    <Panel
      index={5} title="OCR queue" subtitle="Background prescription extraction" icon={ScanText}
      action={<span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{pending} pending</span>}
    >
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : jobs.length === 0 ? (
        <div className="py-10 text-center">
          <CalendarClock size={30} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm text-zinc-400">Queue is empty — no jobs waiting.</p>
        </div>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {jobs.slice(0, 25).map((j, i) => (
            <motion.li
              key={j.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <ShieldCheck size={15} className="shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">{j.file_path}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                j.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
                : j.status === 'Failed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
              }`}>{j.status}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
