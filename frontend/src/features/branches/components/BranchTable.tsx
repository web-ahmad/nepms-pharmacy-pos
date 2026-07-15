'use client';
// features/branches/components/BranchTable.tsx
// Full TanStack Table v8 data table for the branch list view.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Eye, Edit, Trash2, BarChart2, MoreHorizontal, CheckSquare, Square,
} from 'lucide-react';
import type { Branch } from '../types/branch';
import { BranchStatusBadge } from './BranchStatusBadge';
import { BranchTypeBadge } from './BranchTypeBadge';
import { BranchHealthScore } from './BranchHealthScore';
import { useBranchStore } from '../store/branch-store';

interface Props {
  data: Branch[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  isLoading?: boolean;
  onDelete?: (branch: Branch) => void;
}

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  if (!state) return <ArrowUpDown size={12} className="text-zinc-400 ml-1" />;
  if (state === 'asc') return <ArrowUp size={12} className="text-indigo-600 ml-1" />;
  return <ArrowDown size={12} className="text-indigo-600 ml-1" />;
}

export function BranchTable({ data, total, page, pages, limit, isLoading, onDelete }: Props) {
  const router = useRouter();
  const { setPage, setFilter, comparisonIds, toggleComparison } = useBranchStore();

  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      // Compare checkbox
      {
        id: 'compare',
        header: '',
        size: 40,
        cell: ({ row }) => (
          <button
            onClick={(e) => { e.stopPropagation(); toggleComparison(row.original.id); }}
            className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {comparisonIds.includes(row.original.id)
              ? <CheckSquare size={15} className="text-indigo-600 dark:text-indigo-400" />
              : <Square size={15} />
            }
          </button>
        ),
      },
      // Name + code
      {
        accessorKey: 'name',
        header: 'Branch',
        cell: ({ row }) => {
          const b = row.original;
          const color = b.theme_color || '#6366f1';
          return (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: color }}
              >
                {b.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-none">{b.name}</p>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{b.code}</p>
              </div>
            </div>
          );
        },
      },
      // Type
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <BranchTypeBadge type={getValue() as Branch['type']} size="sm" />
        ),
      },
      // Status
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <BranchStatusBadge status={getValue() as Branch['status']} size="sm" animate={false} />
        ),
      },
      // Location
      {
        accessorKey: 'city',
        header: 'Location',
        cell: ({ row }) => {
          const { city, province, region } = row.original;
          return (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {[city, province].filter(Boolean).join(', ') || '—'}
            </span>
          );
        },
      },
      // Manager
      {
        accessorKey: 'manager_name',
        header: 'Manager',
        cell: ({ getValue }) => (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {(getValue() as string) || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
          </span>
        ),
      },
      // Staff
      {
        accessorKey: 'staff_count',
        header: 'Staff',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {getValue() as number ?? 0}
          </span>
        ),
      },
      // Health
      {
        accessorKey: 'health_score',
        header: 'Health',
        cell: ({ getValue }) => (
          <BranchHealthScore score={(getValue() as number) ?? 100} size={36} showLabel={false} />
        ),
      },
      // Actions
      {
        id: 'actions',
        header: '',
        size: 120,
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => router.push(`/branches/${b.id}`)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                title="View"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => router.push(`/branches/${b.id}/edit`)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                title="Edit"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => router.push(`/branches/${b.id}?tab=stats`)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                title="Stats"
              >
                <BarChart2 size={14} />
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(b)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [router, comparisonIds, toggleComparison, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pages,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 animate-pulse last:border-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap select-none"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <AnimatePresence mode="wait">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-zinc-300 dark:text-zinc-600">
                          <path d="M3 21l2-7 8-8 5 5-8 8-7 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No branches found</p>
                      <p className="text-xs text-zinc-400">Try adjusting your filters or create a new branch.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    onClick={() => router.push(`/branches/${row.original.id}`)}
                    className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of{' '}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{total}</span> branches
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const pg = i + 1;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                  pg === page
                    ? 'bg-indigo-600 text-white'
                    : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {pg}
              </button>
            );
          })}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
