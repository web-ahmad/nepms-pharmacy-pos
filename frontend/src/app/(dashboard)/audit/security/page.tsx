"use client";

import { useState } from 'react';
import ReportFilters from '@/features/reports/components/ReportFilters';
import ExportEngine from '@/features/reports/components/ExportEngine';
import AuditTable from '@/features/audit/components/AuditTable';
import { useAuditQuery } from '@/features/audit/services/audit.api';
import { DateRangeParams } from '@/features/reports/types';

export default function SecurityAuditPage() {
  const [params, setParams] = useState<DateRangeParams>({
    start_date: '',
    end_date: ''
  });

  const { data, isLoading } = useAuditQuery('/api/v1/audit/security', params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Security Audit</h2>
        <ExportEngine endpoint="/api/v1/audit/security" params={params} filename="security_audit" />
      </div>

      <ReportFilters onFilterChange={setParams} />
      
      <AuditTable data={data!} isLoading={isLoading} />
    </div>
  );
}
