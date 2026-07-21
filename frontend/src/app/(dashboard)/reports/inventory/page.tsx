"use client";

import { useState } from 'react';
import ReportTable from '@/features/reports/components/ReportTable';
import ExportEngine from '@/features/reports/components/ExportEngine';
import { useReportQuery } from '@/features/reports/services/reports.api';
import { DateRangeParams } from '@/features/reports/types';
import { Package, AlertTriangle, Clock, Ban } from 'lucide-react';

export default function InventoryReportPage() {
  const [params] = useState<DateRangeParams>({
    start_date: '',
    end_date: '',
    expired: false
  });
  
  type TabType = 'valuation' | 'low_stock' | 'near_expiry' | 'expired';
  const [activeTab, setActiveTab] = useState<TabType>('valuation');

  const getEndpoint = (tab: TabType) => {
    switch (tab) {
      case 'valuation': return '/api/v1/reports/inventory/valuation';
      case 'low_stock': return '/api/v1/reports/inventory/low-stock';
      case 'near_expiry': return '/api/v1/reports/inventory/expiry?expired=false';
      case 'expired': return '/api/v1/reports/inventory/expiry?expired=true';
    }
  };

  const { data, isLoading } = useReportQuery(getEndpoint(activeTab), params, true);

  const tabs = [
    { id: 'valuation', label: 'Stock Valuation', icon: Package, description: 'Current value of active stock' },
    { id: 'low_stock', label: 'Low Stock Alerts', icon: AlertTriangle, description: 'Items at or below reorder level' },
    { id: 'near_expiry', label: 'Near Expiry', icon: Clock, description: 'Items expiring in next 90 days' },
    { id: 'expired', label: 'Expired Stock', icon: Ban, description: 'Items past their expiry date' },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Inventory Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Monitor stock levels, valuation, and expiration risks across your pharmacy.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportEngine endpoint={getEndpoint(activeTab)} params={params} filename={`inventory_${activeTab}_report`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                isActive 
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500 dark:border-blue-500/50 dark:bg-blue-500/10 dark:ring-blue-500/50' 
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/50'
              }`}
            >
              <div className={`rounded-lg p-2 ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-medium ${isActive ? 'text-blue-900 dark:text-blue-100' : 'text-zinc-900 dark:text-zinc-100'}`}>{tab.label}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{tab.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <ReportTable data={data!} isLoading={isLoading} />
      </div>
    </div>
  );
}
