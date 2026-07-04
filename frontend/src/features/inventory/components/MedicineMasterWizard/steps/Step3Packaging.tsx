import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Package } from 'lucide-react';

export default function Step3Packaging() {
  const { register, control, watch } = useFormContext<MedicineFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'packaging_levels'
  });

  const baseUnit = watch('base_unit');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-500" />
          Packaging & Units
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure how this medicine is purchased and sold. Base unit is <strong className="text-indigo-600 dark:text-indigo-400">{baseUnit}</strong>.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200 dark:border-zinc-800 relative">
            {index > 0 && (
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Level Name</Label>
                <Input {...register(`packaging_levels.${index}.level_name`)} placeholder="e.g. Strip" className="bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Qty of Base Units</Label>
                <Input type="number" step="0.01" {...register(`packaging_levels.${index}.conversion_qty`, { valueAsNumber: true })} placeholder="10" className="bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Barcode (Primary)</Label>
                <Input {...register(`packaging_levels.${index}.barcode`)} placeholder="Scan Barcode" className="bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Secondary Barcode</Label>
                <Input {...register(`packaging_levels.${index}.secondary_barcode`)} placeholder="Secondary" className="bg-white dark:bg-zinc-900" />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Switch id={`sale_${index}`} {...register(`packaging_levels.${index}.is_sale_unit`)} defaultChecked={field.is_sale_unit} />
                <Label htmlFor={`sale_${index}`}>Can Sell</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`purchase_${index}`} {...register(`packaging_levels.${index}.is_purchase_unit`)} defaultChecked={field.is_purchase_unit} />
                <Label htmlFor={`purchase_${index}`}>Can Purchase</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`pos_${index}`} {...register(`packaging_levels.${index}.is_default_pos_unit`)} defaultChecked={field.is_default_pos_unit} />
                <Label htmlFor={`pos_${index}`}>Default POS Unit</Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
        onClick={() => append({
          level_name: '',
          conversion_qty: 1,
          is_purchase_unit: false,
          is_sale_unit: true,
          is_smallest_unit: false,
          is_default_pos_unit: false,
          sale_price: 0
        })}
      >
        <Plus className="w-4 h-4 mr-2" /> Add Packaging Level
      </Button>
    </div>
  );
}
