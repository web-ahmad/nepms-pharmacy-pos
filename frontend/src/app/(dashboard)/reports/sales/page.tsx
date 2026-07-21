"use client";

import { useState } from 'react';
import UniversalDataTable from '@/features/reports/components/UniversalDataTable';
import { useDynamicReport } from '@/features/reports/api/dynamic-reports.api';

export default function SalesReportPage() {
  const [reportType, setReportType] = useState('sales_daily'); 
  
  const { data, isLoading } = useDynamicReport(reportType);

  const tabs = [
    { id: 'sales_daily', label: 'Daily Sales' },
    { id: 'sales_category', label: 'By Category' },
    { id: 'sales_cashier', label: 'By Cashier' },
    { id: 'sales_discounts', label: 'Discounts Given' },
    { id: 'sales_voided', label: 'Voided Bills' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Sales Reports</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Comprehensive breakdown of all sales metrics powered by the Dynamic Reporting Engine.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              reportType === tab.id 
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 
        This single UniversalDataTable seamlessly renders ALL 5 reports 
        without writing 5 different table components!
      */}
      <UniversalDataTable 
        data={data || null} 
        isLoading={isLoading} 
        rowsPerPage={10} 
      />
    </div>
  );
}
