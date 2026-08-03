'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Wallet, CalendarCheck, GraduationCap, CalendarDays,
  BadgeCheck, Clock, Plus, X, Loader2, ReceiptText, Printer,
} from 'lucide-react';
import {
  useMyHrProfile, useMyPayroll, useMyLeaves, useMyTraining,
  useMyAttendanceSummary, useApplyLeave,
  type MyPayslip,
} from '@/features/hr/services/hr.api';
import { useAuthStore } from '@/stores/auth-store';

const rs = (n: number | null | undefined) =>
  `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Tab = 'payroll' | 'attendance' | 'leaves' | 'training';
const TABS: { key: Tab; label: string; icon: typeof Wallet }[] = [
  { key: 'payroll', label: 'My Salary Slips', icon: Wallet },
  { key: 'attendance', label: 'My Attendance', icon: CalendarCheck },
  { key: 'leaves', label: 'My Leaves', icon: CalendarDays },
  { key: 'training', label: 'My Training', icon: GraduationCap },
];

const statusChip = (s: string) => {
  const v = (s || '').toLowerCase();
  if (['approved', 'paid', 'present', 'passed', 'completed'].includes(v))
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800';
  if (['pending', 'draft', 'late', 'upcoming', 'ongoing'].includes(v))
    return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800';
  if (['rejected', 'absent', 'failed', 'cancelled'].includes(v))
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800';
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700';
};

export default function MyHrPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('payroll');
  const [slip, setSlip] = useState<MyPayslip | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const { data: profile, isLoading: pLoad, isError: pErr } = useMyHrProfile();

  if (pErr) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20">
          <User size={26} />
        </div>
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">No employee record linked</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your login isn&apos;t connected to an HR employee profile yet. Please contact your HR / owner.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      {/* ── Profile hero ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-600 p-6 text-white shadow-lg dark:border-zinc-800"
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black ring-1 ring-white/30 backdrop-blur">
            {(profile?.name || user?.username || 'U')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Employee Self-Service</p>
            <h1 className="truncate text-2xl font-extrabold leading-tight">
              {pLoad ? 'Loading…' : profile?.name || user?.username}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
              {profile?.designation && <span className="flex items-center gap-1"><BadgeCheck size={14} />{profile.designation}</span>}
              {profile?.department && <span>· {profile.department}</span>}
              {profile?.employee_code && <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold">{profile.employee_code}</span>}
            </div>
          </div>
          {profile?.joining_date && (
            <div className="rounded-2xl bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Joined</p>
              <p className="text-sm font-bold">{profile.joining_date}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'text-white shadow-md'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
              }`}
              style={active ? { background: 'linear-gradient(to bottom right, var(--brand), var(--brand-strong, var(--brand)))' } : undefined}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Panels ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'payroll' && <PayrollPanel onView={setSlip} />}
          {tab === 'attendance' && <AttendancePanel />}
          {tab === 'leaves' && <LeavesPanel onApply={() => setLeaveOpen(true)} />}
          {tab === 'training' && <TrainingPanel />}
        </motion.div>
      </AnimatePresence>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {slip && <PayslipModal slip={slip} employeeName={profile?.name} onClose={() => setSlip(null)} />}
        {leaveOpen && <ApplyLeaveModal onClose={() => setLeaveOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────── Payroll ────────────────────────── */
function PayrollPanel({ onView }: { onView: (s: MyPayslip) => void }) {
  const { data, isLoading } = useMyPayroll();
  if (isLoading) return <SkeletonList />;
  if (!data?.length) return <Empty icon={Wallet} text="No salary slips have been generated yet." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((p) => (
        <div key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{MONTHS[p.month]} {p.year}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusChip(p.status)}`}>{p.status}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"><ReceiptText size={18} /></div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Net Pay</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{rs(p.net_pay)}</p>
            </div>
            <button onClick={() => onView(p)} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-zinc-900">
              View Slip
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PayslipModal({ slip, employeeName, onClose }: { slip: MyPayslip; employeeName?: string; onClose: () => void }) {
  const rows: [string, number, boolean?][] = [
    ['Base Salary', slip.base_salary],
    ['Allowances', slip.allowances],
    ['Overtime', slip.overtime],
    ['Bonuses', slip.bonuses],
    ['Deductions', -Math.abs(slip.deductions), true],
    ['Tax', -Math.abs(slip.tax), true],
  ];
  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">Salary Slip</p>
              <p className="text-lg font-bold">{MONTHS[slip.month]} {slip.year}</p>
              {employeeName && <p className="text-sm text-white/85">{employeeName}</p>}
            </div>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/15"><X size={18} /></button>
          </div>
        </div>
        <div className="space-y-2 p-5">
          {rows.map(([label, val, neg]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">{label}</span>
              <span className={neg ? 'font-medium text-red-500' : 'font-medium text-zinc-800 dark:text-zinc-100'}>{rs(val)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-700">
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Net Pay</span>
            <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">{rs(slip.net_pay)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"><Printer size={14} /> Print</button>
        </div>
      </motion.div>
    </Overlay>
  );
}

/* ────────────────────────── Attendance ────────────────────────── */
function AttendancePanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const { data, isLoading } = useMyAttendanceSummary(month, year);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900">
          {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m} {year}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Present" value={data?.present ?? 0} tone="emerald" />
        <Stat label="Absent" value={data?.absent ?? 0} tone="red" />
        <Stat label="Total Marked" value={data?.total ?? 0} tone="teal" />
      </div>
      {isLoading ? <SkeletonList /> : !data?.records?.length ? (
        <Empty icon={CalendarCheck} text="No attendance has been marked for this month." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {data.records.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 text-sm last:border-0 dark:border-zinc-800">
              <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200"><Clock size={14} className="text-zinc-400" />{String(r.date)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusChip(r.status)}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Leaves ────────────────────────── */
function LeavesPanel({ onApply }: { onApply: () => void }) {
  const { data, isLoading } = useMyLeaves();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-500">View your leave requests and submit a new one.</p>
        <button onClick={onApply} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: 'linear-gradient(to bottom right, var(--brand), var(--brand-strong, var(--brand)))' }}>
          <Plus size={16} /> Apply Leave
        </button>
      </div>
      {isLoading ? <SkeletonList /> : !data?.length ? (
        <Empty icon={CalendarDays} text="You haven't submitted any leave requests yet." />
      ) : (
        <div className="space-y-2">
          {data.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{l.leave_type}</p>
                <p className="text-xs text-zinc-400">{l.start_date} → {l.end_date}</p>
                {l.reason && <p className="mt-0.5 text-xs text-zinc-500">{l.reason}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusChip(l.status)}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplyLeaveModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
  const apply = useApplyLeave();
  const submit = () => {
    if (!form.start_date || !form.end_date) { toast.error('Please pick start and end dates.'); return; }
    if (form.end_date < form.start_date) { toast.error('End date cannot be before start date.'); return; }
    apply.mutate(form, {
      onSuccess: () => { toast.success('Leave request submitted.'); onClose(); },
      onError: () => toast.error('Could not submit leave request.'),
    });
  };
  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Apply for Leave</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500">Leave Type</label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
              {['Casual', 'Sick', 'Annual', 'Unpaid', 'Emergency'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-500">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-500">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3}
              placeholder="Reason for leave…"
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
          <button onClick={submit} disabled={apply.isPending}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(to bottom right, var(--brand), var(--brand-strong, var(--brand)))' }}>
            {apply.isPending && <Loader2 size={15} className="animate-spin" />} Submit Request
          </button>
        </div>
      </motion.div>
    </Overlay>
  );
}

/* ────────────────────────── Training ────────────────────────── */
function TrainingPanel() {
  const { data, isLoading } = useMyTraining();
  if (isLoading) return <SkeletonList />;
  if (!data?.length) return <Empty icon={GraduationCap} text="You aren't enrolled in any training programs yet." />;
  return (
    <div className="space-y-2">
      {data.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">{t.title}</p>
            <p className="text-xs text-zinc-400">
              {t.trainer ? `Trainer: ${t.trainer} · ` : ''}{t.start_date || '—'}{t.end_date ? ` → ${t.end_date}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusChip(t.my_status)}`}>{t.my_status}</span>
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">{t.program_status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────── Shared bits ────────────────────────── */
function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'teal' }) {
  const tones = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    teal: 'text-teal-600 dark:text-teal-400',
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Wallet; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800"><Icon size={22} /></div>
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}
