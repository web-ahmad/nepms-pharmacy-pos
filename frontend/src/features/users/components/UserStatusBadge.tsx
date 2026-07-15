'use client';
// features/users/components/UserStatusBadge.tsx

import { cn } from '@/lib/utils';
import type { EnterpriseUserStatus } from '../types/user';
import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '../types/user';

interface Props {
  status: EnterpriseUserStatus;
  size?: 'sm' | 'md';
}

export function UserStatusBadge({ status, size = 'sm' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        USER_STATUS_COLORS[status] ?? 'text-zinc-500 bg-zinc-50 border-zinc-200'
      )}
    >
      {USER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
