'use client';
// app/(dashboard)/users/[id]/page.tsx
// Enterprise User Detail — tabbed profile page.

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, User, Shield, Building2, Monitor, Smartphone,
  Clock, Activity, FileCheck, Lock, Unlock, UserX, UserCheck,
  KeyRound, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, Search, Save, Check, ChevronDown, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { UserAvatar }      from '@/features/users/components/UserAvatar';
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge';
import { AssignBranchDialog } from '@/features/users/components/AssignBranchDialog';
import { EditUserDialog } from '@/features/users/components/EditUserDialog';
import { Pencil } from 'lucide-react';
import {
  useEnterpriseUser,
  useUserSessions, useTerminateSession, useTerminateAllSessions,
  useUserDevices, useRevokeDevice, useBlockDevice,
  useLoginHistory, useUserActivity,
  useSuspendUser, useActivateUser, useLockUser, useUnlockUser,
  useResetPassword,
  useUserPermissions, useUpdateUserPermissions, useMyProfileId,
} from '@/features/users/services/user.api';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissionsCatalogue } from '@/features/users/services/role.api';
import { USER_TYPE_LABELS } from '@/features/users/types/user';

type Tab = 'profile' | 'access' | 'permissions' | 'branches' | 'sessions' | 'devices' | 'logins' | 'activity';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'profile',   label: 'Profile',      icon: <User size={15} /> },
  { id: 'access',    label: 'Access',       icon: <Shield size={15} /> },
  { id: 'permissions', label: 'Permissions', icon: <ShieldCheck size={15} /> },
  { id: 'branches',  label: 'Branches',     icon: <Building2 size={15} /> },
  { id: 'sessions',  label: 'Sessions',     icon: <Monitor size={15} /> },
  { id: 'devices',   label: 'Devices',      icon: <Smartphone size={15} /> },
  { id: 'logins',    label: 'Login History',icon: <Clock size={15} /> },
  { id: 'activity',  label: 'Activity',     icon: <Activity size={15} /> },
];

// ── Sub-panels ────────────────────────────────────────────────────────────────

// Show a clean, short Employee ID. If the stored value is an internal UUID
// (from an HR link), display just its first segment uppercased (e.g. 7B22ACBC)
// so it reads like a code instead of a long random string.
function fmtEmpId(id: string): string {
  if (!id) return '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
  return isUuid ? id.split('-')[0].toUpperCase() : id;
}

