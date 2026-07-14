'use client';

import { useAuthStore } from '@/stores/auth-store';
import AttentionNeededPanel from '@/features/audit/components/AttentionNeededPanel';
import StaffRiskScoreList from '@/features/audit/components/StaffRiskScoreList';
import CashReconciliationTable from '@/features/audit/components/CashReconciliationTable';
import InventoryAuditTable from '@/features/audit/components/InventoryAuditTable';
import PrebuiltReportsSection from '@/features/audit/components/PrebuiltReportsSection';
import AlertConfigForm from '@/features/audit/components/AlertConfigForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert } from 'lucide-react';

export default function AuditDashboardPage() {
  const { branchId, user } = useAuthStore();
  
  // Extra client-side gate (Server-side API also enforces this)
  const role = user?.role?.toLowerCase() || '';
  if (role !== 'owner' && role !== 'admin' && role !== 'super admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Access Denied</h1>
        <p className="text-zinc-500 mt-2 max-w-md">
          You do not have the required permissions to view the Audit Module. 
          This area is strictly restricted to Owners and Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Audit & Compliance
        </h2>
      </div>

      <AttentionNeededPanel branchId={branchId || undefined} />

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900">
          <TabsTrigger value="tables">Data Tables</TabsTrigger>
          <TabsTrigger value="reports">Pre-Built Reports</TabsTrigger>
          <TabsTrigger value="settings">Alert Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tables" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StaffRiskScoreList branchId={branchId || undefined} />
            <CashReconciliationTable branchId={branchId || undefined} />
          </div>
          <InventoryAuditTable branchId={branchId || undefined} />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <PrebuiltReportsSection branchId={branchId || undefined} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6 max-w-4xl">
          <div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Automated Alert Configurations
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              Configure thresholds for immediate WhatsApp alerts and setup schedules for digest reports.
            </p>
            <AlertConfigForm branchId={branchId || undefined} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
