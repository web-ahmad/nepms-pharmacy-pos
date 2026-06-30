"use client";

import { useState } from 'react';
import ReportTable from '@/features/reports/components/ReportTable';
import ExportEngine from '@/features/reports/components/ExportEngine';
import { useReportQuery } from '@/features/reports/services/reports.api';

export default function CustomerReportPage() {
  const { data, isLoading } = useReportQuery('/api/v1/reports/crm/summary', { start_date: 'all', end_date: 'all' }, true);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Customer & Loyalty Summary</h2>
        <ExportEngine endpoint="/api/v1/reports/crm/summary" params={{ start_date: 'all', end_date: 'all' }} filename="customer_report" />
      </div>

      <ReportTable data={data!} isLoading={isLoading} />
    </div>
  );
}
