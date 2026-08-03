'use client';

import Link from 'next/link';
import {
  BadgeCheck, Building2, CalendarCheck, CalendarDays, Clock, FolderOpen,
  GraduationCap, HandCoins, Mail, Phone, Target, CheckSquare, Wallet,
  ChevronRight, UserCircle2,
} from 'lucide-react';
import { useMyHrProfile, useMyAttendanceSummary, useMyLeaves, useMyTasks } from '@/features/hr/services/hr.api';
import { useAuthStore } from '@/stores/auth-store';
import { NoEmployeeLinked, StatCards, Panel, EssHeader } from '@/features/hr/components/ess-ui';

const LINKS = [
  { href: '/hr/me/shift', label: 'My Shift', icon: Clock, desc: 'Your working hours', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' },
  { href: '/hr/me/attendance', label: 'My Attendance', icon: CalendarCheck, desc: 'Your daily record', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
  { href: '/hr/me/salary', label: 'My Salary Slips', icon: Wallet, desc: 'Payslips & net pay', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400' },
  { href: '/hr/me/leaves', label: 'My Leaves', icon: CalendarDays, desc: 'Apply & track leave', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  { href: '/hr/me/advances', label: 'My Advances', icon: HandCoins, desc: 'Request advance salary', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  { href: '/hr/me/performance', label: 'My Performance', icon: Target, desc: 'Your reviews', color: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400' },
  { href: '/hr/me/training', label: 'My Training', icon: GraduationCap, desc: 'Enrolled programs', color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' },
  { href: '/hr/me/tasks', label: 'My Tasks', icon: CheckSquare, desc: 'Assigned to you', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400' },
  { href: '/hr/me/documents', label: 'My Documents', icon: FolderOpen, desc: 'Upload & track', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
];

export default function MyHrOverviewPage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading, isError } = useMyHrProfile();
  const { data: att } = useMyAttendanceSummary();
  const { data: leaves } = useMyLeaves();
  const { data: tasks } = useMyTasks();

  if (isError) return <NoEmployeeLinked />;

  const pendingLeaves = (leaves ?? []).filter((l) => l.status === 'Pending').length;
  const openTasks = (tasks ?? []).filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;

  return (
    <div className="space-y-6">
      <EssHeader
        icon={UserCircle2}
        title="My HR"
        subtitle="Your own attendance, payslips, leaves and records"
      />

      {/* Identity strip */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white dark:border-zinc-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black ring-1 ring-white/30 backdrop-blur">
            {(profile?.name || user?.username || 'U')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Employee Self-Service</p>
            <h2 className="truncate text-xl font-bold leading-tight">{isLoading ? 'Loading…' : profile?.name || user?.username}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
              {profile?.designation && <span className="flex items-center gap-1"><BadgeCheck size={14} />{profile.designation}</span>}
              {profile?.department && <span className="flex items-center gap-1"><Building2 size={14} />{profile.department}</span>}
              {profile?.employee_code && <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold">{profile.employee_code}</span>}
            </div>
          </div>
          {profile?.joining_date && (
            <div className="rounded-xl bg-white/15 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Joined</p>
              <p className="text-sm font-bold">{profile.joining_date}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 p-5 text-sm sm:grid-cols-2">
          <Detail icon={Building2} label="Department" value={profile?.department} />
          <Detail icon={BadgeCheck} label="Designation" value={profile?.designation} />
          <Detail icon={Mail} label="Email" value={profile?.email} />
          <Detail icon={Phone} label="Phone" value={profile?.phone} />
        </div>
      </div>

      {/* KPI strip */}
      <StatCards
        items={[
          { label: 'Present This Month', value: att?.present ?? 0 },
          { label: 'Absent This Month', value: att?.absent ?? 0 },
          { label: 'Pending Leaves', value: pendingLeaves },
          { label: 'Open Tasks', value: openTasks },
        ]}
      />

      {/* Section links */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-zinc-100">My Records</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{l.label}</p>
                  <p className="mt-1 truncate text-xs text-gray-400 dark:text-zinc-500">{l.desc}</p>
                </div>
                <div className={`ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${l.color}`}>
                  <l.icon className="h-5 w-5" />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Open <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800/70">
      <Icon size={14} className="shrink-0 text-zinc-400" />
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="ml-auto truncate font-semibold text-zinc-900 dark:text-zinc-100">{value || '—'}</span>
    </div>
  );
}
