'use client';
// features/users/components/UserTable.tsx
// TanStack Table-based list view for enterprise users.

import { useState, useCallback } from 'react';
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

function ActionsMenu({ user, onEdit }: { user: EnterpriseUserListItem; onEdit: (u: EnterpriseUserListItem) => void }) {
  const [open, setOpen] = useState(false);
  const suspendMut  = useSuspendUser(user.id);
  const activateMut = useActivateUser(user.id);
  const lockMut     = useLockUser(user.id);
  const unlockMut   = useUnlockUser(user.id);
  const resetPwMut  = useResetPassword(user.id);
  const deleteMut   = useDeleteUser();

  const actions = [
    {
      label: 'Edit',
      icon: <Pencil size={14} />,
      onClick: () => { onEdit(user); setOpen(false); },
    },
    user.status === 'active'
      ? {
          label: 'Suspend',
          icon: <UserX size={14} />,
          onClick: async () => {
            await suspendMut.mutateAsync({ reason: 'Manual suspension by admin' });
            toast.success('User suspended');
            setOpen(false);
          },
        }
      : {
          label: 'Activate',
          icon: <UserCheck size={14} />,
          onClick: async () => {
            await activateMut.mutateAsync();
            toast.success('User activated');
            setOpen(false);
          },
        },
    user.status.startsWith('locked')
      ? {
          label: 'Unlock',
          icon: <Unlock size={14} />,
          onClick: async () => {
            await unlockMut.mutateAsync();
            toast.success('User unlocked');
            setOpen(false);
          },
        }
      : {
          label: 'Lock (Temp)',
          icon: <Lock size={14} />,
          onClick: async () => {
            await lockMut.mutateAsync({ reason: 'Manual admin lock', permanent: false });
            toast.success('User locked');
            setOpen(false);
          },
        },
    {
      label: 'Reset Password',
      icon: <KeyRound size={14} />,
      onClick: async () => {
        const res = await resetPwMut.mutateAsync({ force_change: true });
        toast.success(`Temp password: ${res.temporary_password}`, { duration: 8000 });
        setOpen(false);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: async () => {
        if (!confirm(`Delete user ${user.full_name ?? user.username}? This cannot be undone.`)) return;
        await deleteMut.mutateAsync(user.id);
        toast.success('User deleted');
        setOpen(false);
      },
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-8 z-50 min-w-[170px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5"
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
          </>
        )}
      </AnimatePresence>
    </div>
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
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 font-mono">{getValue() ?? '—'}</span>
      ),
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
          <ActionsMenu user={row.original} onEdit={onEditUser ?? (() => {})} />
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
