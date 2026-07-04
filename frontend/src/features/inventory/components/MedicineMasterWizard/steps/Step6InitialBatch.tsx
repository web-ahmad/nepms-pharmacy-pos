import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { History, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Step6InitialBatch() {
  const { register, control, setValue } = useFormContext<MedicineFormValues>();
  
  const hasInitialBatch = useWatch({ control, name: 'initial_batch' });
  const isEnabled = !!hasInitialBatch;

  const toggleBatch = (checked: boolean) => {
    if (checked) {
      setValue('initial_batch', {
        batch_number: '',
        expiry_date: '',
        current_stock: 0
      });
    } else {
      setValue('initial_batch', undefined);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Initial Batch / Opening Stock
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Add opening stock for this medicine.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="enable_batch" checked={isEnabled} onCheckedChange={toggleBatch} />
            <Label htmlFor="enable_batch">Enable Opening Stock</Label>
          </div>
        </div>
      </div>

      {!isEnabled ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center">
          <History className="w-10 h-10 text-slate-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-slate-600 dark:text-slate-400 font-medium">No Opening Stock</h3>
          <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1 max-w-sm">
            Enable opening stock if you want to immediately add inventory quantities during creation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <div className="space-y-2">
            <Label>Batch / Lot Number *</Label>
            <Input {...register('initial_batch.batch_number')} className="bg-white dark:bg-zinc-900" />
          </div>
          
          <div className="space-y-2">
            <Label>Opening Quantity (in Base Units) *</Label>
            <Input type="number" {...register('initial_batch.current_stock', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
          </div>

          <div className="space-y-2">
            <Label>Manufacturing Date</Label>
            <Input type="date" {...register('initial_batch.manufacturing_date')} className="bg-white dark:bg-zinc-900" />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date *</Label>
            <Input type="date" {...register('initial_batch.expiry_date')} className="bg-white dark:bg-zinc-900" />
          </div>

          <div className="space-y-2">
            <Label>Supplier ID</Label>
            <Input {...register('initial_batch.supplier_id')} className="bg-white dark:bg-zinc-900" />
          </div>
          
          <div className="space-y-2">
            <Label>Purchase Invoice / GRN</Label>
            <Input {...register('initial_batch.purchase_invoice_id')} className="bg-white dark:bg-zinc-900" />
          </div>

          <div className="col-span-1 md:col-span-2 mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Opening stock will be recorded at the Purchase Cost specified in the Pricing step. Ensure the pricing is correct before saving.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}
