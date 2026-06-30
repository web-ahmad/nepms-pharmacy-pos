'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { DateRange } from '@/features/dashboard/services/dashboard.api';
import DashboardFilter from '@/features/dashboard/components/DashboardFilter';
import SalesOverview from '@/features/dashboard/components/SalesOverview';
import InventoryOverview from '@/features/dashboard/components/InventoryOverview';
import AlertsTable from '@/features/dashboard/components/AlertsTable';
import SalesChart from '@/features/dashboard/components/SalesChart';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  // Default to today
  const [dateRange, setDateRange] = useState<DateRange>({
    from_date: format(new Date(), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd')
  });

  const isCashier = user?.role === 'Cashier';
  const isInventoryManager = user?.role === 'Inventory Manager';
  const hasFullAccess = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Branch Manager';

  return (
    <div className="flex h-full flex-col space-y-6 pb-8">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Overview
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back, {user?.username}. Here's what's happening today.
          </p>
        </div>
        
        {/* Only show Date Filter if the role makes sense for it (most do) */}
        <DashboardFilter dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Conditionally Render Based on Role */}
      
      {/* Sales Overview (Everyone sees their version of it based on API RBAC) */}
      {!isInventoryManager && (
        <section>
          <SalesOverview dateRange={dateRange} />
        </section>
      )}

      {/* Charts */}
      {!isInventoryManager && !isCashier && (
        <section>
          <SalesChart dateRange={dateRange} />
        </section>
      )}

      {/* Inventory Overview */}
      {(hasFullAccess || isInventoryManager) && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">Inventory Pulse</h3>
          <InventoryOverview />
        </section>
      )}

      {/* Alerts */}
      {(hasFullAccess || isInventoryManager) && (
        <section>
          <AlertsTable />
        </section>
      )}
      
    </div>
  );
}
