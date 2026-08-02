'use client';
// features/users/components/UserTable.tsx
// TanStack Table-based list view for enterprise users.

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight,
  MoreHorizontal, Shield, Building2, Pencil, Trash2,
  Lock, Unlock, UserX, UserCheck, KeyRound,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { UserAvatar } from './UserAvatar';
import { UserStatusBadge } from './UserStatusBadge';
import { useUserStore } from '../store/user-store';
import {
  useEnterpriseUsers, useDeleteUser, useSuspendUser,
  useActivateUser, useLockUser, useUnlockUser, useResetPassword,
} from '../services/user.api';
import type { EnterpriseUserListItem } from '../types/user';
import { USER_TYPE_LABELS } from '../types/user';

const col = createColumnHelper<EnterpriseUserListItem>();

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ChevronsUpDown size={12} className="text-zinc-400" />;
  return sorted === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />;
}

// Never let a row action fail silently — surface success + the real error.
async function runUserAction(fn: () => Promise<any>, okMsg: string) {
  try { await fn(); toast.success(okMsg); }
  catch (e: any) { toast.error(e?.response?.data?.detail || e?.message || 'Action failed. You may not have permission.'); }
}

function ActionsMenu({ user }: { user: EnterpriseUserListItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const suspendMut  = useSuspendUser(user.id);
  const activateMut = useActivateUser(user.id);
  const lockMut     = useLockUser(user.id);
  const unlockMut   = useUnlockUser(user.id);
  const resetPwMut  = useResetPassword(user.id);
  const deleteMut   = useDeleteUser();

  useEffect(() => setMounted(true), []);

  // Position the portal menu under the trigger; close on scroll/resize so it
  // never drifts away from its row.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const actions = [
    {
      label: 'Edit / Manage',
      icon: <Pencil size={14} />,
      onClick: () => { router.push(`/users/${user.id}`); setOpen(false); },
    },
    user.status === 'active'
      ? {
          label: 'Suspend', icon: <UserX size={14} />,
          onClick: () => { runUserAction(() => suspendMut.mutateAsync({ reason: 'Manual suspension by admin' }), 'User suspended'); setOpen(false); },
        }
      : {
          label: 'Activate', icon: <UserCheck size={14} />,
          onClick: () => { runUserAction(() => activateMut.mutateAsync(), 'User activated'); setOpen(false); },
        },
    user.status.startsWith('locked')
      ? {
          label: 'Unlock', icon: <Unlock size={14} />,
          onClick: () => { runUserAction(() => unlockMut.mutateAsync(), 'User unlocked'); setOpen(false); },
        }
      : {
          label: 'Lock (Temp)', icon: <Lock size={14} />,
          onClick: () => { runUserAction(() => lockMut.mutateAsync({ reason: 'Manual admin lock', permanent: false }), 'User locked'); setOpen(false); },
        },
    {
      label: 'Reset Password', icon: <KeyRound size={14} />,
      onClick: () => {
        runUserAction(async () => {
          const res = await resetPwMut.mutateAsync({ force_change: true });
          toast.success(`Temp password: ${res.temporary_password}`, { duration: 8000 });
        }, 'Password reset');
        setOpen(false);
      },
    },
    {
      label: 'Delete', icon: <Trash2 size={14} />, danger: true,
      onClick: () => {
        if (!confirm(`Delete user ${user.full_name ?? user.username}? This cannot be undone.`)) return;
        runUserAction(() => deleteMut.mutateAsync(user.id), 'User deleted');
        setOpen(false);
      },
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>

      {/* Portal → escapes the table's overflow clipping; stays on top, responsive */}
      {mounted && open && pos && createPortal(
        <AnimatePresence>
          <div key="am-overlay" className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <motion.div
            key="am-menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[100] w-[190px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                  (a as any).danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

interface Props {
  onEditUser?: (user: EnterpriseUserListItem) => void;
}

export function UserTable({ onEditUser }: Props) {
  const router = useRouter();
  const { params, setParams } = useUserStore();
  const { data, isLoading } = useEnterpriseUsers(params);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleSort = useCallback((field: string) => {
    if (params.sort_by === field) {
      setParams({ sort_dir: params.sort_dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setParams({ sort_by: field, sort_dir: 'desc' });
    }
  }, [params, setParams]);

  const columns = [
    col.accessor((row) => row.full_name, {
      id: 'user',
      header: 'User',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {u.full_name ?? '—'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{u.email}</p>
            </div>
          </div>
        );
      },
    }),
    col.accessor('user_type', {
      header: 'Role / Type',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {u.enterprise_role?.name ?? '—'}
            </p>
            <p className="text-xs text-zinc-500">
              {USER_TYPE_LABELS[u.user_type] ?? u.user_type}
            </p>
          </div>
        );
      },
    }),
    col.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => <UserStatusBadge status={getValue()} />,
    }),
    col.accessor('branch_count', {
      header: 'Branches',
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{getValue()}</span>
        </div>
      ),
    }),
    col.accessor('employee_id', {
      header: 'Employee ID',
      cell: ({ row, getValue }) => {
        const code = (row.original as any).employee_code;   // e.g. EMP-1002
        const raw = getValue() as string | undefined;
        const display = code ? code
          : !raw ? '—'
          : /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw) ? raw.split('-')[0].toUpperCase() : raw;
        return <span className="text-xs text-zinc-500 font-mono">{display}</span>;
      },
    }),
    col.accessor('last_login_at', {
      header: 'Last Login',
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span className="text-xs text-zinc-500">
            {v ? format(new Date(v), 'dd MMM yyyy') : 'Never'}
          </span>
        );
      },
    }),
    col.accessor('created_at', {
      header: 'Joined',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500">
          {format(new Date(getValue()), 'dd MMM yyyy')}
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/users/${row.original.id}`); }}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            title="View details"
          >
            <ArrowRight size={15} />
          </button>
          <ActionsMenu user={row.original} />
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data?.pages ?? 1,
  });

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
        </td>
      ))}
    </tr>
  );

  const total = data?.total ?? 0;
  const page  = params.page ?? 1;
  const limit = params.limit ?? 20;
  const start = Math.min((page - 1) * limit + 1, total);
  const end   = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => {
                      const id = header.column.id;
                      if (['user', 'status', 'last_login_at', 'created_at'].includes(id)) {
                        const fieldMap: Record<string, string> = {
                          user: 'full_name', status: 'status',
                          last_login_at: 'last_login', created_at: 'created_at',
                        };
                        handleSort(fieldMap[id] ?? id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : table.getRowModel().rows.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Shield size={24} className="text-zinc-400" />
                          </div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No users found</p>
                          <p className="text-xs text-zinc-400">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                : table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/users/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-sm text-zinc-500">
            Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{start}</span>
            {' '}to{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{end}</span>
            {' '}of{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{total}</span> users
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setParams({ page: page - 1 })}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(data?.pages ?? 1, 7) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setParams({ page: pg })}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pg === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={page >= (data?.pages ?? 1)}
              onClick={() => setParams({ page: page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
