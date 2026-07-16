"use client";

import { Target } from 'lucide-react';

export default function PerformancePage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <Target size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
      <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">Performance Management</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
        Enterprise Performance Review module is coming soon.
      </p>
    </div>
  );
}
