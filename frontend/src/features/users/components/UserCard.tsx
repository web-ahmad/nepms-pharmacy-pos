'use client';
// features/users/components/UserCard.tsx
// Premium card view for a single enterprise user.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2, Calendar, ArrowRight, MoreVertical,
  Lock, Unlock, UserX, UserCheck, KeyRound, Pencil, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { UserAvatar } from './UserAvatar';
import { UserStatusBadge } from './UserStatusBadge';
import {
  useDeleteUser, useSuspendUser, useActivateUser,
  useLockUser, useUnlockUser, useResetPassword,
} from '../services/user.api';
import type { EnterpriseUserListItem } from '../types/user';
import { USER_TYPE_LABELS } from '../types/user';

interface Props {
  user: EnterpriseUserListItem;
  index?: number;
  onEdit?: (u: EnterpriseUserListItem) => void;
}

export function UserCard({ user, index = 0, onEdit }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const suspendMut  = useSuspendUser(user.id);
  const activateMut = useActivateUser(user.id);
  const lockMut     = useLockUser(user.id);
  const unlockMut   = useUnlockUser(user.id);
  const resetPwMut  = useResetPassword(user.id);
  const deleteMut   = useDeleteUser();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group relative flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 overflow-hidden"
    >
      {/* Top gradient strip based on status */}
      <div className={`h-1 w-full ${
        user.status === 'active'           ? 'bg-gradient-to-r from-emerald-400 to-teal-500'  :
        user.status === 'suspended'        ? 'bg-gradient-to-r from-amber-400 to-orange-500'  :
        user.status.startsWith('locked')   ? 'bg-gradient-to-r from-red-400 to-rose-500'      :
        user.status === 'pending_approval' ? 'bg-gradient-to-r from-blue-400 to-indigo-500'   :
                                             'bg-gradient-to-r from-zinc-300 to-zinc-400'
      }`} />

      {/* Card body */}
      <div className="p-5 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="md" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {user.full_name ?? user.username ?? '—'}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5">
                  {[
                    { label: 'Edit', icon: <Pencil size={13} />, action: () => { onEdit?.(user); setMenuOpen(false); } },
                    user.status === 'active'
                      ? { label: 'Suspend', icon: <UserX size={13} />, action: async () => { await suspendMut.mutateAsync({ reason: 'Admin action' }); toast.success('Suspended'); setMenuOpen(false); } }
                      : { label: 'Activate', icon: <UserCheck size={13} />, action: async () => { await activateMut.mutateAsync(); toast.success('Activated'); setMenuOpen(false); } },
                    user.status.startsWith('locked')
                      ? { label: 'Unlock', icon: <Unlock size={13} />, action: async () => { await unlockMut.mutateAsync(); toast.success('Unlocked'); setMenuOpen(false); } }
                      : { label: 'Lock', icon: <Lock size={13} />, action: async () => { await lockMut.mutateAsync({ reason: 'Admin lock', permanent: false }); toast.success('Locked'); setMenuOpen(false); } },
                    { label: 'Reset Password', icon: <KeyRound size={13} />, action: async () => { const r = await resetPwMut.mutateAsync({ force_change: true }); toast.success(`Temp: ${r.temporary_password}`, { duration: 8000 }); setMenuOpen(false); } },
                    { label: 'Delete', icon: <Trash2 size={13} />, danger: true, action: async () => { if (!confirm('Delete user?')) return; await deleteMut.mutateAsync(user.id); toast.success('Deleted'); setMenuOpen(false); } },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        (item as any).danger
                          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status + Type */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <UserStatusBadge status={user.status} />
          <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
            {USER_TYPE_LABELS[user.user_type] ?? user.user_type}
          </span>
          {user.enterprise_role && (
            <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {user.enterprise_role.name}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Building2 size={12} className="shrink-0" />
            <span>{user.branch_count} branch{user.branch_count !== 1 ? 'es' : ''}</span>
            {user.employee_id && <span className="ml-auto font-mono">{user.employee_id}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="shrink-0" />
            <span>Joined {format(new Date(user.created_at), 'dd MMM yyyy')}</span>
            {user.last_login_at && (
              <span className="ml-auto text-emerald-600 dark:text-emerald-400">
                Active {format(new Date(user.last_login_at), 'dd MMM')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
        <button
          onClick={() => router.push(`/users/${user.id}`)}
          className="flex w-full items-center justify-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          View Profile <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}
