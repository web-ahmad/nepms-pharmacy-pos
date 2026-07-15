'use client';
// app/(dashboard)/branches/page.tsx — Branch List Page

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Plus, LayoutGrid, List, Download, GitCompare, X,
} from 'lucide-react';
import { useBranches, useBranchDashboard } from '@/features/branches/services/branch.api';
import { useBranchStore, selectApiParams } from '@/features/branches/store/branch-store';
import { BranchKPICards }    from '@/features/branches/components/BranchKPICards';
import { BranchFilters }     from '@/features/branches/components/BranchFilters';
import { BranchTable }       from '@/features/branches/components/BranchTable';
import { BranchCard }        from '@/features/branches/components/BranchCard';
import { DeleteBranchDialog } from '@/features/branches/components/DeleteBranchDialog';
import type { Branch } from '@/features/branches/types/branch';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const router = useRouter();
  const { viewMode, setViewMode, filters, comparisonIds, clearComparison } = useBranchStore();
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const apiParams = selectApiParams(filters);
  const { data, isLoading, isFetching } = useBranches(apiParams);
  const { data: dashboard, isLoading: dashLoading } = useBranchDashboard();

  const branches = data?.items ?? [];
  const total    = data?.total ?? 0;
  const pages    = data?.pages ?? 1;

  async function handleExportCSV() {
    try {
      const res = await api.get('/api/v1/enterprise/branches?limit=1000&page=1');
      const items: Branch[] = res.data?.items ?? [];
      const headers = ['name','code','type','status','city','province','phone','email','manager_name','staff_count','health_score'];
      const rows = items.map((b) => headers.map((h) => ((b as unknown as Record<string,unknown>)[h] ?? '')).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'branches.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Branches exported to CSV');
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Branch Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage all pharmacy branches across your network
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <Download size={14} /> Export CSV
          </button>
          {comparisonIds.length >= 2 && (
            <button
              onClick={() => router.push(`/branches/compare?ids=${comparisonIds.join(',')}`)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition"
            >
              <GitCompare size={14} /> Compare ({comparisonIds.length})
            </button>
          )}
          <button
            onClick={() => router.push('/branches/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Plus size={14} /> New Branch
          </button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <BranchKPICards summary={dashboard} isLoading={dashLoading} />
      </motion.div>

      {/* Comparison banner */}
      {comparisonIds.length > 0 && comparisonIds.length < 2 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm"
        >
          <p className="text-amber-700 dark:text-amber-400">
            Select {2 - comparisonIds.length} more {comparisonIds.length === 1 ? 'branch' : 'branches'} to compare
          </p>
          <button onClick={clearComparison} className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-300">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
          <BranchFilters />
        </div>
      </motion.div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isFetching && !isLoading
            ? <span className="text-indigo-600 dark:text-indigo-400">Refreshing…</span>
            : <><span className="font-semibold text-zinc-900 dark:text-zinc-100">{total}</span> branches found</>
          }
        </p>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg transition ${viewMode === 'card' ? 'bg-white dark:bg-zinc-900 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
        {viewMode === 'table' ? (
          <BranchTable
            data={branches}
            total={total}
            page={filters.page}
            pages={pages}
            limit={filters.limit}
            isLoading={isLoading}
            onDelete={setBranchToDelete}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                ))
              : branches.map((branch, i) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    index={i}
                    onDelete={setBranchToDelete}
                  />
                ))
            }
          </div>
        )}
      </motion.div>

      {/* Delete dialog */}
      <DeleteBranchDialog
        branch={branchToDelete}
        onClose={() => setBranchToDelete(null)}
      />
    </div>
  );
}
