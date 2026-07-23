'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Boxes } from 'lucide-react';
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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Overview
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Welcome back, {user?.username}. Here's what's happening today.
            </p>
          </div>
        </div>

        {/* Only show Date Filter if the role makes sense for it (most do) */}
        <DashboardFilter dateRange={dateRange} onChange={setDateRange} />
      </motion.div>

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
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Inventory Pulse
          </h3>
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
