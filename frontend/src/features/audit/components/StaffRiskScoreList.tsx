'use client';

import { useStaffRiskScores } from '../hooks/useAuditData';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const LEVEL_CONFIG = {
  red:    { label: 'HIGH RISK', bar: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',    ring: 'ring-red-200 dark:ring-red-800'    },
  yellow: { label: 'MEDIUM',    bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', ring: 'ring-yellow-200 dark:ring-yellow-800' },
  green:  { label: 'LOW RISK',  bar: 'bg-green-500',  text: 'text-green-600 dark:text-green-400',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  ring: 'ring-green-200 dark:ring-green-800'  },
};

export default function StaffRiskScoreList({ branchId }: { branchId?: string }) {
  const { data, isLoading, error } = useStaffRiskScores(branchId);

  const redCount    = (data || []).filter((r: any) => r.risk_level === 'red').length;
  const yellowCount = (data || []).filter((r: any) => r.risk_level === 'yellow').length;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Staff Risk Scores</h3>
            <p className="text-xs text-zinc-400">Last 30 days activity</p>
          </div>
        </div>
        {!isLoading && data && (
          <div className="flex gap-2">
            {redCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {redCount} high
              </span>
            )}
            {redCount === 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> All clear
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
              </div>
            </div>
          ))
        ) : error ? (
          <p className="text-sm text-red-500 py-4 text-center">Failed to load risk scores.</p>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-zinc-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No staff activity this period.</p>
          </div>
        ) : (
          data.map((row: any, idx: number) => {
            const cfg = LEVEL_CONFIG[row.risk_level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.green;
            const score = Math.min(100, row.risk_score);
            return (
              <div
                key={`${row.staff_id}-${row.branch_id}`}
                className="group flex items-center gap-3"
                style={{ animation: `fadeSlideUp 0.35s ease both`, animationDelay: `${idx * 60}ms` }}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full ring-2 ${cfg.ring} flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800`}>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {(row.staff_name || row.staff_id || '?').charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {row.staff_name || row.staff_id}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-xs font-bold ${cfg.text}`}>{score}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cfg.bar} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-zinc-400">{row.void_count} voids</span>
                    <span className="text-xs text-zinc-400">{row.discount_count ?? 0} discounts</span>
                    <span className="text-xs text-zinc-400">{row.refund_count} refunds</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
