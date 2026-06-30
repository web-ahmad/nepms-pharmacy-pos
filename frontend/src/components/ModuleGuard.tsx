'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useModules } from '@/lib/modules';

interface ModuleGuardProps {
  /** The module_key that must be enabled for this page/section to be accessible */
  moduleKey: string;
  children: ReactNode;
  /** Optional: custom element to render when blocked. Defaults to a styled block screen. */
  fallback?: ReactNode;
}

/**
 * ModuleGuard wraps page content and redirects / shows a blocked screen
 * when the given module is disabled by an administrator.
 *
 * Usage:
 *   <ModuleGuard moduleKey="customers">
 *     <CustomersPage />
 *   </ModuleGuard>
 */
export default function ModuleGuard({ moduleKey, children, fallback }: ModuleGuardProps) {
  const { isModuleEnabled, isLoading } = useModules();

  if (isLoading) {
    // Skeleton during initial load — avoids flicker
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isModuleEnabled(moduleKey)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Module Disabled</h2>
        <p className="max-w-md text-zinc-500 dark:text-zinc-400">
          The <span className="font-semibold text-zinc-700 dark:text-zinc-300">{moduleKey}</span> module has been
          disabled by your system administrator. Contact your admin to re-enable access.
        </p>
        <a
          href="/settings/modules"
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to Module Management
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
