"use client";

import { useState } from 'react';
import ReportFilters from '@/features/reports/components/ReportFilters';
import ReportTable from '@/features/reports/components/ReportTable';
import ExportEngine from '@/features/reports/components/ExportEngine';
import { useReportQuery } from '@/features/reports/services/reports.api';
import { DateRangeParams } from '@/features/reports/types';

export default function FinancialReportPage() {
  const [params, setParams] = useState<DateRangeParams>({
    start_date: '',
    end_date: ''
  });

  const { data, isLoading } = useReportQuery('/api/v1/reports/financial/profit-and-loss', params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Profit & Loss Statement</h2>
        <ExportEngine endpoint="/api/v1/reports/financial/profit-and-loss" params={params} filename="profit_and_loss_report" />
      </div>

      <ReportFilters onFilterChange={setParams} />
      
      <ReportTable data={data!} isLoading={isLoading} />
    </div>
  );
}
