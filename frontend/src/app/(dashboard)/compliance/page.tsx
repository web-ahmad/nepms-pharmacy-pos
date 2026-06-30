"use client";

export default function ComplianceDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a href="/compliance/audit-logs" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700">
          <div className="text-indigo-600 dark:text-indigo-400 mb-3 text-2xl">📋</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Audit Logs</h3>
          <p className="text-sm text-zinc-500 mt-1">Full immutable trail of all user and system actions.</p>
        </a>
        <a href="/compliance/sensitive-actions" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-red-300 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-red-700">
          <div className="text-red-600 dark:text-red-400 mb-3 text-2xl">🚨</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400">Sensitive Actions</h3>
          <p className="text-sm text-zinc-500 mt-1">Filtered high-risk actions: exports, deletions, payroll runs.</p>
        </a>
        <a href="/compliance/login-history" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-zinc-400 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-zinc-600 dark:text-zinc-400 mb-3 text-2xl">🔐</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Login History</h3>
          <p className="text-sm text-zinc-500 mt-1">Track session logins, IPs, and timestamps.</p>
        </a>
        <a href="/compliance/retention" className="group p-6 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-zinc-400 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-zinc-600 dark:text-zinc-400 mb-3 text-2xl">⏱️</div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Data Retention</h3>
          <p className="text-sm text-zinc-500 mt-1">Set retention periods for logs and audit data.</p>
        </a>
      </div>
    </div>
  );
}
