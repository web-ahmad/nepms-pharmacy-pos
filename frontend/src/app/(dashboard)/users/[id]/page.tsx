'use client';
// app/(dashboard)/users/[id]/page.tsx
// Enterprise User Detail — tabbed profile page.

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, User, Shield, Building2, Monitor, Smartphone,
  Clock, Activity, FileCheck, Lock, Unlock, UserX, UserCheck,
  KeyRound, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { UserAvatar }      from '@/features/users/components/UserAvatar';
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge';
import {
  useEnterpriseUser,
  useUserSessions, useTerminateSession, useTerminateAllSessions,
  useUserDevices, useRevokeDevice, useBlockDevice,
  useLoginHistory, useUserActivity,
  useSuspendUser, useActivateUser, useLockUser, useUnlockUser,
  useResetPassword,
} from '@/features/users/services/user.api';
import { USER_TYPE_LABELS } from '@/features/users/types/user';

type Tab = 'profile' | 'access' | 'branches' | 'sessions' | 'devices' | 'logins' | 'activity';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'profile',   label: 'Profile',      icon: <User size={15} /> },
  { id: 'access',    label: 'Access',       icon: <Shield size={15} /> },
  { id: 'branches',  label: 'Branches',     icon: <Building2 size={15} /> },
  { id: 'sessions',  label: 'Sessions',     icon: <Monitor size={15} /> },
  { id: 'devices',   label: 'Devices',      icon: <Smartphone size={15} /> },
  { id: 'logins',    label: 'Login History',icon: <Clock size={15} /> },
  { id: 'activity',  label: 'Activity',     icon: <Activity size={15} /> },
];

