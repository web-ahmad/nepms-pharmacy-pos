'use client';
// features/branches/components/BranchTypeBadge.tsx

import {
  Building2, Store, Warehouse, Truck, Landmark, Globe, Clock3, Crown,
} from 'lucide-react';
import { BRANCH_TYPE_LABELS, type BranchType } from '../types/branch';

const TYPE_CONFIG: Record<BranchType, { bg: string; text: string; icon: React.ElementType }> = {
  head_office:         { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', icon: Crown },
  main_branch:         { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', icon: Building2 },
  retail_branch:       { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-400',     icon: Store },
  warehouse:           { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-400',   icon: Warehouse },
  distribution_center: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: Truck },
  franchise_branch:    { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-700 dark:text-pink-400',     icon: Landmark },
  online_branch:       { bg: 'bg-cyan-50 dark:bg-cyan-900/20',     text: 'text-cyan-700 dark:text-cyan-400',     icon: Globe },
  temporary_branch:    { bg: 'bg-zinc-100 dark:bg-zinc-800',        text: 'text-zinc-600 dark:text-zinc-400',     icon: Clock3 },
};

interface Props {
  type: BranchType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function BranchTypeBadge({ type, showIcon = true, size = 'md' }: Props) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.retail_branch;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
        ${config.bg} ${config.text}`}
    >
      {showIcon && <Icon size={12} />}
      {BRANCH_TYPE_LABELS[type]}
    </span>
  );
}
