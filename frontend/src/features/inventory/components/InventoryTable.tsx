'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMedicines, useBatches } from '../services/inventory.api';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Search, Edit, MoreVertical, PackageOpen } from 'lucide-react';
import InventoryAlerts from './InventoryAlerts';
import StockAdjustmentModal from './StockAdjustmentModal';
import { Medicine } from '../types/inventory';

export default function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [adjustingMedicine, setAdjustingMedicine] = useState<Medicine | null>(null);
  const { user } = useAuthStore();
  
  // Custom permissions check based on requirements
  const canCreate = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Inventory Manager';
  const canEdit = canCreate;
  const canAdjust = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Inventory Manager' || user?.role === 'Branch Manager';

  const { data, isLoading } = useMedicines(searchTerm, page, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Inventory Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your medicines, stock levels, and track valuations.
          </p>
        </div>
        
        {canCreate && (
          <Link
            href="/inventory/medicines/add"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus size={16} />
            Add Medicine
          </Link>
        )}
      </div>

      <InventoryAlerts variant="inventory" />

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, generic, barcode..."
              className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="p-4 font-medium">Medicine Name</th>
                <th className="p-4 font-medium">Category / Generic</th>
                <th className="p-4 font-medium text-right">Stock Qty</th>
                <th className="p-4 font-medium text-right">Selling Price</th>
                <th className="p-4 font-medium text-right">Stock Value</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
                      <span>Loading medicines...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    <PackageOpen className="mx-auto h-12 w-12 text-zinc-300 mb-3" />
                    <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">No medicines found</p>
                    <p className="mt-1">Try adjusting your search or add a new medicine.</p>
                  </td>
                </tr>
              ) : (
                data?.items?.map((med: any) => (
                  <tr key={med.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{med.name}</div>
                      <div className="text-xs text-zinc-500">{med.manufacturer}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-zinc-900 dark:text-zinc-300">{med.category}</div>
                      <div className="text-xs text-zinc-500">{med.generic_name || '-'}</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono ${med.total_quantity <= med.reorder_level ? 'text-red-600 dark:text-red-400 font-bold' : 'text-zinc-900 dark:text-zinc-300'}`}>
                        {med.total_quantity}
                      </span>
                    </td>
                    <td className="p-4 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                      Rs {med.sale_price.toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-mono font-medium">
                      Rs {(med.total_quantity * med.purchase_price).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        med.is_active 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {med.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {canEdit && (
                          <Link
                            href={`/inventory/medicines/${med.id}`}
                            className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                            title="Edit Details"
                          >
                            <Edit size={16} />
                          </Link>
                        )}
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === med.id ? null : med.id)}
                          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMenuId === med.id && (
                          <>
                            {/* Backdrop to catch click-outside and close the menu */}
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setActiveMenuId(null)}
                            />
                            {/* Dropdown Menu container */}
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 z-40 text-left">
                              <Link 
                                href={`/inventory/${med.id}`}
                                onClick={() => setActiveMenuId(null)}
                                className="block rounded-sm px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                              >
                                View Details
                              </Link>
                              {canEdit && (
                                <Link 
                                  href={`/inventory/medicines/${med.id}`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="block rounded-sm px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                >
                                  Edit Details
                                </Link>
                              )}
                              <Link 
                                href={`/inventory/${med.id}?tab=batches`}
                                onClick={() => setActiveMenuId(null)}
                                className="block rounded-sm px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                              >
                                View Batches
                              </Link>
                              <Link 
                                href={`/inventory/${med.id}?tab=movements`}
                                onClick={() => setActiveMenuId(null)}
                                className="block rounded-sm px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                              >
                                Stock Movements
                              </Link>
                              {canAdjust && (
                                <button 
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setAdjustingMedicine(med);
                                  }}
                                  className="w-full text-left rounded-sm px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                >
                                  Adjust Stock
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Showing <span className="font-medium">{data?.items?.length || 0}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data?.items || data.items.length < 20}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      {adjustingMedicine && (
        <StockAdjustmentWrapper
          medicine={adjustingMedicine}
          onClose={() => setAdjustingMedicine(null)}
        />
      )}
    </div>
  );
}

function StockAdjustmentWrapper({ medicine, onClose }: { medicine: Medicine; onClose: () => void }) {
  const { data: batches, isLoading } = useBatches(medicine.id);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border dark:border-zinc-800 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading batches...</span>
        </div>
      </div>
    );
  }

  return (
    <StockAdjustmentModal
      medicineId={medicine.id}
      batches={batches || []}
      isOpen={true}
      onClose={onClose}
    />
  );
}
