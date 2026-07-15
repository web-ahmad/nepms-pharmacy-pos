import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Edit, Percent, Building, CreditCard, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchTaxSetting, BranchFinancialAccount, BranchPaymentMethod } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { Badge } from '@/components/ui/badge';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function TaxesFinanceTab({ branchId, data, refetch }: Props) {
  const taxes = data.tax_settings || [];
  const accounts = data.financial_accounts || [];
  const paymentMethods = data.payment_methods || [];
  
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const taxForm = useForm<Partial<BranchTaxSetting>>();
  const accountForm = useForm<Partial<BranchFinancialAccount>>();
  const paymentForm = useForm<Partial<BranchPaymentMethod>>();

  // ── Taxes ──
  const openNewTax = () => {
    taxForm.reset({ tax_name: '', tax_type: 'gst', rate: 0, is_default: false, is_compound: false, is_inclusive: false, is_active: true });
    setEditingTaxId(null);
    setIsTaxOpen(true);
  };
  const onTaxSubmit = async (values: Partial<BranchTaxSetting>) => {
    try {
      setIsSaving(true);
      if (editingTaxId) {
        await branchConfigService.updateTaxSetting(branchId, editingTaxId, values);
      } else {
        await branchConfigService.createTaxSetting(branchId, values);
      }
      toast.success('Tax setting saved');
      setIsTaxOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error saving tax');
    } finally { setIsSaving(false); }
  };
  const deleteTax = async (id: string) => {
    if (!confirm('Delete tax?')) return;
    try { await branchConfigService.deleteTaxSetting(branchId, id); toast.success('Deleted'); refetch(); } catch (e: any) { toast.error('Error deleting'); }
  };

  // ── Accounts ──
  const openNewAccount = () => {
    accountForm.reset({ account_name: '', account_type: 'cash', opening_balance: 0, is_active: true, is_default: false });
    setEditingAccountId(null);
    setIsAccountOpen(true);
  };
  const onAccountSubmit = async (values: Partial<BranchFinancialAccount>) => {
    try {
      setIsSaving(true);
      if (editingAccountId) await branchConfigService.updateFinancialAccount(branchId, editingAccountId, values);
      else await branchConfigService.createFinancialAccount(branchId, values);
      toast.success('Account saved');
      setIsAccountOpen(false);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error saving'); } finally { setIsSaving(false); }
  };
  const deleteAccount = async (id: string) => {
    if (!confirm('Delete account?')) return;
    try { await branchConfigService.deleteFinancialAccount(branchId, id); toast.success('Deleted'); refetch(); } catch (e: any) { toast.error('Error deleting'); }
  };

  // ── Payment Methods ──
  const openNewPayment = () => {
    paymentForm.reset({ method_type: 'cash', display_name: '', sort_order: 0, is_enabled: true, is_default: false, requires_reference: false });
    setEditingPaymentId(null);
    setIsPaymentOpen(true);
  };
  const onPaymentSubmit = async (values: Partial<BranchPaymentMethod>) => {
    try {
      setIsSaving(true);
      if (editingPaymentId) await branchConfigService.updatePaymentMethod(branchId, editingPaymentId, values);
      else await branchConfigService.createPaymentMethod(branchId, values);
      toast.success('Method saved');
      setIsPaymentOpen(false);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error saving'); } finally { setIsSaving(false); }
  };
  const deletePayment = async (id: string) => {
    if (!confirm('Delete method?')) return;
    try { await branchConfigService.deletePaymentMethod(branchId, id); toast.success('Deleted'); refetch(); } catch (e: any) { toast.error('Error deleting'); }
  };

  return (
    <div className="space-y-12">
      {/* ── TAXES ── */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><Percent className="w-5 h-5 text-primary" /> Tax Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure VAT, GST, and regional taxes.</p>
          </div>
          <Dialog open={isTaxOpen} onOpenChange={setIsTaxOpen}>
            <DialogTrigger><Button onClick={openNewTax} size="sm" type="button"><Plus className="w-4 h-4 mr-2" />Add Tax</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingTaxId ? 'Edit Tax' : 'Add Tax'}</DialogTitle></DialogHeader>
              <form onSubmit={taxForm.handleSubmit(onTaxSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Tax Name</label><input {...taxForm.register('tax_name', { required: true })} className={inputClass} placeholder="e.g. Standard GST" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Rate (%)</label><input type="number" step="0.01" {...taxForm.register('rate', { required: true })} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tax Type</label>
                    <select {...taxForm.register('tax_type')} className={inputClass}><option value="gst">GST</option><option value="vat">VAT</option><option value="sales">Sales Tax</option><option value="other">Other</option></select>
                  </div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Account Code</label><input {...taxForm.register('tax_account_code')} className={inputClass} /></div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...taxForm.register('is_inclusive')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Price includes tax</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...taxForm.register('is_default')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Default for new products</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...taxForm.register('is_active')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Active</span></label>
                </div>
                <DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={() => setIsTaxOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {taxes.map(t => (
            <Card key={t.id} className="shadow-sm">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base">{t.tax_name} <Badge variant="secondary" className="ml-1">{t.rate}%</Badge></h3>
                  <div className="text-xs text-muted-foreground mt-1 space-x-2">
                    <span className="uppercase">{t.tax_type}</span>
                    {t.is_inclusive && <span>• Inclusive</span>}
                    {t.is_default && <span className="text-primary font-medium">• Default</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { taxForm.reset(t); setEditingTaxId(t.id); setIsTaxOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="hover:text-red-500" onClick={() => deleteTax(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {taxes.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-6 border border-dashed rounded-lg">No taxes configured.</div>}
        </div>
      </section>

      {/* ── ACCOUNTS ── */}
      <section className="space-y-6 pt-6 border-t">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><Building className="w-5 h-5 text-primary" /> Financial Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage cash drawers, bank accounts, and wallets.</p>
          </div>
          <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <DialogTrigger><Button onClick={openNewAccount} size="sm" type="button"><Plus className="w-4 h-4 mr-2" />Add Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingAccountId ? 'Edit Account' : 'Add Account'}</DialogTitle></DialogHeader>
              <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Account Name</label><input {...accountForm.register('account_name', { required: true })} className={inputClass} placeholder="e.g. Main Cash Drawer" /></div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Account Type</label>
                    <select {...accountForm.register('account_type')} className={inputClass}><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_wallet">Mobile Wallet</option><option value="card_machine">Card Machine</option></select>
                  </div>
                </div>
                {accountForm.watch('account_type') === 'bank' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-sm font-medium">Bank Name</label><input {...accountForm.register('bank_name')} className={inputClass} /></div>
                    <div className="space-y-1.5"><label className="text-sm font-medium">Account Number</label><input {...accountForm.register('account_number')} className={inputClass} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Opening Balance</label><input type="number" {...accountForm.register('opening_balance')} className={inputClass} /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Ledger Code</label><input {...accountForm.register('ledger_account_code')} className={inputClass} /></div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...accountForm.register('is_active')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Active</span></label>
                </div>
                <DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={() => setIsAccountOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(a => (
            <Card key={a.id} className={`shadow-sm ${a.is_default ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{a.account_name}</h3>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="uppercase text-[10px]">{a.account_type}</Badge>
                      {a.is_default && <span className="text-primary font-medium flex items-center"><Star className="w-3 h-3 mr-0.5"/> Default</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!a.is_default && <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => branchConfigService.setFinancialAccountDefault(branchId, a.id).then(refetch)}><Star className="w-3.5 h-3.5" /></Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { accountForm.reset(a); setEditingAccountId(a.id); setIsAccountOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={() => deleteAccount(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {a.bank_name && <div className="mt-3 text-xs text-muted-foreground font-mono">{a.bank_name} - {a.account_number}</div>}
              </CardContent>
            </Card>
          ))}
          {accounts.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-6 border border-dashed rounded-lg">No accounts configured.</div>}
        </div>
      </section>

      {/* ── PAYMENT METHODS ── */}
      <section className="space-y-6 pt-6 border-t">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Payment Methods</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure available checkout options mapping to accounts.</p>
          </div>
          <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogTrigger><Button onClick={openNewPayment} size="sm" type="button"><Plus className="w-4 h-4 mr-2" />Add Method</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPaymentId ? 'Edit Method' : 'Add Method'}</DialogTitle></DialogHeader>
              <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <select {...paymentForm.register('method_type')} className={inputClass}>
                      <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="wallet">Wallet</option><option value="cheque">Cheque</option><option value="credit">Store Credit</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Display Name</label><input {...paymentForm.register('display_name', { required: true })} className={inputClass} placeholder="e.g. Visa/MasterCard" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Link to Account</label>
                    <select {...paymentForm.register('account_id')} className={inputClass}>
                      <option value="">-- Optional --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Sort Order</label><input type="number" {...paymentForm.register('sort_order')} className={inputClass} /></div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...paymentForm.register('requires_reference')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Require reference number (e.g. Trace ID)</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...paymentForm.register('is_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enabled</span></label>
                </div>
                <DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {paymentMethods.sort((a,b)=>a.sort_order-b.sort_order).map(pm => (
            <Card key={pm.id} className="shadow-sm">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base">{pm.display_name}</h3>
                  <div className="text-xs text-muted-foreground mt-1 space-x-2">
                    <span className="uppercase">{pm.method_type}</span>
                    {!pm.is_enabled && <span className="text-red-500 font-medium">• Disabled</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { paymentForm.reset(pm); setEditingPaymentId(pm.id); setIsPaymentOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="hover:text-red-500" onClick={() => deletePayment(pm.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {paymentMethods.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-6 border border-dashed rounded-lg">No payment methods configured.</div>}
        </div>
      </section>
    </div>
  );
}
