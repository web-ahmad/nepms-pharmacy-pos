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
  const { user, hasPermission } = useAuthStore();
  // RBAC 4.0: Use hierarchy_level + permissions, never role.name strings
  // isCashier / isInventoryManager: derived from permission grants, not role names
  const isCashier          = !hasPermission('sales:manage') && hasPermission('pos:view');
  const isInventoryManager = hasPermission('inventory:manage') && !hasPermission('sales:manage');
  // L1 (SaaS), L2 (Pharmacy Owner), L3 (Branch Owner) = full operational access
  const hasFullAccess      = (user?.hierarchy_level ?? 4) <= 3;


  // Default to today
  const [dateRange, setDateRange] = useState<DateRange>({
    from_date: format(new Date(), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd')
  });

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

      {/* Conditionally Render Based on Role and Permissions */}
      
      {/* Sales Overview */}
      {(!isInventoryManager && hasPermission('sales:view')) && (
        <section>
          <SalesOverview dateRange={dateRange} />
        </section>
      )}

      {/* Charts */}
      {(!isInventoryManager && !isCashier && hasPermission('sales:view') && hasPermission('reports:view')) && (
        <section>
          <SalesChart dateRange={dateRange} />
        </section>
      )}

      {/* Inventory Overview */}
      {(hasPermission('inventory:view') || hasFullAccess || isInventoryManager) && (
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
