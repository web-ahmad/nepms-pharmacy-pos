'use client';
// features/branches/components/BranchCard.tsx
// Premium card for the card grid view of the branch list.

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MapPin, Phone, Mail, Users, ExternalLink, Edit, Trash2, BarChart2,
  CheckSquare, Square,
} from 'lucide-react';
import type { Branch } from '../types/branch';
import { BranchStatusBadge } from './BranchStatusBadge';
import { BranchTypeBadge } from './BranchTypeBadge';
import { BranchHealthScore } from './BranchHealthScore';
import { useBranchStore } from '../store/branch-store';

interface Props {
  branch: Branch;
  index?: number;
  onDelete?: (branch: Branch) => void;
  showCompare?: boolean;
}

export function BranchCard({ branch, index = 0, onDelete, showCompare = true }: Props) {
  const router = useRouter();
  const { comparisonIds, toggleComparison } = useBranchStore();
  const isSelected = comparisonIds.includes(branch.id);
  const themeColor = branch.theme_color || '#6366f1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      className={`relative rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-200 cursor-pointer group
        ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
      `}
      onClick={() => router.push(`/branches/${branch.id}`)}
    >
      {/* Colored top bar */}
      <div className="h-1.5 w-full" style={{ background: themeColor }} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar / initials */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md"
              style={{ background: themeColor }}
            >
              {branch.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {branch.name}
              </h3>
              {branch.type === 'main_branch' ? (
                <p className="text-xs text-zinc-400 font-mono">Main branch</p>
              ) : branch.code ? (
                <p className="text-xs text-zinc-400 font-mono">Branch - {branch.code}</p>
              ) : null}
            </div>
          </div>

          {/* Compare checkbox */}
          {showCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleComparison(branch.id); }}
              className="flex-shrink-0 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
            >
              {isSelected
                ? <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                : <Square size={16} />
              }
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <BranchStatusBadge status={branch.status} size="sm" animate={false} />
          <BranchTypeBadge   type={branch.type}     size="sm" />
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {(branch.city || branch.province) && (
            <div className="flex items-center gap-1.5">
              <MapPin size={11} className="flex-shrink-0" />
              <span className="truncate">{[branch.city, branch.province].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="flex-shrink-0" />
              <span className="truncate">{branch.phone}</span>
            </div>
          )}
          {branch.manager_name && (
            <div className="flex items-center gap-1.5">
              <Users size={11} className="flex-shrink-0" />
              <span className="truncate">{branch.manager_name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Users size={11} />
            <span>{branch.staff_count ?? 0} staff</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/branches/${branch.id}/stats`); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              title="Stats"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/branches/${branch.id}/edit`); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              title="Edit"
            >
              <Edit size={14} />
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(branch); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <BranchHealthScore score={branch.health_score ?? 100} size={40} showLabel={false} />
        </div>
      </div>
    </motion.div>
  );
}