function ProfileTab({ user }: { user: any }) {
  const rows = [
    { label: 'Username',        value: user.username },
    { label: 'Email',           value: user.email },
    { label: 'Phone',           value: user.phone },
    { label: 'User Type',       value: USER_TYPE_LABELS[user.user_type as keyof typeof USER_TYPE_LABELS] ?? user.user_type },
    { label: 'Role',            value: user.enterprise_role?.name },
    { label: 'Employee ID',     value: user.employee_code || (user.employee_id ? fmtEmpId(user.employee_id) : '') },
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

const prettyModule = (m: string) =>
  m.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const prettyAction = (code: string) => {
  const a = code.includes(':') ? code.split(':')[1] : code;
  return a.replace(/[:_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

function PermissionsTab({ userId }: { userId: string }) {
  const { data: info, isLoading } = useUserPermissions(userId);
  const { data: catalogue } = usePermissionsCatalogue();
  const update = useUpdateUserPermissions(userId);

  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState('');
  const [openMods, setOpenMods] = useState<Set<string>>(new Set());

  // Seed the editable selection from the user's effective permissions (by code).
  useEffect(() => {
    if (info && selected === null) setSelected(new Set(info.permissions));
  }, [info, selected]);

  const roleBase = useMemo(() => new Set(info?.role_permissions ?? []), [info]);
  const sel = selected ?? new Set<string>();
  const dirty = useMemo(() => {
    if (!info) return false;
    const a = new Set(info.permissions);
    if (a.size !== sel.size) return true;
    for (const c of sel) if (!a.has(c)) return true;
    return false;
  }, [info, sel]);

  const modules = useMemo(() => {
    const groups = catalogue ?? [];
    const q = search.trim().toLowerCase();
    return groups
      .map((g) => ({ module: g.module, permissions: q
        ? g.permissions.filter((p) => p.code.toLowerCase().includes(q) || prettyModule(g.module).toLowerCase().includes(q))
        : g.permissions }))
      .filter((g) => g.permissions.length > 0);
  }, [catalogue, search]);

  const toggle = (code: string) => setSelected((prev) => {
    const n = new Set(prev ?? []);
    n.has(code) ? n.delete(code) : n.add(code);
    return n;
  });
  const toggleModule = (perms: { code: string }[]) => setSelected((prev) => {
    const n = new Set(prev ?? []);
    const allOn = perms.every((p) => n.has(p.code));
    perms.forEach((p) => (allOn ? n.delete(p.code) : n.add(p.code)));
    return n;
  });

  const save = () => {
    toast.promise(update.mutateAsync([...sel]), {
      loading: 'Permissions save ho rahi hain…',
      success: 'Permissions update ho gayin ✅',
      error: (e: any) => e?.response?.data?.detail || 'Save nahi hui — shayad permission nahi.',
    });
  };
  const resetToRole = () => setSelected(new Set(roleBase));

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;

  if (info?.is_wildcard) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6 text-center dark:border-violet-900/40 dark:bg-violet-900/10">
        <Sparkles className="mx-auto mb-2 h-7 w-7 text-violet-500" />
        <p className="font-semibold text-zinc-800 dark:text-zinc-100">{info.role_name} — Full Access</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ye user owner-level hai, is ke paas saari permissions hain (wildcard). Per-permission editing sirf staff roles ke liye hai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Role: <b className="text-zinc-800 dark:text-zinc-100">{info?.role_name ?? '—'}</b> ·{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sel.size}</span> permissions selected
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-40 rounded-lg border border-zinc-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
          </div>
          <button onClick={resetToRole} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Role default
          </button>
          <button onClick={save} disabled={!dirty || update.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40">
            {update.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      {/* Module sections */}
      <div className="space-y-2">
        {modules.map(({ module, permissions }) => {
          const open = openMods.has(module) || !!search.trim();
          const onCount = permissions.filter((p) => sel.has(p.code)).length;
          const allOn = onCount === permissions.length;
          const someOn = onCount > 0 && !allOn;
          return (
            <div key={module} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 bg-zinc-50/80 px-3 py-2.5 dark:bg-zinc-900/50">
                <button type="button" onClick={() => toggleModule(permissions)}
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                    allOn || someOn ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'}`}>
                  {allOn && <Check size={12} strokeWidth={3} />}
                  {someOn && !allOn && <span className="h-0.5 w-2.5 rounded-full bg-white" />}
                </button>
                <button onClick={() => setOpenMods((p) => { const n = new Set(p); n.has(module) ? n.delete(module) : n.add(module); return n; })}
                  className="flex flex-1 items-center justify-between gap-2 text-left">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{prettyModule(module)}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">{onCount}/{permissions.length}</span>
                    <ChevronDown size={15} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </div>
              {open && (
                <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 p-2 sm:grid-cols-2 xl:grid-cols-3">
                  {permissions.map((p) => {
                    const on = sel.has(p.code);
                    const fromRole = roleBase.has(p.code);
                    return (
                      <label key={p.id} title={p.code} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                        <button type="button" onClick={() => toggle(p.code)}
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                            on ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'}`}>
                          {on && <Check size={12} strokeWidth={3} />}
                        </button>
                        <span className={`flex-1 ${on ? 'font-medium text-zinc-800 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{prettyAction(p.code)}</span>
                        {on && !fromRole && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">EXTRA</span>}
                        {!on && fromRole && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-300">REVOKED</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BranchesTab({ user, canManage }: { user: any; canManage?: boolean }) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Assigned Branches</h3>
        {canManage && (
          <button
            onClick={() => setIsAssignOpen(true)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1.5"
          >
            <Building2 size={14} /> Assign Branch
          </button>
        )}
      </div>

      {!user.branch_assignments?.length ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <Building2 size={32} className="text-zinc-300 dark:text-zinc-700" />
          <p className="text-zinc-500">Not assigned to any branches</p>
        </div>
      ) : (
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
      )}

      <AssignBranchDialog 
        userId={user.id} 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
      />
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

// Run a mutation with visible success/failure feedback so actions never fail
// silently (the old inline handlers swallowed API errors → looked like nothing
// happened / "the buttons don't work").
async function runAction(fn: () => Promise<any>, okMsg: string) {
  try {
    await fn();
    toast.success(okMsg);
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || e?.message || 'Action failed. You may not have permission.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [editOpen, setEditOpen] = useState(false);

  const { data: user, isLoading } = useEnterpriseUser(id);
  const { data: myProfile } = useMyProfileId();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // Admin actions (Suspend / Lock / Reset / Edit) are for managers viewing OTHER
  // users — never for a user looking at their own profile.
  const isSelf = !!myProfile && myProfile.enterprise_user_id === id;
  const showAdminActions = !isSelf && (hasPermission('users:manage') || hasPermission('users:suspend'));
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
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Cover gradient */}
        <div className="relative h-28 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="px-5 pb-5 sm:px-6">
          {/* Identity */}
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-fit shrink-0 rounded-2xl ring-4 ring-white dark:ring-zinc-900">
              <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="xl" />
            </div>
            <div className="min-w-0 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {user.full_name ?? user.username}
                </h1>
                <UserStatusBadge status={user.status} size="sm" />
              </div>
              <p className="truncate text-sm text-zinc-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Shield size={13} className="text-indigo-500" />
                  {user.enterprise_role?.name ?? 'No role'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-500" />
                  {user.branch_assignments?.length ?? 0} branches
                </span>
                {(user.employee_code || user.employee_id) && <span className="font-mono">Emp ID: {user.employee_code || fmtEmpId(user.employee_id || '')}</span>}
                {user.last_login_at && (
                  <span>Last login: {format(new Date(user.last_login_at), 'dd MMM yyyy HH:mm')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions — only for managers viewing OTHER users (hidden on self-view) */}
          {showAdminActions && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {user.status === 'active' ? (
              <button disabled={suspendMut.isPending}
                onClick={() => runAction(() => suspendMut.mutateAsync({ reason: 'Admin action' }), 'User suspended')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:hover:bg-amber-900/20">
                {suspendMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />} Suspend
              </button>
            ) : (
              <button disabled={activateMut.isPending}
                onClick={() => runAction(() => activateMut.mutateAsync(), 'User activated')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20">
                {activateMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Activate
              </button>
            )}

            {user.status.startsWith('locked') ? (
              <button disabled={unlockMut.isPending}
                onClick={() => runAction(() => unlockMut.mutateAsync(), 'User unlocked')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:hover:bg-blue-900/20">
                {unlockMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />} Unlock
              </button>
            ) : (
              <button disabled={lockMut.isPending}
                onClick={() => runAction(() => lockMut.mutateAsync({ reason: 'Admin lock', permanent: false }), 'User locked')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50 dark:border-orange-800 dark:hover:bg-orange-900/20">
                {lockMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />} Lock
              </button>
            )}

            <button disabled={resetPwMut.isPending}
              onClick={() => runAction(async () => { const r = await resetPwMut.mutateAsync({ force_change: true }); toast.success(`Temp password: ${r.temporary_password}`, { duration: 10000 }); }, 'Password reset')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50 dark:border-purple-800 dark:hover:bg-purple-900/20">
              {resetPwMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Reset Password
            </button>

            <button
              onClick={() => setEditOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/30 transition-all hover:shadow-md">
              <Pencil size={13} /> Edit Details
            </button>
          </div>
          )}
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
        {tab === 'permissions' && <PermissionsTab userId={id} />}
        {tab === 'branches' && <BranchesTab user={user} canManage={showAdminActions} />}
        {tab === 'sessions' && <SessionsTab userId={id} />}
        {tab === 'devices'  && <DevicesTab userId={id} />}
        {tab === 'logins'   && <LoginHistoryTab userId={id} />}
        {tab === 'activity' && <ActivityTab userId={id} />}
      </motion.div>

      {/* Edit details modal */}
      <EditUserDialog user={user} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
