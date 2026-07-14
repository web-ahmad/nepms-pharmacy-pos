'use client';

import { useMemo } from 'react';
import { 
  useStaffRiskScores, 
  useCashReconciliation, 
  useInventoryFlags, 
  useAlertConfigs 
} from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';

export default function AttentionNeededPanel({ branchId }: { branchId?: string }) {
  const { data: riskScores, isLoading: isLoadingRisk } = useStaffRiskScores(branchId);
  const { data: reconciliations, isLoading: isLoadingCash } = useCashReconciliation(branchId);
  const { data: inventoryFlags, isLoading: isLoadingInventory } = useInventoryFlags(branchId);
  const { data: configs, isLoading: isLoadingConfigs } = useAlertConfigs(branchId);

  const isLoading = isLoadingRisk || isLoadingCash || isLoadingInventory || isLoadingConfigs;

  const criticalIssues = useMemo(() => {
    if (isLoading) return [];
    
    const issues = [];

    // 1. Red-Risk Staff
    if (riskScores) {
      const redStaff = riskScores.filter((r: any) => r.risk_level === 'red');
      redStaff.forEach((staff: any) => {
        issues.push({
          type: 'staff_risk',
          icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
          title: `Critical Staff Risk: ${staff.staff_id}`,
          description: `Risk Score: ${staff.risk_score}/100. High voids/refunds detected.`,
          severity: 'high'
        });
      });
    }

    // 2. Large Cash Variances (using dynamic threshold)
    if (reconciliations && configs) {
      // Find the cash_variance config threshold. Fallback to 50 if not found.
      const cashConfig = configs.find((c: any) => c.event_type === 'cash_variance');
      const threshold = cashConfig?.threshold_value ? Number(cashConfig.threshold_value) : 50;

      const largeVariances = reconciliations.filter((r: any) => Math.abs(Number(r.variance)) >= threshold);
      largeVariances.forEach((rec: any) => {
        const isShortage = Number(rec.variance) < 0;
        issues.push({
          type: 'cash_variance',
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          title: `Large Cash ${isShortage ? 'Shortage' : 'Overage'} on ${rec.shift_date}`,
          description: `Variance of $${Math.abs(Number(rec.variance)).toFixed(2)} exceeds alert threshold of $${threshold}.`,
          severity: 'medium'
        });
      });
    }

    // 3. Expired Stock
    if (inventoryFlags) {
      const expired = inventoryFlags.filter((f: any) => f.flag_type === 'expired');
      expired.forEach((flag: any) => {
        issues.push({
          type: 'inventory',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          title: `Expired Stock Detected`,
          description: `Product ID: ${flag.product_id}. Still in active stock!`,
          severity: 'high'
        });
      });
    }

    return issues;
  }, [isLoading, riskScores, reconciliations, inventoryFlags, configs]);

  if (isLoading) {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        </CardContent>
      </Card>
    );
  }

  if (criticalIssues.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900/50">
        <CardContent className="p-6">
          <p className="text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All clear. No critical attention needed at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-white dark:bg-zinc-950 dark:border-red-900/50 shadow-sm">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5" />
          Attention Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {criticalIssues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="mt-0.5">{issue.icon}</div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {issue.title}
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {issue.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
