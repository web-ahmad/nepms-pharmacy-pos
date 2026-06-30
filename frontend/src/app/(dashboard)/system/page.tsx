"use client";

import Link from 'next/link';

export default function SystemDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/system/health" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-green-700">
          <div className="text-green-600 dark:text-green-400 mb-3 text-2xl">🟢</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-green-600 dark:group-hover:text-green-400">System Health</h3>
          <p className="text-sm text-zinc-500 mt-1">Real-time database, CPU and memory metrics.</p>
        </Link>
        <Link href="/system/backups" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700">
          <div className="text-blue-600 dark:text-blue-400 mb-3 text-2xl">💾</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">Backup Manager</h3>
          <p className="text-sm text-zinc-500 mt-1">Trigger and download database snapshots.</p>
        </Link>
        <Link href="/system/ocr-queue" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700">
          <div className="text-indigo-600 dark:text-indigo-400 mb-3 text-2xl">🧠</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">OCR AI Queue</h3>
          <p className="text-sm text-zinc-500 mt-1">Monitor background prescription extraction jobs.</p>
        </Link>
      </div>
    </div>
  );
}
