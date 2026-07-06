'use client';

import { useState, useRef, useEffect } from 'react';
import { useUsers } from '@/features/admin/services/admin.api';
import type { User } from '@/features/admin/services/admin.api';
import { CreateUserModal } from '@/features/admin/components/CreateUserModal';
import { EditUserModal } from '@/features/admin/components/EditUserModal';
import { Users, UserPlus, Shield, MoreVertical, Pencil } from 'lucide-react';

function ActionsMenu({ user, onEdit }: { user: User; onEdit: (u: User) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 origin-top-right rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onEdit(user);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pencil size={14} className="text-blue-500" />
              Edit User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users size={24} className="text-blue-500" />
            User Management
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage staff, assign roles, and control access</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Loading users...
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold">
                          {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{user.full_name || user.username}</div>
                          <div className="text-xs text-zinc-500">@{user.username} · {user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 w-max border border-indigo-100 dark:border-indigo-800/50">
                        <Shield size={12} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          {user.role?.name || 'No Role'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionsMenu user={user} onEdit={setEditUser} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && <CreateUserModal onClose={() => setIsCreateModalOpen(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}
