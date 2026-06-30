"use client";

import { useState } from 'react';
import ReportFilters from '@/features/reports/components/ReportFilters';
import ReportTable from '@/features/reports/components/ReportTable';
import ExportEngine from '@/features/reports/components/ExportEngine';
import { useReportQuery } from '@/features/reports/services/reports.api';
import { DateRangeParams } from '@/features/reports/types';

export default function InventoryReportPage() {
  const [params, setParams] = useState<DateRangeParams>({
    start_date: '',
    end_date: '',
    expired: false
  });
  const [reportType, setReportType] = useState('valuation'); // valuation, low_stock, expiry

  const endpoints: Record<string, string> = {
    valuation: '/api/v1/reports/inventory/valuation',
    low_stock: '/api/v1/reports/inventory/low-stock',
    expiry: '/api/v1/reports/inventory/expiry',
  };

  // Inventory reports typically don't need strict start/end date for current stock unless it's a movement ledger.
  // Our backend doesn't strictly enforce dates for current stock, but we pass them if needed.
  const { data, isLoading } = useReportQuery(endpoints[reportType], params, true);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('valuation')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'valuation' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            Inventory Valuation
          </button>
          <button
            onClick={() => setReportType('low_stock')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'low_stock' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            Low Stock Alerts
          </button>
          <button
            onClick={() => { setReportType('expiry'); setParams({...params, expired: true}); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'expiry' && params.expired ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            Expired Stock
          </button>
          <button
            onClick={() => { setReportType('expiry'); setParams({...params, expired: false}); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'expiry' && !params.expired ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            Near Expiry (90 days)
          </button>
        </div>

        <ExportEngine endpoint={endpoints[reportType]} params={params} filename={`inventory_report_${reportType}`} />
      </div>

      <ReportTable data={data!} isLoading={isLoading} />
    </div>
  );
}
