'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '../types/hr';
import {
  useDepartments, useDesignations, useShifts,
  useEmployeePayroll, useEmployeeTraining,
  useEmployeeDocuments, usePerformanceReviews, useEmployeeTasks,
  useMonthlyAttendance,
} from '../services/hr.api';
import {
  X, CalendarDays, Receipt, GraduationCap, FolderOpen, Target, CheckSquare,
  Activity, User, Mail, Phone, IdCard, Cake, Users as UsersIcon, MapPin,
  Building2, BadgeCheck, Clock, CalendarPlus, Banknote, Loader2, Star, Flag,
  ExternalLink, FileText, LogIn, LogOut,
} from 'lucide-react';
import AttendanceLogs from './AttendanceLogs';
import LeavesList from './LeavesList';

interface ViewEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: User },
  { value: 'attendance', label: 'Attendance', icon: CalendarDays },
  { value: 'leave', label: 'Leave', icon: CalendarPlus },
  { value: 'payroll', label: 'Payroll', icon: Receipt },
  { value: 'documents', label: 'Documents', icon: FolderOpen },
  { value: 'performance', label: 'Performance', icon: Target },
  { value: 'training', label: 'Training', icon: GraduationCap },
  { value: 'tasks', label: 'Tasks', icon: CheckSquare },
  { value: 'activity', label: 'Activity', icon: Activity },
];

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const rs = (n?: number | null) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(Number(n || 0));

const chip = (s?: string) => {
  const v = (s || '').toLowerCase();
  if (['approved', 'paid', 'present', 'passed', 'completed', 'verified', 'active'].includes(v))
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800';
  if (['pending', 'draft', 'late', 'upcoming', 'ongoing', 'in progress', 'submitted'].includes(v))
    return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800';
  if (['rejected', 'absent', 'failed', 'cancelled', 'expired'].includes(v))
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800';
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700';
};

