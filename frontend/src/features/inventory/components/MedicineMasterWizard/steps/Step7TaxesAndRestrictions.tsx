import React from 'react';
import { useFormContext } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Scale, ShieldAlert, ThermometerSnowflake } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Step7TaxesAndRestrictions() {
  const { register, setValue, watch } = useFormContext<MedicineFormValues>();
  
  const taxInclusive = watch('tax_inclusive');
  const rxRequired = watch('rx_required');
  const isControlled = watch('is_controlled');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-500" />
          Taxes, Restrictions & Storage
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure legal compliance, taxation, and specific handling requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Taxes */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            Tax Information
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="space-y-2">
              <Label>Tax Type</Label>
              <Select onValueChange={(val: any) => setValue('tax_type', val)} value={watch('tax_type') || ""}>
                <SelectTrigger className="bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="Select Tax Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="VAT">VAT</SelectItem>
                  <SelectItem value="Exempt">Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" step="0.1" {...register('tax_rate', { valueAsNumber: true })} className="bg-white dark:bg-zinc-900" />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch id="tax_inc" checked={taxInclusive} onCheckedChange={(c) => setValue('tax_inclusive', c)} />
              <Label htmlFor="tax_inc">Sale Price is Tax Inclusive</Label>
            </div>

            <div className="space-y-2 pt-2">
              <Label>HS Code</Label>
              <Input {...register('hs_code')} placeholder="For export/import" className="bg-white dark:bg-zinc-900" />
            </div>
          </div>
        </div>

        {/* Legal & Restrictions */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            Legal & Sales Restrictions
          </h3>
          <div className="p-4 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30 space-y-4">
            
            <div className="flex items-center justify-between">
              <Label htmlFor="rx" className="cursor-pointer">Prescription Required (Rx)</Label>
              <Switch id="rx" checked={rxRequired} onCheckedChange={(c) => setValue('rx_required', c)} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="controlled" className="cursor-pointer flex items-center gap-2">
                Controlled Substance
                {isControlled && <Badge variant="destructive" className="text-[10px] h-4 px-1">Strict</Badge>}
              </Label>
              <Switch id="controlled" checked={isControlled} onCheckedChange={(c) => setValue('is_controlled', c)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="narcotic" className="cursor-pointer">Narcotic</Label>
              <Switch id="narcotic" {...register('narcotic')} defaultChecked={false} onCheckedChange={(c) => setValue('narcotic', c)} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="otc" className="cursor-pointer">OTC (Over The Counter)</Label>
              <Switch id="otc" {...register('is_otc')} defaultChecked={false} onCheckedChange={(c) => setValue('is_otc', c)} />
            </div>

            <div className="space-y-2 pt-2 border-t border-red-100 dark:border-red-900/30">
              <Label>Minimum Age Restriction</Label>
              <Input type="number" {...register('age_restriction', { valueAsNumber: true })} placeholder="e.g. 18" className="bg-white dark:bg-zinc-900" />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ThermometerSnowflake className="w-4 h-4 text-slate-400" />
            Storage & Handling
          </h3>
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
            
            <div className="flex items-center justify-between">
              <Label htmlFor="cold" className="cursor-pointer">Cold Chain Required</Label>
              <Switch id="cold" {...register('cold_chain')} defaultChecked={false} onCheckedChange={(c) => setValue('cold_chain', c)} />
            </div>

            <div className="space-y-2">
              <Label>Temperature Condition</Label>
              <Select onValueChange={(val: any) => setValue('temp_condition', val)} value={watch('temp_condition') || ""}>
                <SelectTrigger className="bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="Select Temp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Room">Room Temp (15-25°C)</SelectItem>
                  <SelectItem value="Fridge">Refrigerated (2-8°C)</SelectItem>
                  <SelectItem value="Freezer">Frozen (-20°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="light" className="cursor-pointer">Protect from Light</Label>
              <Switch id="light" {...register('protect_from_light')} defaultChecked={false} onCheckedChange={(c) => setValue('protect_from_light', c)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dry" className="cursor-pointer">Keep Dry</Label>
              <Switch id="dry" {...register('keep_dry')} defaultChecked={false} onCheckedChange={(c) => setValue('keep_dry', c)} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="hazard" className="cursor-pointer text-amber-600 dark:text-amber-500">Hazardous Material</Label>
              <Switch id="hazard" {...register('hazardous')} defaultChecked={false} onCheckedChange={(c) => setValue('hazardous', c)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
