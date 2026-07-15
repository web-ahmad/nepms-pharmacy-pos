'use client';
// features/users/components/UserCardGrid.tsx
// Grid layout wrapping UserCard components.

import { AnimatePresence } from 'framer-motion';
import { UserCard } from './UserCard';
import { useEnterpriseUsers } from '../services/user.api';
import { useUserStore } from '../store/user-store';
import type { EnterpriseUserListItem } from '../types/user';
import { Shield } from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse overflow-hidden">
      <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
        <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800 mx-auto" />
      </div>
    </div>
  );
}

interface Props {
  onEditUser?: (user: EnterpriseUserListItem) => void;
}

export function UserCardGrid({ onEditUser }: Props) {
  const { params, setParams } = useUserStore();
  const { data, isLoading } = useEnterpriseUsers(params);

  const total = data?.total ?? 0;
  const page  = params.page ?? 1;
  const limit = params.limit ?? 20;
  const start = Math.min((page - 1) * limit + 1, total);
  const end   = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.items.length === 0
            ? (
                <div className="col-span-full py-20 flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Shield size={28} className="text-zinc-400" />
                  </div>
                  <p className="font-medium text-zinc-500">No users found</p>
                  <p className="text-sm text-zinc-400">Try adjusting your search or filters</p>
                </div>
              )
            : data?.items.map((user, i) => (
                <UserCard key={user.id} user={user} index={i} onEdit={onEditUser} />
              ))
          }
        </AnimatePresence>
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
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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
                      : 'border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={page >= (data?.pages ?? 1)}
              onClick={() => setParams({ page: page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
