import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2, Palette, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BranchSettingsOverview, BranchBranding, BranchPosConfig } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function BrandingPosTab({ branchId, data, refetch }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  // Split into two forms for clarity, or one form. Let's do two forms.
  const brandingForm = useForm<Partial<BranchBranding>>({ defaultValues: data.branding || {} });
  const posForm = useForm<Partial<BranchPosConfig>>({ defaultValues: data.pos_config || {} });

  const onBrandingSubmit = async (values: Partial<BranchBranding>) => {
    try {
      setIsSaving(true);
      await branchConfigService.updateBranding(branchId, values);
      toast.success('Branding saved');
      brandingForm.reset(values);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error saving branding'); } finally { setIsSaving(false); }
  };

  const onPosSubmit = async (values: Partial<BranchPosConfig>) => {
    try {
      setIsSaving(true);
      await branchConfigService.updatePosConfig(branchId, values);
      toast.success('POS config saved');
      posForm.reset(values);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error saving POS config'); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-12">
      {/* ── BRANDING ── */}
      <section className="space-y-6">
        <form onSubmit={brandingForm.handleSubmit(onBrandingSubmit)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Palette className="w-6 h-6 text-primary" /> Branding & Theme</h2>
              <p className="text-muted-foreground mt-1">Configure logos, colors, and visuals.</p>
            </div>
            <Button type="submit" disabled={!brandingForm.formState.isDirty || isSaving} className="shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Branding
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Colors & Typography</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Theme Color</label>
                    <div className="flex gap-2">
                      <input type="color" {...brandingForm.register('theme_color')} className="w-10 h-10 p-1 rounded border" />
                      <input {...brandingForm.register('theme_color')} className={inputClass} placeholder="#000000" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Accent Color</label>
                    <div className="flex gap-2">
                      <input type="color" {...brandingForm.register('accent_color')} className="w-10 h-10 p-1 rounded border" />
                      <input {...brandingForm.register('accent_color')} className={inputClass} placeholder="#000000" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Font Family</label>
                  <select {...brandingForm.register('font_family')} className={inputClass}>
                    <option value="inter">Inter (Default)</option>
                    <option value="roboto">Roboto</option>
                    <option value="opensans">Open Sans</option>
                    <option value="poppins">Poppins</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Document Assets</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...brandingForm.register('show_watermark')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Show Watermark on Invoices</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...brandingForm.register('show_stamp')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Show Digital Stamp</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...brandingForm.register('show_signature')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Show Authorized Signature</span></label>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </section>

      {/* ── POS CONFIG ── */}
      <section className="space-y-6 pt-6 border-t border-border">
        <form onSubmit={posForm.handleSubmit(onPosSubmit)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><MonitorSmartphone className="w-6 h-6 text-primary" /> Point of Sale (POS)</h2>
              <p className="text-muted-foreground mt-1">Global settings for the POS checkout screen.</p>
            </div>
            <Button type="submit" disabled={!posForm.formState.isDirty || isSaving} className="shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save POS Config
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Hardware Integration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('barcode_scanner_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enable Barcode Scanner</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('cash_drawer_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enable Cash Drawer</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('customer_display_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enable Customer Display Pole</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('weighing_scale_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enable Weighing Scale</span></label>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle>Checkout Rules</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Max Discount (%)</label><input type="number" step="0.01" {...posForm.register('discount_limit_percent')} className={inputClass} /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Max Hold Sales</label><input type="number" {...posForm.register('max_hold_sales')} className={inputClass} /></div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('auto_print_receipt')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Auto-print receipt on complete</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('require_customer_on_sale')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Require customer selection</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...posForm.register('allow_hold_sale')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Allow holding sales</span></label>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </section>
    </div>
  );
}
