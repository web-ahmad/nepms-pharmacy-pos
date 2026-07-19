'use client';

import { useAuthStore } from '@/stores/auth-store';
import AttentionNeededPanel from '@/features/audit/components/AttentionNeededPanel';
import StaffRiskScoreList from '@/features/audit/components/StaffRiskScoreList';
import CashReconciliationTable from '@/features/audit/components/CashReconciliationTable';
import InventoryAuditTable from '@/features/audit/components/InventoryAuditTable';
import PrebuiltReportsSection from '@/features/audit/components/PrebuiltReportsSection';
import AlertConfigForm from '@/features/audit/components/AlertConfigForm';
import AuditEventsTable from '@/features/audit/components/AuditEventsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldAlert, ShieldCheck, Activity, BarChart3, Settings2,
  Database, Eye, AlertTriangle
} from 'lucide-react';

export default function AuditDashboardPage() {
  const { branchId, user, hasPermission } = useAuthStore();

  if (!hasPermission('audit:view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Access Denied</h1>
        <p className="text-zinc-500 mt-2 max-w-md text-sm leading-relaxed">
          You do not have the required permissions to view the Audit Module.
          This area is restricted to Owners and Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 pt-5 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900">

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 shadow-xl">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 40%),
                            radial-gradient(circle at 60% 80%, #06b6d4 0%, transparent 40%)`
        }} />
        {/* Animated orbs */}
        <div className="absolute top-4 right-16 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl animate-pulse" />
        <div className="absolute bottom-2 right-8 w-20 h-20 rounded-full bg-purple-500/10 blur-xl" style={{ animation: 'pulse 3s ease-in-out infinite 1s' }} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Audit & Compliance</h1>
              <p className="text-blue-200/80 text-sm mt-0.5">Real-time surveillance · Camera capture · WhatsApp alerts</p>
            </div>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
            <span className="text-white/80 text-xs font-medium">LIVE MONITORING</span>
          </div>
        </div>
      </div>

      {/* ── Attention Panel ──────────────────────────────────────── */}
      <AttentionNeededPanel branchId={branchId || undefined} />

      {/* ── Main Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl p-1 gap-1 h-auto flex flex-wrap">
          {[
            { value: 'overview',   label: 'Overview',      icon: Activity   },
            { value: 'rbac',       label: 'RBAC & Login',  icon: ShieldAlert },
            { value: 'sales',      label: 'Sales & POS',   icon: Database   },
            { value: 'inventory',  label: 'Inv & Purchase', icon: Eye        },
            { value: 'reports',    label: 'Reports',       icon: BarChart3  },
            { value: 'settings',   label: 'Alert Config',  icon: Settings2  },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium
                           text-zinc-500 dark:text-zinc-400
                           data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500
                           data-[state=active]:text-white data-[state=active]:shadow-md
                           transition-all duration-200 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StaffRiskScoreList branchId={branchId || undefined} />
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[300px]">
              <ShieldCheck className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">System Health Good</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-sm">No critical compliance breaches detected in the last 24 hours.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── RBAC & Login Tab ──────────────────────────────────── */}
        <TabsContent value="rbac" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AuditEventsTable branchId={branchId || undefined} />
        </TabsContent>

        {/* ── Sales Tab ──────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CashReconciliationTable branchId={branchId || undefined} />
        </TabsContent>

        {/* ── Inventory Tab ──────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <InventoryAuditTable branchId={branchId || undefined} />
        </TabsContent>

        {/* ── Reports Tab ─────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PrebuiltReportsSection branchId={branchId || undefined} />
        </TabsContent>

        {/* ── Settings Tab ─────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="max-w-4xl">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-500" />
                Alert Configurations
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                Control which events trigger real-time WhatsApp alerts and configure thresholds.
              </p>
            </div>
            <AlertConfigForm branchId={branchId || undefined} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
