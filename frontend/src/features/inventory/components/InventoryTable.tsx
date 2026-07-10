'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMedicines, useBatches } from '../services/inventory.api';
import { useExpiryAlerts, useLowStockAlerts, useInventoryOverview } from '@/features/dashboard/services/dashboard.api';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Search, Edit, MoreVertical, PackageOpen, Eye, Trash, Loader2, Filter, AlertTriangle, CalendarDays, Wallet, Box, Download, Upload, CheckSquare, X } from 'lucide-react';
import StockAdjustmentModal from './StockAdjustmentModal';
import { Medicine } from '../types/inventory';
import { useDeleteMedicine, useBulkDeleteMedicines } from '../services/medicine.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [adjustingMedicine, setAdjustingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [filters, setFilters] = useState<{category?: string, status?: string, expiry?: string}>({});
  
  // Temporary state for the filter panel before applying ffffffffffffffffffd
  const [tempFilters, setTempFilters] = useState<{category?: string, status?: string, expiry?: string}>({});
  const deleteMutation = useDeleteMedicine();
  const bulkDeleteMutation = useBulkDeleteMedicines();
  const { user } = useAuthStore();

  const canCreate = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Inventory Manager';
  const canEdit = canCreate;
  const canAdjust = user?.role === 'Super Admin' || user?.role === 'Pharmacy Owner' || user?.role === 'Owner' || user?.role === 'Inventory Manager' || user?.role === 'Branch Manager';

  const { data, isLoading } = useMedicines(searchTerm, page, 20, filters);

  // Dashboard Metrics
  const { data: expiryAlerts } = useExpiryAlerts();
  const { data: lowStockAlerts } = useLowStockAlerts();
  const { data: inventoryOverview } = useInventoryOverview();

  const expiryCount = expiryAlerts?.length || 0;
  const lowStockCount = lowStockAlerts?.length || 0;
  const totalValuation = inventoryOverview?.stock_valuation || 0;
  const activeSKUs = inventoryOverview?.total_medicines || 0;

  const handleDeleteConfirm = async () => {
    if (!deletingMedicine) return;
    try {
      await deleteMutation.mutateAsync(deletingMedicine.id);
      toast.success('Product deleted successfully', {
        duration: 4000,
        style: { background: '#10b981', color: '#fff', fontWeight: 500 }
      });
      setDeletingMedicine(null);
    } catch (error: any) {
      toast.error(parseApiError(error));
      setDeletingMedicine(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    
    const items = Array.from(selectedIds);
    const CHUNK_SIZE = 200;
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE);
    
    setProgress({ current: 0, total: items.length });
    let totalSuccess = 0;
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await bulkDeleteMutation.mutateAsync(chunk);
        totalSuccess += chunk.length;
        setProgress({ current: Math.min((i + 1) * CHUNK_SIZE, items.length), total: items.length });
      }
      toast.success(`${totalSuccess} products deleted successfully`, {
        duration: 4000,
        style: { background: '#10b981', color: '#fff', fontWeight: 500 }
      });
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error: any) {
      toast.error(parseApiError(error));
      setShowBulkDeleteConfirm(false);
    } finally {
      setProgress(null);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === data?.items?.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = data?.items?.map((item: any) => item.id) || [];
      setSelectedIds(new Set(allIds));
    }
  };

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-[#0b1c30]">
            Inventory Management
          </h2>
          <p className="mt-1 text-[14px] text-[#45464d]">
            Monitor clinical stock levels, valuations, and expiry tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setTempFilters(filters);
              setIsFilterOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-[#c6c6cd] rounded-[4px] text-[#0b1c30] text-[14px] font-semibold hover:bg-[#eff4ff] transition-colors"
          >
            <Filter size={16} /> Filters
            {(filters.category || filters.status || filters.expiry) && (
              <span className="flex items-center justify-center w-5 h-5 ml-1 text-[11px] text-white bg-[#0058be] rounded-full">
                {[filters.category, filters.status, filters.expiry].filter(Boolean).length}
              </span>
            )}
          </button>
          {canCreate && (
            <>
              <Link href="/inventory/medicines/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-[#0058be] text-[#0058be] rounded-[4px] text-[14px] font-semibold hover:bg-[#eff4ff] transition-colors shadow-sm">
                <Upload size={16} /> Import Medicines
              </Link>
              <Link href="/inventory/medicines/add" className="flex items-center gap-2 px-4 py-2 bg-[#0058be] text-white rounded-[4px] text-[14px] font-semibold hover:bg-[#2170e4] transition-colors shadow-sm">
                <Plus size={16} /> Add New Medicine
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in delay-1">
        {/* Attention Required Card */}
        <div className="bg-[#fefce8] border border-[#fcdeb5] rounded-[8px] p-5 relative overflow-hidden transition-all hover:shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 bg-[#fcdeb5] rounded-[8px] flex items-center justify-center opacity-40">
            <CalendarDays className="text-[#574425] w-5 h-5" />
          </div>
          <p className="text-[12px] font-bold text-[#574425] tracking-widest uppercase mb-1">Attention Required</p>
          <h3 className="text-[24px] font-bold text-[#271901]">{expiryCount} Batches</h3>
          <p className="text-[14px] text-[#574425] mt-1">Near-expiry in next 30 days</p>
        </div>

        {/* Critical Inventory Card */}
        <div className="bg-[#fff1f0] border border-[#ffdad6] rounded-[8px] p-5 relative overflow-hidden transition-all hover:shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 bg-[#ffdad6] rounded-[8px] flex items-center justify-center opacity-40">
            <AlertTriangle className="text-[#93000a] w-5 h-5" />
          </div>
          <p className="text-[12px] font-bold text-[#93000a] tracking-widest uppercase mb-1">Critical Inventory</p>
          <h3 className="text-[24px] font-bold text-[#93000a]">{lowStockCount} Items</h3>
          <p className="text-[14px] text-[#93000a] mt-1">Below minimum threshold</p>
        </div>

        {/* Inventory Value Card */}
        <div className="bg-[#f0f5ff] border border-[#d8e2ff] rounded-[8px] p-5 relative overflow-hidden transition-all hover:shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 bg-[#d8e2ff] rounded-[8px] flex items-center justify-center opacity-40">
            <Wallet className="text-[#004395] w-5 h-5" />
          </div>
          <p className="text-[12px] font-bold text-[#004395] tracking-widest uppercase mb-1">Inventory Value</p>
          <h3 className="text-[24px] font-bold text-[#001a42]">Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
          <p className="text-[14px] text-[#004395] mt-1">Total stock valuation</p>
        </div>

        {/* Active Inventory Card */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-5 relative overflow-hidden transition-all hover:shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 bg-[#f1f5f9] rounded-[8px] flex items-center justify-center opacity-60">
            <Box className="text-[#475569] w-5 h-5" />
          </div>
          <p className="text-[12px] font-bold text-[#475569] tracking-widest uppercase mb-1">Active Inventory</p>
          <h3 className="text-[24px] font-bold text-[#0f172a]">{activeSKUs} SKUs</h3>
          <p className="text-[14px] text-[#475569] mt-1">Currently tracked medicines</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-[8px] border border-[#e2e8f0] bg-white shadow-sm overflow-hidden animate-fade-in delay-2">
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="relative w-full max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d]" size={16} />
            <input
              type="text"
              placeholder="Search medicines, generic, barcode..."
              className="w-full rounded-[4px] border border-[#c6c6cd] py-2 pl-9 pr-4 text-[14px] focus:border-[#0058be] focus:outline-none focus:ring-1 focus:ring-[#0058be] text-[#0b1c30] placeholder:text-[#76777d] bg-[#f8f9ff]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Floating Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-[#eff4ff] border border-[#0058be]/30 px-4 py-1.5 rounded-[4px] animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-[13px] font-bold text-[#0058be] mr-2">
                {selectedIds.size} Selected
              </span>
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-[#0058be] hover:bg-[#0058be]/10 rounded-sm"
                title="Clear Selection"
              >
                <X size={16} />
              </button>
              <div className="w-px h-5 bg-[#c6c6cd] mx-1"></div>
              {canEdit && (
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-[4px] transition-colors"
                >
                  <Trash size={14} /> Delete Selected
                </button>
              )}
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#0058be] hover:bg-[#0058be]/10 rounded-[4px] transition-colors">
                <Download size={14} /> Export CSV
              </button>
              {canEdit && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#0058be] hover:bg-[#0058be]/10 rounded-[4px] transition-colors">
                  <CheckSquare size={14} /> Bulk Update
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8f9ff] text-[#45464d] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[#c6c6cd] text-[#0058be] focus:ring-[#0058be] cursor-pointer"
                    checked={data?.items?.length > 0 && selectedIds.size === data?.items?.length}
                    onChange={toggleAllSelection}
                  />
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Medicine Name</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Category / Generic</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-center">Stock Qty</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-left">Selling Price</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-left">Stock Value</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-center">Status</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#76777d]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-[#0058be]"></div>
                      <span className="text-[14px]">Loading clinical data...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[#76777d]">
                    <PackageOpen className="mx-auto h-10 w-10 text-[#c6c6cd] mb-3" />
                    <p className="text-[14px] font-semibold text-[#0b1c30]">No records found</p>
                    <p className="text-[13px] mt-1">Adjust search parameters or initialize a new SKU.</p>
                  </td>
                </tr>
              ) : (
                data?.items?.map((med: any) => {
                  const outOfStock = med.total_quantity <= 0;
                  const lowStock = med.total_quantity <= med.reorder_level;
                  const salePrice = med.unit_retail_price || med.packaging_levels?.find((p: any) => p.is_smallest_unit)?.sale_price || med.packaging_levels?.[0]?.sale_price || 0;

                  return (
                    <tr key={med.id} className={`transition-colors group ${selectedIds.has(med.id) ? 'bg-[#eff4ff]' : 'hover:bg-[#f1f5f9]'}`}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#c6c6cd] text-[#0058be] focus:ring-[#0058be] cursor-pointer"
                          checked={selectedIds.has(med.id)}
                          onChange={() => toggleSelection(med.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0b1c30] text-[14px]">{med.name}</div>
                        <div className="text-[12px] text-[#76777d] mt-0.5">{med.manufacturer || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0b1c30] text-[13px]">{med.category || 'Medicine'}</div>
                        <div className="text-[12px] text-[#76777d] mt-0.5">{med.generic_name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-bold text-[14px] ${lowStock || outOfStock ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
                          {med.total_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-[#45464d] text-[13px]">
                        Rs {salePrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-[#0058be] text-[13px]">
                        Rs {(med.stock_value || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {outOfStock ? (
                          <span className="inline-flex items-center rounded-xl px-2.5 py-0.5 text-[11px] font-bold bg-[#e2e8f0] text-[#45464d]">Out of Stock</span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center rounded-xl px-2.5 py-0.5 text-[11px] font-bold bg-[#ffdad6] text-[#93000a]">Low Stock</span>
                        ) : (
                          <span className="inline-flex items-center rounded-xl px-2.5 py-0.5 text-[11px] font-bold bg-[#d1fae5] text-[#065f46]">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 transition-opacity relative">
                          <Link
                            href={`/inventory/${med.id}`}
                            className="p-1.5 text-[#76777d] hover:text-[#0b1c30] transition-colors rounded-sm hover:bg-[#e2e8f0]"
                            title="View Record"
                          >
                            <Eye size={16} />
                          </Link>
                          {canEdit && (
                            <Link
                              href={`/inventory/medicines/${med.id}/edit`}
                              className="p-1.5 text-[#76777d] hover:text-[#0058be] transition-colors rounded-sm hover:bg-[#e2e8f0]"
                              title="Edit Record"
                            >
                              <Edit size={16} />
                            </Link>
                          )}
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === med.id ? null : med.id)}
                            className="p-1.5 text-[#76777d] hover:text-[#0b1c30] transition-colors rounded-sm hover:bg-[#e2e8f0]"
                            title="More Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === med.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-[4px] border border-[#e2e8f0] bg-white p-1 shadow-lg z-40 text-left animate-in fade-in zoom-in-95 duration-100">
                                <Link
                                  href={`/inventory/${med.id}?tab=batches`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="block rounded-sm px-3 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] hover:text-[#0058be] transition-colors font-medium"
                                >
                                  View Batches
                                </Link>
                                <Link
                                  href={`/inventory/${med.id}?tab=movements`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="block rounded-sm px-3 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] hover:text-[#0058be] transition-colors font-medium"
                                >
                                  Stock Movements
                                </Link>
                                {canAdjust && (
                                  <button
                                    onClick={() => { setActiveMenuId(null); setAdjustingMedicine(med); }}
                                    className="w-full text-left rounded-sm px-3 py-2 text-[13px] text-[#0b1c30] hover:bg-[#eff4ff] hover:text-[#0058be] transition-colors font-medium"
                                  >
                                    Adjust Stock
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => { setActiveMenuId(null); setDeletingMedicine(med); }}
                                    className="w-full flex items-center gap-2 text-left rounded-sm px-3 py-2 text-[13px] text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition-colors font-medium"
                                  >
                                    <Trash size={14} /> Delete Product
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#e2e8f0] p-4 bg-[#f8f9ff]/50">
          <p className="text-[13px] text-[#76777d]">
            Showing <span className="font-bold text-[#0b1c30]">{data?.items?.length ? (page - 1) * 20 + 1 : 0}</span> to <span className="font-bold text-[#0b1c30]">{Math.min(page * 20, data?.total || 0)}</span> of <span className="font-bold text-[#0b1c30]">{data?.total || 0}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-[4px] border border-[#c6c6cd] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0b1c30] hover:bg-[#f8f9ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data?.total || page * 20 >= data.total}
              className="rounded-[4px] border border-[#c6c6cd] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0b1c30] hover:bg-[#f8f9ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {adjustingMedicine && (
        <StockAdjustmentWrapper medicine={adjustingMedicine} onClose={() => setAdjustingMedicine(null)} />
      )}

      <AlertDialog open={!!deletingMedicine} onOpenChange={(open) => !open && setDeletingMedicine(null)}>
        <AlertDialogContent className="rounded-[8px] border-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0b1c30] text-[20px]">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#45464d] text-[14px]">
              Are you sure you want to delete this clinical record? This action cannot be undone and will erase stock valuation tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} className="border-[#c6c6cd] text-[#0b1c30] hover:bg-[#f8f9ff]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              className="bg-[#ba1a1a] hover:bg-[#93000a] text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Purging...</>
              ) : 'Delete Record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="rounded-[8px] border-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0b1c30] text-[20px]">Delete {selectedIds.size} Records?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#45464d] text-[14px]">
              This will permanently delete the selected records and their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending || !!progress} className="border-[#c6c6cd] text-[#0b1c30] hover:bg-[#f8f9ff]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDeleteConfirm(); }}
              className="bg-[#ba1a1a] hover:bg-[#93000a] text-white"
              disabled={bulkDeleteMutation.isPending || !!progress}
            >
              {progress ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Purging {progress.current}/{progress.total}...</>
              ) : bulkDeleteMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Purging...</>
              ) : 'Delete Selected Records'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filter Sidebar */}
      {isFilterOpen && (
        <>
          <div 
            className="fixed inset-0 bg-[#0b1c30]/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#e2e8f0]">
            <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8f9ff]">
              <div>
                <h3 className="text-[18px] font-bold text-[#0b1c30] flex items-center gap-2">
                  <Filter size={18} className="text-[#0058be]" /> Filter Inventory
                </h3>
                <p className="text-[13px] text-[#76777d] mt-1">Refine your clinical stock view</p>
              </div>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="p-2 text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Category Filter */}
              <div className="space-y-3">
                <label className="text-[14px] font-bold text-[#0b1c30]">Category</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={tempFilters.category || ''}
                    onChange={(e) => setTempFilters({ ...tempFilters, category: e.target.value })}
                    placeholder="e.g. Antibiotics, Painkillers..."
                    className="w-full rounded-[4px] border border-[#c6c6cd] py-2.5 px-3 text-[14px] focus:border-[#0058be] focus:outline-none focus:ring-1 focus:ring-[#0058be] text-[#0b1c30] placeholder:text-[#76777d]"
                  />
                </div>
              </div>

              {/* Stock Status Filter */}
              <div className="space-y-3">
                <label className="text-[14px] font-bold text-[#0b1c30]">Stock Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, status: undefined })}
                    className={`py-2 px-3 rounded-[4px] border text-[13px] font-semibold transition-colors ${!tempFilters.status ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    All Items
                  </button>
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, status: 'normal' })}
                    className={`py-2 px-3 rounded-[4px] border text-[13px] font-semibold transition-colors ${tempFilters.status === 'normal' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    Normal Stock
                  </button>
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, status: 'low' })}
                    className={`py-2 px-3 rounded-[4px] border text-[13px] font-semibold transition-colors ${tempFilters.status === 'low' ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    Low Stock
                  </button>
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, status: 'critical' })}
                    className={`py-2 px-3 rounded-[4px] border text-[13px] font-semibold transition-colors ${tempFilters.status === 'critical' ? 'bg-[#93000a] text-white border-[#93000a]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    Out of Stock
                  </button>
                </div>
              </div>

              {/* Expiry Filter */}
              <div className="space-y-3">
                <label className="text-[14px] font-bold text-[#0b1c30]">Expiry Status</label>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, expiry: undefined })}
                    className={`py-2 px-4 rounded-[4px] border text-[13px] font-semibold text-left transition-colors ${!tempFilters.expiry ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    Any Date
                  </button>
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, expiry: 'near_expiry' })}
                    className={`py-2 px-4 rounded-[4px] border text-[13px] font-semibold text-left transition-colors flex items-center justify-between ${tempFilters.expiry === 'near_expiry' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    <span>Near Expiry</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${tempFilters.expiry === 'near_expiry' ? 'bg-white/20 text-white' : 'bg-[#fff1f0] text-[#ba1a1a]'}`}>Next 30 Days</span>
                  </button>
                  <button 
                    onClick={() => setTempFilters({ ...tempFilters, expiry: 'expired' })}
                    className={`py-2 px-4 rounded-[4px] border text-[13px] font-semibold text-left transition-colors flex items-center justify-between ${tempFilters.expiry === 'expired' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f8f9ff]'}`}
                  >
                    <span>Expired</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${tempFilters.expiry === 'expired' ? 'bg-white/20 text-white' : 'bg-[#e2e8f0] text-[#45464d]'}`}>Past Due</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e2e8f0] bg-white grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setTempFilters({});
                  setFilters({});
                  setPage(1);
                  setIsFilterOpen(false);
                }}
                className="py-2.5 px-4 rounded-[4px] border border-[#c6c6cd] text-[14px] font-bold text-[#45464d] hover:bg-[#f8f9ff] transition-colors"
              >
                Reset All
              </button>
              <button 
                onClick={() => {
                  setFilters(tempFilters);
                  setPage(1);
                  setIsFilterOpen(false);
                }}
                className="py-2.5 px-4 rounded-[4px] bg-[#0058be] text-[14px] font-bold text-white hover:bg-[#2170e4] transition-colors shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StockAdjustmentWrapper({ medicine, onClose }: { medicine: Medicine; onClose: () => void }) {
  const { data: batches, isLoading } = useBatches(medicine.id);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-[8px] border border-[#e2e8f0] flex items-center gap-3 shadow-lg">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-[#0058be]"></div>
          <span className="text-[14px] font-medium text-[#0b1c30]">Loading batch integrity...</span>
        </div>
      </div>
    );
  }

  return <StockAdjustmentModal medicineId={medicine.id} batches={batches || []} isOpen={true} onClose={onClose} />;
}