function Pill({ value }: { value?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${chip(value)}`}>{value || '—'}</span>;
}

export default function ViewEmployeeModal({ employee, onClose }: ViewEmployeeModalProps) {
  const [tab, setTab] = useState('overview');

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();

  const deptName = departments?.find(d => d.id === employee.department_id)?.name || '—';
  const desigName = designations?.find(d => d.id === employee.designation_id)?.name || '—';
  const shiftName = shifts?.find(s => s.id === employee.shift_id)?.name || '—';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:h-[92vh] sm:max-w-6xl sm:rounded-2xl"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3 sm:items-center sm:gap-4">
            <motion.div
              initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-black ring-1 ring-white/30 backdrop-blur sm:h-14 sm:w-14 sm:text-xl"
            >
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </motion.div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold leading-tight sm:text-2xl">
                {employee.first_name} {employee.last_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                <span className="rounded-md bg-white/20 px-2 py-0.5 font-bold">{employee.employee_id}</span>
                {employee.username && <span className="text-white/85">@{employee.username}</span>}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${employee.is_active ? 'bg-white/25' : 'bg-red-900/40'}`}>
                  {employee.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-white/80 sm:text-sm">{desigName} · {deptName}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Tabs (scrollable on mobile, animated indicator) ─────────── */}
        <div className="shrink-0 border-b border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-950 sm:px-4">
          <div className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <t.icon size={15} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label}</span>
                  {active && (
                    <motion.span layoutId="emp-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-zinc-50/60 p-4 dark:bg-zinc-900/30 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'overview' && (
                <OverviewTab employee={employee} deptName={deptName} desigName={desigName} shiftName={shiftName} />
              )}
              {tab === 'attendance' && (
                <Panel noPad><AttendanceLogs employeeId={employee.id} hideFilters /></Panel>
              )}
              {tab === 'leave' && (
                <Panel><LeavesList employeeId={employee.id} hideHeader /></Panel>
              )}
              {tab === 'payroll' && <PayrollTab employeeId={employee.id} />}
              {tab === 'documents' && <DocumentsTab employeeId={employee.id} />}
              {tab === 'performance' && <PerformanceTab employeeId={employee.id} />}
              {tab === 'training' && <TrainingTab employeeId={employee.id} />}
              {tab === 'tasks' && <TasksTab employeeId={employee.id} />}
              {tab === 'activity' && <ActivityTab employeeId={employee.id} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── shared shells ───────────────────────────────────────────────── */
function Panel({ children, noPad = false }: { children: React.ReactNode; noPad?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${noPad ? '' : 'p-4 sm:p-5'}`}>
      {children}
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>{headers.map((h, i) => <th key={`${h}-${i}`} className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const td = 'px-4 py-3 sm:px-6 sm:py-4';
const tr = 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50';

function Loading({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" /></td></tr>;
}
function EmptyState({ cols, icon: Icon, text }: { cols: number; icon: typeof User; text: string }) {
  return (
    <tr><td colSpan={cols} className="px-6 py-14 text-center">
      <Icon size={34} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
      <p className="text-sm text-zinc-400">{text}</p>
    </td></tr>
  );
}

/* ── Overview ────────────────────────────────────────────────────── */
function OverviewTab({ employee, deptName, desigName, shiftName }: {
  employee: Employee; deptName: string; desigName: string; shiftName: string;
}) {
  const personal = [
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Phone', value: employee.phone },
    { icon: IdCard, label: 'CNIC', value: employee.cnic },
    { icon: Cake, label: 'Date of Birth', value: employee.dob },
    { icon: UsersIcon, label: 'Gender', value: employee.gender },
    { icon: MapPin, label: 'Address', value: employee.address },
  ];
  const employment = [
    { icon: Building2, label: 'Department', value: deptName },
    { icon: BadgeCheck, label: 'Designation', value: desigName },
    { icon: Clock, label: 'Shift', value: shiftName },
    { icon: CalendarPlus, label: 'Date of Joining', value: employee.join_date },
    { icon: Banknote, label: 'Base Salary', value: employee.base_salary ? rs(employee.base_salary) : null },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <InfoCard title="Personal Information" icon={User} rows={personal} />
      <InfoCard title="Employment Details" icon={FolderOpen} rows={employment} />
    </div>
  );
}

function InfoCard({ title, icon: Icon, rows }: {
  title: string; icon: typeof User; rows: { icon: typeof User; label: string; value?: string | null }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          <Icon size={16} />
        </div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-3 px-4 py-3 sm:px-5"
          >
            <r.icon size={15} className="mt-0.5 shrink-0 text-zinc-400" />
            <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">{r.label}</span>
            <span className="ml-auto break-words text-right text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {r.value || '—'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Payroll ─────────────────────────────────────────────────────── */
function PayrollTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeePayroll(employeeId);
  const rows = data ?? [];
  return (
    <Table headers={['Period', 'Base', 'Additions', 'Deductions', 'Net Pay', 'Status']}>
      {isLoading ? <Loading cols={6} />
        : !rows.length ? <EmptyState cols={6} icon={Receipt} text="No payslips generated for this employee yet." />
        : rows.map((p) => {
          const add = (p.allowances || 0) + (p.overtime || 0) + (p.bonuses || 0);
          const ded = (p.deductions || 0) + (p.tax || 0);
          return (
            <tr key={p.id} className={tr}>
              <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-100`}>{MONTHS[p.month]} {p.year}</td>
              <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{rs(p.base_salary)}</td>
              <td className={`${td} text-emerald-600 dark:text-emerald-400`}>+{rs(add)}</td>
              <td className={`${td} text-red-600 dark:text-red-400`}>−{rs(ded)}</td>
              <td className={`${td} font-bold text-zinc-900 dark:text-zinc-50`}>{rs(p.net_pay)}</td>
              <td className={td}><Pill value={p.status} /></td>
            </tr>
          );
        })}
    </Table>
  );
}

/* ── Documents ───────────────────────────────────────────────────── */
function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeDocuments(employeeId);
  const rows = data ?? [];
  return (
    <Table headers={['Document', 'Uploaded', 'Expires', 'Status', 'File']}>
      {isLoading ? <Loading cols={5} />
        : !rows.length ? <EmptyState cols={5} icon={FolderOpen} text="No documents uploaded for this employee." />
        : rows.map((d) => (
          <tr key={d.id} className={tr}>
            <td className={td}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <FileText size={15} />
                </div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{d.document_type}</span>
              </div>
            </td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{d.created_at?.slice(0, 10) || '—'}</td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{d.expiry_date || '—'}</td>
            <td className={td}><Pill value={d.verification_status} /></td>
            <td className={td}>
              <a href={d.file_path} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <ExternalLink size={13} /> Open
              </a>
            </td>
          </tr>
        ))}
    </Table>
  );
}

