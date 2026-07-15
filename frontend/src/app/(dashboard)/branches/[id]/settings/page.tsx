'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Settings, 
  Clock, 
  Calendar, 
  Monitor, 
  Box, 
  Printer, 
  FileText, 
  Percent, 
  Palette, 
  ShieldCheck, 
  History,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { branchConfigService } from '@/features/branches/services/branchConfigService';

// Placeholder imports for the 12 tab panels (we will create these next)
import OverviewTab from '@/features/branches/components/Settings/OverviewTab';
import GeneralTab from '@/features/branches/components/Settings/GeneralTab';
import WorkingHoursTab from '@/features/branches/components/Settings/WorkingHoursTab';
import HolidaysTab from '@/features/branches/components/Settings/HolidaysTab';
import CountersTab from '@/features/branches/components/Settings/CountersTab';
import WarehousesTab from '@/features/branches/components/Settings/WarehousesTab';
import PrintersDevicesTab from '@/features/branches/components/Settings/PrintersDevicesTab';
import DocumentsTab from '@/features/branches/components/Settings/DocumentsTab';
import TaxesFinanceTab from '@/features/branches/components/Settings/TaxesFinanceTab';
import BrandingPosTab from '@/features/branches/components/Settings/BrandingPosTab';
import SecurityBackupTab from '@/features/branches/components/Settings/SecurityBackupTab';
import AuditTrailTab from '@/features/branches/components/Settings/AuditTrailTab';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity, component: OverviewTab },
  { id: 'general', label: 'General', icon: Settings, component: GeneralTab },
  { id: 'working_hours', label: 'Working Hours', icon: Clock, component: WorkingHoursTab },
  { id: 'holidays', label: 'Holidays', icon: Calendar, component: HolidaysTab },
  { id: 'counters', label: 'Counters', icon: Monitor, component: CountersTab },
  { id: 'warehouses', label: 'Warehouses', icon: Box, component: WarehousesTab },
  { id: 'printers_devices', label: 'Printers & Devices', icon: Printer, component: PrintersDevicesTab },
  { id: 'documents', label: 'Documents & Invoice', icon: FileText, component: DocumentsTab },
  { id: 'taxes_finance', label: 'Taxes & Finance', icon: Percent, component: TaxesFinanceTab },
  { id: 'branding_pos', label: 'Branding & POS', icon: Palette, component: BrandingPosTab },
  { id: 'security_backup', label: 'Security & Backup', icon: ShieldCheck, component: SecurityBackupTab },
  { id: 'audit', label: 'Audit Trail', icon: History, component: AuditTrailTab },
];

export default function BranchSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Fetch all branch settings overview
  const { data: settingsOverview, isLoading, error, refetch } = useQuery({
    queryKey: ['branch-settings-overview', branchId],
    queryFn: () => branchConfigService.getSettingsOverview(branchId),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-6">
          <Skeleton className="w-64 h-[600px] rounded-xl" />
          <Skeleton className="flex-1 h-[600px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !settingsOverview) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Settings</h2>
        <p className="text-muted-foreground mb-4">Could not load the branch configuration. Please try again.</p>
        <Button onClick={() => refetch()} variant="outline">Retry</Button>
      </div>
    );
  }

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || tabs[0].component;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branch Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure operations, hardware, taxes, and security for this branch.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3 lg:col-span-2 space-y-1 bg-card border rounded-2xl p-3 shadow-sm h-fit sticky top-24">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group
                  ${isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9 lg:col-span-10">
          <div className="bg-card border rounded-2xl p-6 shadow-sm min-h-[700px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ActiveComponent branchId={branchId} data={settingsOverview} refetch={refetch} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
