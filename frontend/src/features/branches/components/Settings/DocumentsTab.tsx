import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, FileText, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchDocumentSeries } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { Badge } from '@/components/ui/badge';
import { parseApiError } from '@/utils/errorParser';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function DocumentsTab({ branchId, data, refetch }: Props) {
  const series = data.document_series || [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<Partial<BranchDocumentSeries>>();
  
  const docType = watch('document_type');
  const isEditMode = series.some(s => s.document_type === docType); // Overwrite existing

  const openNew = () => {
    reset({ document_type: 'sale_invoice', prefix: '', suffix: '', padding: 5, reset_policy: 'never', next_number: 1, is_active: true });
    setIsOpen(true);
  };

  const openEdit = (s: BranchDocumentSeries) => {
    reset(s);
    setIsOpen(true);
  };

  const onSubmit = async (values: Partial<BranchDocumentSeries>) => {
    if (!values.document_type) return;
    try {
      setIsSaving(true);
      await branchConfigService.upsertDocumentSeries(branchId, values as any);
      toast.success('Document series saved');
      setIsOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const resetSequence = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to reset the sequence for ${type}? This will restart counting from 1.`)) return;
    try {
      await branchConfigService.resetDocumentSeries(branchId, id);
      toast.success('Sequence reset successfully');
      refetch();
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Document Series</h2>
          <p className="text-muted-foreground mt-1">Configure auto-incrementing numbers for invoices, receipts, and POs.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button onClick={openNew} type="button">
              <Plus className="w-4 h-4 mr-2" />
              Configure Series
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Series' : 'Configure Series'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Document Type</label>
                <select {...register('document_type', { required: true })} className={inputClass} disabled={isEditMode}>
                  <option value="sale_invoice">Sale Invoice</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="transfer_order">Transfer Order</option>
                  <option value="return_receipt">Return Receipt</option>
                  <option value="expense_voucher">Expense Voucher</option>
                </select>
                {isEditMode && <p className="text-xs text-amber-600">Editing existing configuration for this type.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Prefix</label>
                  <input {...register('prefix')} className={inputClass} placeholder="e.g. INV-" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Suffix</label>
                  <input {...register('suffix')} className={inputClass} placeholder="e.g. -2026" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Zero Padding</label>
                  <input type="number" {...register('padding')} className={inputClass} placeholder="e.g. 5 (00001)" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reset Policy</label>
                  <select {...register('reset_policy')} className={inputClass}>
                    <option value="never">Never</option>
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
              {!isEditMode && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Starting Number</label>
                  <input type="number" {...register('next_number')} className={inputClass} />
                </div>
              )}
              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" {...register('is_active')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                <span className="text-sm font-medium">Active</span>
              </label>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {series.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No document series configured. System defaults will be used.</p>
          </div>
        ) : (
          series.map((s) => (
            <Card key={s.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2 capitalize">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {s.document_type.replace('_', ' ')}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {!s.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                      {s.reset_policy !== 'never' && <Badge variant="secondary" className="text-[10px] capitalize">Reset: {s.reset_policy}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-amber-600" onClick={() => resetSequence(s.id, s.document_type)} title="Reset Sequence to 1">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-1">Preview</span>
                  <span className="font-mono text-lg font-semibold tracking-wider">
                    {s.preview_number}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex justify-between">
                  <span>Next ID: {s.next_number}</span>
                  <span>Padding: {s.padding}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