/* ── Performance ─────────────────────────────────────────────────── */
function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = usePerformanceReviews(employeeId);
  const rows = data ?? [];
  return (
    <Table headers={['Period', 'Reviewer', 'Rating', 'Status']}>
      {isLoading ? <Loading cols={4} />
        : !rows.length ? <EmptyState cols={4} icon={Target} text="No performance reviews recorded for this employee." />
        : rows.map((r) => (
          <tr key={r.id} className={tr}>
            <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-100`}>{r.review_period || 'Review'}</td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{r.reviewer_name || '—'}</td>
            <td className={td}>
              {r.rating == null ? <span className="text-xs text-zinc-400">Not rated</span> : (
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={13} className={i <= Math.round(r.rating!) ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
                  ))}
                  <span className="ml-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{r.rating.toFixed(1)}</span>
                </span>
              )}
            </td>
            <td className={td}><Pill value={r.status} /></td>
          </tr>
        ))}
    </Table>
  );
}

/* ── Training ────────────────────────────────────────────────────── */
function TrainingTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeTraining(employeeId);
  const rows = data ?? [];
  return (
    <Table headers={['Program', 'Trainer', 'Starts', 'Ends', 'Program Status', 'Result']}>
      {isLoading ? <Loading cols={6} />
        : !rows.length ? <EmptyState cols={6} icon={GraduationCap} text="This employee isn't enrolled in any training programs." />
        : rows.map((t) => (
          <tr key={t.id} className={tr}>
            <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-100`}>{t.title}</td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{t.trainer || '—'}</td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{t.start_date?.slice(0, 10) || '—'}</td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{t.end_date?.slice(0, 10) || '—'}</td>
            <td className={`${td} text-zinc-500 dark:text-zinc-400`}>{t.program_status}</td>
            <td className={td}><Pill value={t.my_status} /></td>
          </tr>
        ))}
    </Table>
  );
}

/* ── Tasks ───────────────────────────────────────────────────────── */
const PRIORITY: Record<string, string> = {
  Critical: 'text-red-600 dark:text-red-400',
  High: 'text-orange-600 dark:text-orange-400',
  Medium: 'text-blue-600 dark:text-blue-400',
  Low: 'text-zinc-500 dark:text-zinc-400',
};
function TasksTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeTasks(employeeId);
  const rows = data ?? [];
  return (
    <Table headers={['Task', 'Priority', 'Due', 'Status']}>
      {isLoading ? <Loading cols={4} />
        : !rows.length ? <EmptyState cols={4} icon={CheckSquare} text="No tasks assigned to this employee." />
        : rows.map((t) => (
          <tr key={t.id} className={tr}>
            <td className={td}>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
              {t.description && <p className="max-w-xs truncate text-xs text-zinc-400">{t.description}</p>}
            </td>
            <td className={td}>
              <span className={`inline-flex items-center gap-1 font-semibold ${PRIORITY[t.priority || 'Medium'] || PRIORITY.Low}`}>
                <Flag size={13} /> {t.priority || 'Medium'}
              </span>
            </td>
            <td className={`${td} text-zinc-600 dark:text-zinc-300`}>{t.due_date?.slice(0, 10) || '—'}</td>
            <td className={td}><Pill value={t.status} /></td>
          </tr>
        ))}
    </Table>
  );
}

/* ── Activity (composed timeline from what we already load) ──────── */
function ActivityTab({ employeeId }: { employeeId: string }) {
  const now = new Date();
  // Attendance is month-scoped by the API, so the timeline covers this month
  // plus every task/document event we already have loaded.
  const { data: attendance, isLoading: aLoad } = useMonthlyAttendance(employeeId, now.getMonth() + 1, now.getFullYear());
  const { data: tasks } = useEmployeeTasks(employeeId);
  const { data: docs } = useEmployeeDocuments(employeeId);

  const events = useMemo(() => {
    const out: { at: string; icon: typeof User; tone: string; title: string; detail?: string }[] = [];

    (attendance ?? []).slice(0, 40).forEach((a: any) => {
      if (a.clock_in) out.push({
        at: a.clock_in, icon: LogIn, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        title: `Clocked in · ${a.status || 'Present'}`, detail: String(a.date),
      });
      if (a.clock_out) out.push({
        at: a.clock_out, icon: LogOut, tone: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        title: 'Clocked out', detail: String(a.date),
      });
    });
    (tasks ?? []).forEach((t) => out.push({
      at: t.created_at, icon: CheckSquare, tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
      title: `Task assigned · ${t.title}`, detail: t.status,
    }));
    (docs ?? []).forEach((d) => out.push({
      at: d.created_at, icon: FolderOpen, tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
      title: `Document uploaded · ${d.document_type}`, detail: d.verification_status,
    }));

    return out
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 50);
  }, [attendance, tasks, docs]);

  const fmt = (v: string) => {
    const iso = v.endsWith('Z') || v.includes('+') ? v : `${v}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? v : d.toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (aLoad) {
    return <Panel><div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div></Panel>;
  }
  if (!events.length) {
    return (
      <Panel>
        <div className="py-14 text-center">
          <Activity size={34} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm text-zinc-400">No activity recorded for this employee yet.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <ol className="relative space-y-4 border-l border-zinc-200 pl-6 dark:border-zinc-800">
        {events.map((e, i) => (
          <motion.li
            key={`${e.at}-${i}`}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className="relative"
          >
            <span className={`absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-950 ${e.tone}`}>
              <e.icon size={12} />
            </span>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{e.title}</p>
            <p className="text-xs text-zinc-400">{fmt(e.at)}{e.detail ? ` · ${e.detail}` : ''}</p>
          </motion.li>
        ))}
      </ol>
    </Panel>
  );
}
