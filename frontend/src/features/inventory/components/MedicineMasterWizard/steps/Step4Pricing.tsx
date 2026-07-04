import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calculator, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Step4Pricing() {
  const { register, control, setValue } = useFormContext<MedicineFormValues>();
  
  const purchasePrice = useWatch({ control, name: 'purchase_price', defaultValue: 0 }) as number;
  const marginPercent = useWatch({ control, name: 'margin_percent', defaultValue: 0 }) as number;
  const salePrice = useWatch({ control, name: 'sale_price', defaultValue: 0 }) as number;
  const mrp = useWatch({ control, name: 'mrp', defaultValue: 0 }) as number;
  
  // Real-time calculations: Margin updates Sale Price
  useEffect(() => {
    if (purchasePrice > 0 && marginPercent >= 0) {
      const calculatedSalePrice = purchasePrice * (1 + (marginPercent / 100));
      if (Math.abs(calculatedSalePrice - salePrice) > 0.01) {
        setValue('sale_price', parseFloat(calculatedSalePrice.toFixed(2)), { shouldValidate: true });
        // Also update MRP if it's currently lower than the new sale price
        if (mrp < calculatedSalePrice) {
           setValue('mrp', parseFloat(calculatedSalePrice.toFixed(2)), { shouldValidate: true });
        }
      }
    }
  }, [purchasePrice, marginPercent, setValue]); // intentionally omit salePrice and mrp

  const profitAmount = Math.max(0, salePrice - purchasePrice);
  const profitMarginPercent = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-500" />
          Pricing Engine
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Define purchase costs and margins. Sale prices will calculate automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Cost & Margins</h3>
            
            <div className="space-y-2">
              <Label>Purchase Price (Cost) *</Label>
              <Input type="number" step="0.01" {...register('purchase_price', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Discount %</Label>
                <Input type="number" step="0.01" {...register('purchase_discount_percent', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Extra Charges</Label>
                <Input type="number" step="0.01" {...register('extra_charges', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Retail Margin %</Label>
              <Input type="number" step="0.01" {...register('margin_percent', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
            
            <div className="space-y-2">
              <Label>Wholesale Margin %</Label>
              <Input type="number" step="0.01" {...register('wholesale_margin_percent', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-4 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Calculated Retail Price</h3>
            
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label>Sale Price *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...register('sale_price', { valueAsNumber: true })} 
                  className="text-lg font-bold bg-white dark:bg-zinc-900 border-indigo-300" 
                  onChange={(e) => {
                    const newSalePrice = parseFloat(e.target.value);
                    if (purchasePrice > 0 && newSalePrice > purchasePrice) {
                      const newMargin = ((newSalePrice - purchasePrice) / purchasePrice) * 100;
                      setValue('margin_percent', parseFloat(newMargin.toFixed(2)), { shouldValidate: true });
                    }
                  }}
                />
                <p className="text-xs text-zinc-500 mt-1">Changing Sale Price updates the Margin %.</p>
              </div>

              <div className="space-y-2">
                <Label>MRP (Maximum Retail Price) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...register('mrp', { valueAsNumber: true })} 
                  className="bg-white dark:bg-zinc-900" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
              <div>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium uppercase tracking-wider mb-1">Profit per unit</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  ${profitAmount.toFixed(2)} <span className="text-sm font-normal">({profitMarginPercent.toFixed(1)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium uppercase tracking-wider mb-1">Net Landing Cost</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                  ${purchasePrice.toFixed(2)}
                </p>
              </div>
            </div>

            {salePrice > 0 && purchasePrice >= salePrice && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Purchase price is higher than or equal to Sale Price. You are operating at a loss.
                </AlertDescription>
              </Alert>
            )}
            {mrp > 0 && salePrice > mrp && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Sale price cannot exceed MRP.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
