'use client';
// features/users/components/UserFilters.tsx
// Search bar + status / type / role filter strip for the user list.

import { useEffect, useState } from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useUserStore, type UserViewMode } from '../store/user-store';
import { useEnterpriseRoles } from '../services/role.api';
import type { EnterpriseUserStatus, EnterpriseUserType } from '../types/user';
import { USER_STATUS_LABELS, USER_TYPE_LABELS } from '../types/user';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  ...Object.entries(USER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Types' },
  ...Object.entries(USER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

interface Props {
  onViewChange?: (mode: UserViewMode) => void;
}

export function UserFilters({ onViewChange }: Props) {
  const { params, viewMode, setParams, setViewMode, resetParams } = useUserStore();
  const { data: rolesData } = useEnterpriseRoles();

  const [localSearch, setLocalSearch] = useState(params.search ?? '');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== params.search) {
        setParams({ search: localSearch, page: 1 });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [localSearch]);

  const hasActiveFilters =
    !!params.status || !!params.user_type || !!params.role_id || !!params.search;

  const handleViewMode = (mode: UserViewMode) => {
    setViewMode(mode);
    onViewChange?.(mode);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by name, username, email, employee ID, CNIC…"
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-9 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); setParams({ search: '', page: 1 }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <button
            onClick={() => handleViewMode('table')}
            className={`rounded-lg p-2 transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            title="Table view"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => handleViewMode('card')}
            className={`rounded-lg p-2 transition-all ${viewMode === 'card' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={14} className="text-zinc-400 shrink-0" />

        <select
          value={params.status ?? ''}
          onChange={(e) => setParams({ status: e.target.value, page: 1 })}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={params.user_type ?? ''}
          onChange={(e) => setParams({ user_type: e.target.value, page: 1 })}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {rolesData && (
          <select
            value={params.role_id ?? ''}
            onChange={(e) => setParams({ role_id: e.target.value, page: 1 })}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="">All Roles</option>
            {rolesData.items.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => { setLocalSearch(''); resetParams(); }}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
