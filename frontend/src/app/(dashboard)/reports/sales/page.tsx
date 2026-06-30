"use client";

import { useState } from 'react';
import ReportFilters from '@/features/reports/components/ReportFilters';
import ReportTable from '@/features/reports/components/ReportTable';
import ExportEngine from '@/features/reports/components/ExportEngine';
import { useReportQuery } from '@/features/reports/services/reports.api';
import { DateRangeParams } from '@/features/reports/types';

export default function SalesReportPage() {
  const [params, setParams] = useState<DateRangeParams>({
    start_date: '',
    end_date: '',
    period: 'day'
  });
  const [reportType, setReportType] = useState('summary'); // summary, medicine, category

  const endpoints: Record<string, string> = {
    summary: '/api/v1/reports/sales/summary',
    medicine: '/api/v1/reports/sales/by-medicine',
    category: '/api/v1/reports/sales/by-category',
  };

  const { data, isLoading } = useReportQuery(endpoints[reportType], params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('summary')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'summary' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            Sales Summary
          </button>
          <button
            onClick={() => setReportType('medicine')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'medicine' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            By Medicine
          </button>
          <button
            onClick={() => setReportType('category')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${reportType === 'category' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
          >
            By Category
          </button>
        </div>

        <ExportEngine endpoint={endpoints[reportType]} params={params} filename={`sales_report_${reportType}`} />
      </div>

      <ReportFilters onFilterChange={setParams} showPeriod={reportType === 'summary'} />
      
      <ReportTable data={data!} isLoading={isLoading} />
    </div>
  );
}
