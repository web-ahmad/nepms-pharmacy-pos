'use client';

import { useMemo } from 'react';
import {
  useStaffRiskScores,
  useCashReconciliation,
  useInventoryFlags,
  useAlertConfigs,
} from '../hooks/useAuditData';
import { ShieldAlert, AlertTriangle, PackageX, CheckCircle2, Loader2 } from 'lucide-react';

export default function AttentionNeededPanel({ branchId }: { branchId?: string }) {
  const { data: riskScores,      isLoading: l1 } = useStaffRiskScores(branchId);
  const { data: reconciliations, isLoading: l2 } = useCashReconciliation(branchId);
  const { data: inventoryFlags,  isLoading: l3 } = useInventoryFlags(branchId);
  const { data: configs,         isLoading: l4 } = useAlertConfigs(branchId);
  const isLoading = l1 || l2 || l3 || l4;

  const issues = useMemo(() => {
    if (isLoading) return [];
    const list: any[] = [];

    (riskScores || []).filter((r: any) => r.risk_level === 'red').forEach((s: any) => {
      list.push({
        id:          `risk-${s.staff_id}`,
        kind:        'staff',
        title:       `High-Risk Staff: ${s.staff_name || s.staff_id}`,
        detail:      `Score ${s.risk_score}/100 — ${s.void_count} voids, ${s.refund_count} refunds`,
        severity:    'critical',
      });
    });

    const cashThreshold = (configs || []).find((c: any) => c.event_type === 'cash_variance')?.threshold_value ?? 50;
    (reconciliations || []).filter((r: any) => Math.abs(Number(r.variance)) >= cashThreshold).forEach((r: any, i: number) => {
      const short = Number(r.variance) < 0;
      list.push({
        id:          `cash-${i}`,
        kind:        'cash',
        title:       `Cash ${short ? 'Shortage' : 'Overage'} on ${r.shift_date || 'Unknown Date'}`,
        detail:      `Rs ${Math.abs(Number(r.variance)).toFixed(2)} variance (threshold: Rs ${cashThreshold})`,
        severity:    'high',
      });
    });

    (inventoryFlags || []).filter((f: any) => f.flag_type === 'expired').slice(0, 5).forEach((f: any) => {
      list.push({
        id:          `inv-${f.id}`,
        kind:        'inventory',
        title:       `Expired Stock: ${f.product_name}`,
        detail:      `Batch ${f.batch_no || '—'} expired ${Math.abs(f.days_remaining ?? 0)}d ago — ${f.qty} units on shelf`,
        severity:    'critical',
      });
    });

    return list;
  }, [isLoading, riskScores, reconciliations, inventoryFlags, configs]);

  const SEVERITY = {
    critical: {
      bg:     'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800/60',
      bar:    'bg-red-500',
      icon:   <ShieldAlert className="w-5 h-5 text-red-500" />,
      badge:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      text:   'CRITICAL',
    },
    high: {
      bg:     'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800/60',
      bar:    'bg-orange-500',
      icon:   <AlertTriangle className="w-5 h-5 text-orange-500" />,
      badge:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      text:   'HIGH',
    },
    medium: {
      bg:     'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-800/60',
      bar:    'bg-yellow-500',
      icon:   <PackageX className="w-5 h-5 text-yellow-600" />,
      badge:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      text:   'MEDIUM',
    },
  } as const;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/20">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300 text-sm">All Clear</p>
          <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">No critical issues detected. System operating normally.</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-600 dark:text-green-400 text-xs font-medium">Live</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          {issues.length} issue{issues.length !== 1 ? 's' : ''} require attention
        </p>
        <span className="text-xs text-zinc-400">{new Date().toLocaleTimeString()}</span>
      </div>

      {/* Issue cards — horizontal scrolling row on mobile, grid on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {issues.map((issue, idx) => {
          const sev = SEVERITY[issue.severity as keyof typeof SEVERITY] || SEVERITY.medium;
          return (
            <div
              key={issue.id}
              className={`relative overflow-hidden rounded-xl border ${sev.bg} ${sev.border} p-4 transition-transform duration-200 hover:scale-[1.02] hover:shadow-md`}
              style={{ animationDelay: `${idx * 80}ms`, animation: 'fadeSlideUp 0.4s ease both' }}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${sev.bar}`} />

              <div className="flex items-start gap-3 pl-2">
                <div className="flex-shrink-0 mt-0.5">{sev.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sev.badge}`}>
                      {sev.text}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 leading-tight">{issue.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{issue.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
