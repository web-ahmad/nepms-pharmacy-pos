import React from 'react';
import { useFormContext } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Boxes, Truck } from 'lucide-react';

export default function Step5InventoryAndSupplier() {
  const { register } = useFormContext<MedicineFormValues>();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-indigo-500" />
          Inventory & Supplier
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure stock limits and primary supplier details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inventory */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">Stock Levels</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Stock Level</Label>
              <Input type="number" {...register('min_stock_level', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label>Maximum Stock Level</Label>
              <Input type="number" {...register('max_stock_level', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level (Alert Trigger)</Label>
              <Input type="number" {...register('reorder_level', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
          </div>

          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 pt-4 border-t border-slate-200 dark:border-zinc-800">Physical Location</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shelf</Label>
              <Input {...register('shelf')} placeholder="A-12" className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label>Rack</Label>
              <Input {...register('rack')} placeholder="3" className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Warehouse</Label>
              <Input {...register('warehouse')} placeholder="Main Warehouse" className="bg-white dark:bg-zinc-900" />
            </div>
          </div>
        </div>

        {/* Supplier */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            Primary Supplier Integration
          </h3>
          
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="space-y-2">
              <Label>Preferred Supplier</Label>
              <Input {...register('preferred_supplier')} placeholder="Supplier ID or Name" className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label>Supplier Product Code</Label>
              <Input {...register('supplier_product_code')} className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="space-y-2">
              <Label>Supplier Barcode</Label>
              <Input {...register('supplier_barcode')} className="bg-white dark:bg-zinc-900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (Days)</Label>
                <Input type="number" {...register('lead_time', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input type="number" {...register('minimum_order_quantity', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
