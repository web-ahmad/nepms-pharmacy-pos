"use client";

import { Target } from 'lucide-react';

export default function LowStockReportsPage() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center animate-in fade-in duration-500">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Target size={32} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Low Stock Reports</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Advanced analytics for Reorder Levels, Critical Stock, and Auto Purchase Suggestions are under construction.
        </p>
      </div>
    </div>
  );
}
