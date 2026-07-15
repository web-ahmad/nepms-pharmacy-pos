'use client';
// features/users/components/UserDashboardStats.tsx
// KPI summary cards at the top of the Users page.

import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserX, ShieldAlert, Lock, Clock,
  Monitor, Smartphone, AlertTriangle, FileCheck, Wifi,
} from 'lucide-react';
import { useUserDashboard } from '../services/user.api';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  delay?: number;
  alert?: boolean;
}

function StatCard({ icon, label, value, gradient, delay = 0, alert = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-sm',
        alert && value > 0
          ? 'border-red-200 dark:border-red-800'
          : 'border-zinc-200 dark:border-zinc-800'
      )}
    >
      {/* Gradient accent */}
      <div className={cn('absolute inset-0 opacity-5 dark:opacity-10 bg-gradient-to-br', gradient)} />

      <div className="relative flex items-center gap-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className={cn(
            'text-2xl font-bold tabular-nums',
            alert && value > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-900 dark:text-zinc-100'
          )}>
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function UserDashboardStats() {
  const { data, isLoading } = useUserDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  const stats: StatCardProps[] = [
    { icon: <Users size={20} />,      label: 'Total Users',          value: data.total_users,          gradient: 'from-indigo-500 to-violet-600',  delay: 0 },
    { icon: <UserCheck size={20} />,  label: 'Active',               value: data.active_users,          gradient: 'from-emerald-500 to-teal-600',    delay: 0.05 },
    { icon: <Wifi size={20} />,       label: 'Online Now',           value: data.online_users,          gradient: 'from-cyan-500 to-blue-600',       delay: 0.1 },
    { icon: <UserX size={20} />,      label: 'Suspended',            value: data.suspended_users,       gradient: 'from-amber-500 to-orange-600',    delay: 0.15 },
    { icon: <Lock size={20} />,       label: 'Locked Accounts',      value: data.locked_users,          gradient: 'from-red-500 to-rose-600',        delay: 0.2,  alert: true },
    { icon: <Clock size={20} />,      label: 'Pending Approval',     value: data.pending_approval,      gradient: 'from-blue-500 to-indigo-600',     delay: 0.25, alert: true },
    { icon: <Monitor size={20} />,    label: 'Active Sessions',      value: data.active_sessions,       gradient: 'from-violet-500 to-purple-600',   delay: 0.3 },
    { icon: <Smartphone size={20} />, label: 'Trusted Devices',      value: data.trusted_devices,       gradient: 'from-sky-500 to-cyan-600',        delay: 0.35 },
    { icon: <ShieldAlert size={20} />,label: 'Failed Logins Today',  value: data.failed_logins_today,   gradient: 'from-orange-500 to-red-600',      delay: 0.4,  alert: true },
    { icon: <AlertTriangle size={20}/>,label:'Blocked Devices',      value: data.blocked_devices,       gradient: 'from-rose-500 to-pink-600',       delay: 0.45, alert: true },
    { icon: <FileCheck size={20} />,  label: 'Pending Approvals',    value: data.pending_approvals,     gradient: 'from-teal-500 to-emerald-600',    delay: 0.5,  alert: true },
    { icon: <UserX size={20} />,      label: 'Inactive',             value: data.inactive_users,        gradient: 'from-zinc-400 to-zinc-600',       delay: 0.55 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
    </div>
  );
}
