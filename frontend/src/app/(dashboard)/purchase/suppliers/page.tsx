'use client';

import { useState } from 'react';
import SupplierTable from '@/features/purchase/components/SupplierTable';
import SupplierForm from '@/features/purchase/components/SupplierForm';
import { useAuthStore } from '@/stores/auth-store';
import { useSupplierDetails } from '@/features/purchase/services/purchase.api';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const canEdit = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Branch Manager';

  // Fetch details if editing
  const { data: editingSupplier } = useSupplierDetails(editingId || 'new');

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Supplier Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your suppliers, credit limits, and view financial ledgers.
          </p>
        </div>
        
        {canEdit && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus size={16} />
            Add Supplier
          </button>
        )}
      </div>

      <SupplierTable onEdit={handleEdit} onViewLedger={(id) => router.push(`/purchase/suppliers/${id}/ledger`)} canEdit={canEdit} />

      {/* Supplier Form Modal/Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-[95vw] lg:max-w-7xl max-h-[95vh] flex flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-950 border dark:border-zinc-800">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {editingId ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={closeForm} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* If editing, wait for data to load to prevent empty form flashes */}
              {editingId && !editingSupplier ? (
                <div className="p-12 text-center text-zinc-500 font-medium">Loading supplier details...</div>
              ) : (
                <SupplierForm 
                  initialData={editingSupplier || undefined} 
                  onSuccess={closeForm} 
                  onCancel={closeForm} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
