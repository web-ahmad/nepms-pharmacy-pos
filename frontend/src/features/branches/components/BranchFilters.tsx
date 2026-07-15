'use client';
// features/branches/components/BranchFilters.tsx
// Animated filter bar: search, status pills, type pills, region, city.

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { useBranchStore } from '../store/branch-store';
import { BRANCH_STATUS_LABELS, BRANCH_TYPE_LABELS, type BranchStatus, type BranchType } from '../types/branch';

const STATUSES = Object.entries(BRANCH_STATUS_LABELS) as [BranchStatus, string][];
const TYPES    = Object.entries(BRANCH_TYPE_LABELS)   as [BranchType, string][];

export function BranchFilters() {
  const { filters, setFilter, resetFilters } = useBranchStore();
  const hasActiveFilters = filters.search || filters.status || filters.type || filters.region || filters.city;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Search + Reset */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search branches by name, code, city…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Region filter */}
          <input
            type="text"
            placeholder="Region"
            value={filters.region}
            onChange={(e) => setFilter('region', e.target.value)}
            className="w-28 px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {/* City filter */}
          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilter('city', e.target.value)}
            className="w-28 px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {/* Sort */}
          <select
            value={`${filters.sort_by}:${filters.sort_dir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(':');
              setFilter('sort_by', by);
              setFilter('sort_dir', dir);
            }}
            className="px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="name:asc">Name A→Z</option>
            <option value="name:desc">Name Z→A</option>
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="health_score:desc">Highest Health</option>
            <option value="health_score:asc">Lowest Health</option>
          </select>

          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              <X size={14} />
              Reset
            </motion.button>
          )}
        </div>
      </div>

      {/* Row 2: Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <Filter size={12} /> Status:
        </span>
        <button
          onClick={() => setFilter('status', '')}
          className={`px-3 py-1 text-xs rounded-full border font-medium transition ${
            !filters.status
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400'
          }`}
        >
          All
        </button>
        {STATUSES.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter('status', filters.status === val ? '' : val)}
            className={`px-3 py-1 text-xs rounded-full border font-medium transition ${
              filters.status === val
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: Type pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <Filter size={12} /> Type:
        </span>
        <button
          onClick={() => setFilter('type', '')}
          className={`px-3 py-1 text-xs rounded-full border font-medium transition ${
            !filters.type
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400'
          }`}
        >
          All
        </button>
        {TYPES.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter('type', filters.type === val ? '' : val)}
            className={`px-3 py-1 text-xs rounded-full border font-medium transition ${
              filters.type === val
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
