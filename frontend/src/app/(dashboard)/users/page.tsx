'use client';
// app/(dashboard)/users/page.tsx
// Enterprise Users & Identity Management — main page.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Download, RefreshCw, Users, Shield } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { UserDashboardStats }  from '@/features/users/components/UserDashboardStats';
import { UserFilters }         from '@/features/users/components/UserFilters';
import { UserTable }           from '@/features/users/components/UserTable';
import { UserCardGrid }        from '@/features/users/components/UserCardGrid';
import { CreateUserWizard }    from '@/features/users/components/CreateUserWizard';
import { useUserStore }        from '@/features/users/store/user-store';
import { userKeys }            from '@/features/users/services/user.api';
import type { EnterpriseUserListItem } from '@/features/users/types/user';

export default function UsersPage() {
  const qc = useQueryClient();
  const { viewMode } = useUserStore();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editUser, setEditUser]     = useState<EnterpriseUserListItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: userKeys.all });
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Users & Identity
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enterprise user management, access control, and security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>
      </motion.div>

      {/* KPI stats */}
      <UserDashboardStats />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm"
      >
        <UserFilters />
      </motion.div>

      {/* User list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <UserTable onEditUser={(u) => setEditUser(u)} />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <UserCardGrid onEditUser={(u) => setEditUser(u)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create User Wizard */}
      <AnimatePresence>
        {wizardOpen && (
          <CreateUserWizard
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
