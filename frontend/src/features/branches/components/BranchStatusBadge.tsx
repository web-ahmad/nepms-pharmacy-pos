'use client';
// features/branches/components/BranchStatusBadge.tsx

import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Construction, ShieldOff, DoorClosed, Wrench,
} from 'lucide-react';
import { BRANCH_STATUS_LABELS, type BranchStatus } from '../types/branch';

const STATUS_CONFIG: Record<
  BranchStatus,
  { bg: string; text: string; dot: string; icon: React.ElementType }
> = {
  active:             { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
  inactive:           { bg: 'bg-zinc-100 dark:bg-zinc-800',          text: 'text-zinc-500 dark:text-zinc-400',       dot: 'bg-zinc-400',    icon: XCircle },
  under_construction: { bg: 'bg-amber-50 dark:bg-amber-900/20',       text: 'text-amber-700 dark:text-amber-400',    dot: 'bg-amber-500',   icon: Construction },
  suspended:          { bg: 'bg-red-50 dark:bg-red-900/20',           text: 'text-red-700 dark:text-red-400',        dot: 'bg-red-500',     icon: ShieldOff },
  closed:             { bg: 'bg-zinc-100 dark:bg-zinc-800',          text: 'text-zinc-500 dark:text-zinc-400',       dot: 'bg-zinc-600',    icon: DoorClosed },
  maintenance:        { bg: 'bg-blue-50 dark:bg-blue-900/20',         text: 'text-blue-700 dark:text-blue-400',      dot: 'bg-blue-500',    icon: Wrench },
};

interface Props {
  status: BranchStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  animate?: boolean;
}

export function BranchStatusBadge({ status, showIcon = true, size = 'md', animate = true }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  const Icon = config.icon;
  const isActive = status === 'active';

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
        ${config.bg} ${config.text}`}
    >
      {isActive ? (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
      ) : (
        showIcon && <Icon size={12} />
      )}
      {BRANCH_STATUS_LABELS[status]}
    </span>
  );

  if (!animate) return badge;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {badge}
    </motion.span>
  );
}
