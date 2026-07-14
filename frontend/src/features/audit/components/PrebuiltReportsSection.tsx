'use client';

import { useState } from 'react';
import { usePrebuiltReport } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, AlertCircle } from 'lucide-react';

const REPORTS = [
  { id: 'staff_risk', label: 'Staff Risk Report' },
  { id: 'void_discount', label: 'Void/Discount Trend' },
  { id: 'cash_reconciliation', label: 'Cash Reconciliation' },
  { id: 'inventory_shrinkage', label: 'Inventory Shrinkage' },
  { id: 'expiry', label: 'Expiry Report' }
];

export default function PrebuiltReportsSection({ branchId }: { branchId?: string }) {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Generate Report</CardTitle>
          <CardDescription>Select a pre-built template.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {REPORTS.map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeReport === report.id 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              {report.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="md:col-span-3">
        {activeReport ? (
          <ReportViewer reportType={activeReport} branchId={branchId} />
        ) : (
          <Card className="h-full border-dashed bg-zinc-50/50 dark:bg-zinc-900/10">
            <CardContent className="h-full flex flex-col items-center justify-center text-zinc-500 py-12">
              <FileText className="w-12 h-12 mb-4 text-zinc-300 dark:text-zinc-700" />
              <p>Select a report template from the left to view data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportViewer({ reportType, branchId }: { reportType: string; branchId?: string }) {
  const { data, isLoading, error } = usePrebuiltReport(reportType, branchId, 'monthly');
  const reportLabel = REPORTS.find(r => r.id === reportType)?.label;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-zinc-500">Generating report via backend proxy...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
          <AlertCircle className="w-10 h-10 mb-4" />
          <p className="font-semibold text-lg mb-1">Failed to generate report</p>
          <p className="text-sm opacity-80 text-center max-w-md">
            The Python backend might be offline or returned an error. <br/>
            Detail: {error instanceof Error ? error.message : 'Unknown proxy error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{reportLabel} (Monthly)</span>
          <span className="text-xs font-normal text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">Proxy JSON</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto flex-1 bg-zinc-950">
        <pre className="p-4 text-xs font-mono text-green-400 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
