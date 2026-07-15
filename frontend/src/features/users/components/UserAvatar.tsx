'use client';
// features/users/components/UserAvatar.tsx

import { cn } from '@/lib/utils';

interface Props {
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const DOT_SIZE: Record<string, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarGradient(name?: string): string {
  const gradients = [
    'from-violet-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-fuchsia-500 to-purple-600',
  ];
  if (!name) return gradients[0];
  const code = name.charCodeAt(0) % gradients.length;
  return gradients[code];
}

export function UserAvatar({ name, avatarUrl, size = 'md', isOnline, className }: Props) {
  const sizeClass = SIZE_MAP[size];
  const dotClass = DOT_SIZE[size];

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? 'User'}
          className={cn('rounded-full object-cover', sizeClass)}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white select-none',
            getAvatarGradient(name),
            sizeClass
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-zinc-900',
            dotClass,
            isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
          )}
        />
      )}
    </div>
  );
}
