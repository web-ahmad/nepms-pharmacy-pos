'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMedicineDetails, useBatches } from '@/features/inventory/services/inventory.api';
import { useAuthStore } from '@/stores/auth-store';
import { ArrowLeft, Box, Activity, Package, Settings, Settings2 } from 'lucide-react';
import MedicineForm from '@/features/inventory/components/MedicineForm';
import BatchDetails from '@/features/inventory/components/BatchDetails';
import StockMovementsList from '@/features/inventory/components/StockMovementsList';
import AuditHistoryList from '@/features/inventory/components/AuditHistoryList';
import StockAdjustmentModal from '@/features/inventory/components/StockAdjustmentModal';

type TabId = 'overview' | 'batches' | 'movements' | 'audit';

export default function MedicineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab') as TabId;
      if (tab && ['overview', 'batches', 'movements', 'audit'].includes(tab)) {
        setActiveTab(tab);
      }
      
      const adjust = searchParams.get('adjust');
      if (adjust === 'true') {
        setIsAdjustmentModalOpen(true);
      }
    }
  }, []);

  const { data: medicine, isLoading } = useMedicineDetails(id);
  const { data: batches } = useBatches(id);

  const canAdjustStock = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Inventory Manager' || user?.role === 'Branch Manager';

  if (isLoading) {
    return <div className="p-8 text-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div></div>;
  }

  if (!medicine) {
    return <div className="p-8 text-center text-red-500">Medicine not found.</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'batches', label: 'Batches', icon: Package },
    { id: 'movements', label: 'Stock Movements', icon: Activity },
    { id: 'audit', label: 'Audit Logs', icon: Box },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              {medicine.name}
              <span className={`text-xs px-2 py-0.5 rounded-full ${medicine.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                {medicine.is_active ? 'Active' : 'Inactive'}
              </span>
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              Stock: {medicine.total_quantity} • Min: {medicine.reorder_level}
            </p>
          </div>
        </div>

        {canAdjustStock && (
          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Settings2 size={16} />
            Adjust Stock
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`
                group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {activeTab === 'overview' && (
          <MedicineForm initialData={medicine} isEditMode={true} />
        )}
        {activeTab === 'batches' && (
          <BatchDetails medicineId={medicine.id} />
        )}
        {activeTab === 'movements' && (
          <StockMovementsList medicineId={medicine.id} />
        )}
        {activeTab === 'audit' && (
          <AuditHistoryList entityId={medicine.id} />
        )}
      </div>

      {/* Adjustment Modal */}
      <StockAdjustmentModal 
        isOpen={isAdjustmentModalOpen} 
        onClose={() => setIsAdjustmentModalOpen(false)} 
        medicineId={medicine.id}
        batches={batches || []}
      />
      
    </div>
  );
}