// ── Sub-panels ────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: any }) {
  const rows = [
    { label: 'Username',        value: user.username },
    { label: 'Email',           value: user.email },
    { label: 'Phone',           value: user.phone },
    { label: 'User Type',       value: USER_TYPE_LABELS[user.user_type as keyof typeof USER_TYPE_LABELS] ?? user.user_type },
    { label: 'Role',            value: user.enterprise_role?.name },
    { label: 'Employee ID',     value: user.employee_id },
    { label: 'CNIC',            value: user.cnic },
    { label: 'License No.',     value: user.license_number },
    { label: 'Qualification',   value: user.qualification },
    { label: 'Blood Group',     value: user.blood_group },
    { label: 'Joining Date',    value: user.joining_date },
    { label: 'Address',         value: user.address },
    { label: 'Language',        value: user.language },
    { label: 'Timezone',        value: user.timezone },
    { label: 'Joined Platform', value: format(new Date(user.created_at), 'dd MMM yyyy') },
  ].filter((r) => r.value);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {rows.map((r, i) => (
        <div key={r.label} className={`flex items-center justify-between px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'}`}>
          <span className="text-zinc-500 dark:text-zinc-400 w-40 shrink-0">{r.label}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right">{String(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function AccessTab({ user }: { user: any }) {
  const security = [
    { label: 'Failed Login Count',    value: user.failed_login_count, alert: user.failed_login_count > 0 },
    { label: 'Force Password Change', value: user.force_password_change ? 'Yes' : 'No', alert: user.force_password_change },
    { label: 'Password Changed',      value: user.password_changed_at ? format(new Date(user.password_changed_at), 'dd MMM yyyy HH:mm') : 'Never' },
    { label: 'Password Expires',      value: user.password_expires_at ? format(new Date(user.password_expires_at), 'dd MMM yyyy') : 'Never' },
    { label: '2FA Enabled',           value: user.two_factor_enabled ? 'Yes' : 'No' },
    { label: 'OTP Enabled',           value: user.otp_enabled ? 'Yes' : 'No' },
    { label: 'Max Sessions',          value: user.max_concurrent_sessions },
    { label: 'Geo Restriction',       value: user.geo_restriction_enabled ? 'Enabled' : 'Disabled' },
    { label: 'Last Login',            value: user.last_login_at ? format(new Date(user.last_login_at), 'dd MMM yyyy HH:mm') : 'Never' },
    { label: 'Last Login IP',         value: user.last_login_ip ?? '—' },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {security.map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'}`}>
            <span className="text-zinc-500 dark:text-zinc-400 w-52 shrink-0">{r.label}</span>
            <span className={`font-medium text-right ${(r as any).alert ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {String(r.value)}
            </span>
          </div>
        ))}
      </div>

      {(user.allowed_ips?.length > 0) && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Allowed IPs</p>
          <div className="flex flex-wrap gap-2">
            {user.allowed_ips.map((ip: string) => (
              <span key={ip} className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1">{ip}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchesTab({ user }: { user: any }) {
  if (!user.branch_assignments?.length) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <Building2 size={32} className="text-zinc-300 dark:text-zinc-700" />
        <p className="text-zinc-500">Not assigned to any branches</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {user.branch_assignments.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Building2 size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {a.branch?.name ?? a.branch_id}
              </p>
              <p className="text-xs text-zinc-500 capitalize">
                {a.role} {a.is_default_branch && '• Default'}
                {a.is_temporary && ` • Expires ${a.access_expires_at ? format(new Date(a.access_expires_at), 'dd MMM') : '—'}`}
              </p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${a.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
            {a.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SessionsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useUserSessions(userId);
  const terminateMut    = useTerminateSession(userId);
  const terminateAllMut = useTerminateAllSessions(userId);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>;
  if (!data?.items.length) return <div className="py-16 text-center text-zinc-500">No active sessions</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={async () => { await terminateAllMut.mutateAsync(); toast.success('All sessions terminated'); }}
          disabled={terminateAllMut.isPending}
          className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Terminate All
        </button>
      </div>
      {data.items.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {s.device_name ?? 'Unknown Device'}
              </p>
              <p className="text-xs text-zinc-500">
                {s.browser} · {s.os} · {s.ip_address}
              </p>
              <p className="text-xs text-zinc-400">
                Last active: {s.last_activity_at ? format(new Date(s.last_activity_at), 'dd MMM HH:mm') : '—'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => { await terminateMut.mutateAsync(s.id); toast.success('Session terminated'); }}
            className="text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Terminate
          </button>
        </div>
      ))}
    </div>
  );
}

function DevicesTab({ userId }: { userId: string }) {
  const { data, isLoading } = useUserDevices(userId);
  const revokeMut = useRevokeDevice(userId);
  const blockMut  = useBlockDevice(userId);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>;
  if (!data?.items.length) return <div className="py-16 text-center text-zinc-500">No trusted devices</div>;

  return (
    <div className="space-y-3">
      {data.items.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <Smartphone size={16} className="text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {d.device_name ?? 'Unknown'}
                {d.is_blocked && <span className="text-xs text-red-500">Blocked</span>}
                {d.is_trusted && !d.is_blocked && <span className="text-xs text-emerald-500">Trusted</span>}
              </p>
              <p className="text-xs text-zinc-500">{d.browser} · {d.os} · {d.ip_address}</p>
              <p className="text-xs text-zinc-400">Last seen: {format(new Date(d.last_seen_at), 'dd MMM yyyy HH:mm')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!d.is_blocked && (
              <button onClick={async () => { await revokeMut.mutateAsync(d.id); toast.success('Device revoked'); }}
                className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400">
                Revoke
              </button>
            )}
            <button onClick={async () => { await blockMut.mutateAsync(d.id); toast.success('Device blocked'); }}
              className="text-xs border border-red-200 dark:border-red-800 text-red-600 rounded-lg px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Block
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoginHistoryTab({ userId }: { userId: string }) {
  const { data, isLoading } = useLoginHistory(userId);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>;
  if (!data?.items.length) return <div className="py-16 text-center text-zinc-500">No login history</div>;

  return (
    <div className="space-y-2">
      {data.items.map((h) => (
        <div key={h.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${h.success ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
            {h.success ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
              {h.event_type.replace('_', ' ')}
              {h.failure_reason && ` — ${h.failure_reason}`}
            </p>
            <p className="text-xs text-zinc-500">{h.ip_address} · {h.browser} · {h.os}</p>
          </div>
          <p className="text-xs text-zinc-400 shrink-0">{format(new Date(h.created_at), 'dd MMM HH:mm')}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const { data, isLoading } = useUserActivity(userId);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>;
  if (!data?.items.length) return <div className="py-16 text-center text-zinc-500">No activity recorded</div>;

  return (
    <div className="relative pl-6 space-y-0">
      {/* Timeline line */}
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
      {data.items.map((log) => (
        <div key={log.id} className="relative flex items-start gap-4 pb-5">
          <div className="absolute -left-3.5 mt-1 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-zinc-950" />
          <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                  {log.event_type.replace(/_/g, ' ')}
                </p>
                {log.description && <p className="text-xs text-zinc-500 mt-0.5">{log.description}</p>}
              </div>
              <p className="text-xs text-zinc-400 shrink-0">{format(new Date(log.created_at), 'dd MMM HH:mm')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const { data: user, isLoading } = useEnterpriseUser(id);
  const suspendMut  = useSuspendUser(id);
  const activateMut = useActivateUser(id);
  const lockMut     = useLockUser(id);
  const unlockMut   = useUnlockUser(id);
  const resetPwMut  = useResetPassword(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-40 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 py-24">
        <AlertTriangle size={40} className="text-amber-500" />
        <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">User not found</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">← Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ChevronLeft size={16} /> Back to Users
      </button>

      {/* Profile header card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
      >
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className="ring-4 ring-white dark:ring-zinc-900 rounded-2xl">
                <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="xl" />
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {user.full_name ?? user.username}
                </h1>
                <p className="text-sm text-zinc-500">{user.email}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <UserStatusBadge status={user.status} size="md" />

              {user.status === 'active' ? (
                <button onClick={async () => { await suspendMut.mutateAsync({ reason: 'Admin action' }); toast.success('Suspended'); }}
                  className="flex items-center gap-1.5 text-xs font-medium border border-amber-200 dark:border-amber-800 text-amber-600 rounded-lg px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <UserX size={13} /> Suspend
                </button>
              ) : (
                <button onClick={async () => { await activateMut.mutateAsync(); toast.success('Activated'); }}
                  className="flex items-center gap-1.5 text-xs font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                  <UserCheck size={13} /> Activate
                </button>
              )}

              {user.status.startsWith('locked') ? (
                <button onClick={async () => { await unlockMut.mutateAsync(); toast.success('Unlocked'); }}
                  className="flex items-center gap-1.5 text-xs font-medium border border-blue-200 dark:border-blue-800 text-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Unlock size={13} /> Unlock
                </button>
              ) : (
                <button onClick={async () => { await lockMut.mutateAsync({ reason: 'Admin lock', permanent: false }); toast.success('Locked'); }}
                  className="flex items-center gap-1.5 text-xs font-medium border border-orange-200 dark:border-orange-800 text-orange-600 rounded-lg px-3 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                  <Lock size={13} /> Lock
                </button>
              )}

              <button onClick={async () => { const r = await resetPwMut.mutateAsync({ force_change: true }); toast.success(`Temp: ${r.temporary_password}`, { duration: 10000 }); }}
                className="flex items-center gap-1.5 text-xs font-medium border border-purple-200 dark:border-purple-800 text-purple-600 rounded-lg px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                <KeyRound size={13} /> Reset Password
              </button>
            </div>
          </div>

          {/* Quick meta */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Shield size={13} className="text-indigo-500" />
              {user.enterprise_role?.name ?? 'No role'}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 size={13} className="text-emerald-500" />
              {user.branch_assignments?.length ?? 0} branches
            </span>
            {user.employee_id && (
              <span className="font-mono text-xs">{user.employee_id}</span>
            )}
            {user.last_login_at && (
              <span>Last login: {format(new Date(user.last_login_at), 'dd MMM yyyy HH:mm')}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="min-h-[300px]"
      >
        {tab === 'profile'  && <ProfileTab user={user} />}
        {tab === 'access'   && <AccessTab user={user} />}
        {tab === 'branches' && <BranchesTab user={user} />}
        {tab === 'sessions' && <SessionsTab userId={id} />}
        {tab === 'devices'  && <DevicesTab userId={id} />}
        {tab === 'logins'   && <LoginHistoryTab userId={id} />}
        {tab === 'activity' && <ActivityTab userId={id} />}
      </motion.div>
    </div>
  );
}
