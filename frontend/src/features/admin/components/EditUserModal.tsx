'use client';

import { useState, useEffect } from 'react';
import { useUpdateUser, useRoles, User } from '../services/admin.api';
import { X, UserCog, Loader2 } from 'lucide-react';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    role_id: user.role?.id || '',
    is_active: user.is_active,
    password: ''
  });
  const [error, setError] = useState('');

  const { data: roles } = useRoles();
  const updateUser = useUpdateUser();

  // Sync formData if user prop changes
  useEffect(() => {
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      role_id: user.role?.id || '',
      is_active: user.is_active,
      password: ''
    });
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload: any = {
      full_name: formData.full_name,
      email: formData.email,
      role_id: formData.role_id || undefined,
      is_active: formData.is_active,
    };

    // Only send password if user typed one
    if (formData.password.trim()) {
      payload.password = formData.password;
    }

    try {
      await updateUser.mutateAsync({ userId: user.id, data: payload });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <UserCog size={20} className="text-blue-500" />
            Edit User
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            >
              <option value="">No role assigned</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              New Password <span className="font-normal text-zinc-400">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formData.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {updateUser.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
