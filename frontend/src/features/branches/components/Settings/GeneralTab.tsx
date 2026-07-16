import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BranchSettingsOverview } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { parseApiError } from '@/utils/errorParser';

const generalSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  language: z.string().min(1, 'Language is required'),
  country_code: z.string().min(1, 'Country code is required'),
  barcode_format: z.string().optional(),
  barcode_prefix: z.string().optional(),
  barcode_auto_generate: z.boolean(),
  allow_negative_stock: z.boolean(),
  require_batch_on_sale: z.boolean(),
  auto_calc_expiry_warning_days: z.coerce.number().min(0),
  low_stock_threshold: z.coerce.number().min(0),
  receipt_header: z.string().optional(),
  receipt_footer: z.string().optional(),
  show_logo_on_receipt: z.boolean(),
  show_barcode_on_receipt: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof generalSchema>;

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function GeneralTab({ branchId, data, refetch }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  
  const config = data.configuration;
  
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(generalSchema) as any,
    defaultValues: {
      timezone: config?.timezone || 'UTC',
      currency: config?.currency || 'USD',
      language: config?.language || 'en',
      country_code: config?.country_code || 'US',
      barcode_format: config?.barcode_format || 'CODE128',
      barcode_prefix: config?.barcode_prefix || '',
      barcode_auto_generate: config?.barcode_auto_generate ?? true,
      allow_negative_stock: config?.allow_negative_stock ?? false,
      require_batch_on_sale: config?.require_batch_on_sale ?? true,
      auto_calc_expiry_warning_days: config?.auto_calc_expiry_warning_days || 90,
      low_stock_threshold: config?.low_stock_threshold || 10,
      receipt_header: config?.receipt_header || '',
      receipt_footer: config?.receipt_footer || '',
      show_logo_on_receipt: config?.show_logo_on_receipt ?? true,
      show_barcode_on_receipt: config?.show_barcode_on_receipt ?? true,
      notes: config?.notes || '',
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setIsSaving(true);
      await branchConfigService.updateConfiguration(branchId, values);
      toast.success('Configuration saved successfully');
      refetch();
    } catch (error: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">General Configuration</h2>
          <p className="text-muted-foreground mt-1">Core settings for localization, inventory rules, and receipts.</p>
        </div>
        <Button type="submit" disabled={!isDirty || isSaving} className="w-full sm:w-auto shrink-0">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localization & Basics */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Localization</CardTitle>
            <CardDescription>Regional settings for this branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Timezone</label>
                <input {...register('timezone')} className={inputClass} placeholder="e.g. Asia/Karachi" />
                {errors.timezone && <p className="text-xs text-red-500">{errors.timezone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <input {...register('currency')} className={inputClass} placeholder="e.g. PKR" />
                {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Language</label>
                <input {...register('language')} className={inputClass} placeholder="e.g. en" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Country Code</label>
                <input {...register('country_code')} className={inputClass} placeholder="e.g. PK" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Rules */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Inventory Rules</CardTitle>
            <CardDescription>Global behavior for stock and batching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expiry Warning (Days)</label>
                <input type="number" {...register('auto_calc_expiry_warning_days')} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Low Stock Threshold</label>
                <input type="number" {...register('low_stock_threshold')} className={inputClass} />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" {...register('allow_negative_stock')} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Allow negative stock (Overselling)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" {...register('require_batch_on_sale')} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Require batch/lot selection during sale</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Barcode Settings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Barcode Settings</CardTitle>
            <CardDescription>Rules for product barcodes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Barcode Format</label>
                <select {...register('barcode_format')} className={inputClass}>
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPCA">UPC-A</option>
                  <option value="QR">QR Code</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Barcode Prefix</label>
                <input {...register('barcode_prefix')} className={inputClass} placeholder="e.g. BR1" />
              </div>
            </div>
            <label className="flex items-center gap-3 pt-2">
              <input type="checkbox" {...register('barcode_auto_generate')} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm">Auto-generate barcode for new products</span>
            </label>
          </CardContent>
        </Card>

        {/* Receipt Defaults */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Receipt Layout</CardTitle>
            <CardDescription>Global header and footer for printouts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Receipt Header</label>
              <textarea {...register('receipt_header')} rows={2} className={inputClass} placeholder="Welcome to our pharmacy..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Receipt Footer</label>
              <textarea {...register('receipt_footer')} rows={2} className={inputClass} placeholder="Thank you for your visit!" />
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('show_logo_on_receipt')} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Show Logo</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('show_barcode_on_receipt')} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Show Barcode</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
