'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateQuotation, usePurchaseRequests, useSuppliers } from '../services/purchase.api';
import { MedicineSearchDropdown } from './MedicineSearchDropdown';
import { Medicine } from '@/features/inventory/types/inventory';
import {
  Plus, Trash2, ArrowLeft, Save, Send, Building2,
  Calendar, CreditCard, Truck, ShieldCheck, FileText,
  Calculator, DollarSign, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { CreatePurchaseQuotationPayload, PurchaseQuotationItem } from '../types/purchase';

// --- Types ---
interface QuotationRow {
  id: string;
  medicine: Medicine | null;
  quoted_quantity: number;
  unit: string;
  quoted_unit_price: number;
  discount_percent: number;
  tax_percent: number;
  lead_time_days: number;
  moq: number;
  brand: string;
  manufacturer: string;
  batch_number: string;
  expiry_date: string;
}

function makeRow(): QuotationRow {
  return {
    id: crypto.randomUUID(),
    medicine: null,
    quoted_quantity: 1,
    unit: 'pcs',
    quoted_unit_price: 0,
    discount_percent: 0,
    tax_percent: 0,
    lead_time_days: 1,
    moq: 1,
    brand: '',
    manufacturer: '',
    batch_number: '',
    expiry_date: '',
  };
}

export default function PurchaseQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRequestId = searchParams.get('request_id') || '';

  const { data: requests } = usePurchaseRequests();
  const { data: suppliers } = useSuppliers();
  const createQuotation = useCreateQuotation();

  const [supplierId, setSupplierId] = useState('');
  const [requestId, setRequestId] = useState(defaultRequestId);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [currency, setCurrency] = useState('PKR');
  
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [warranty, setWarranty] = useState('');
  const [remarks, setRemarks] = useState('');

  const [rows, setRows] = useState<QuotationRow[]>([makeRow()]);

  // Calculate totals
  const totals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    rows.forEach(r => {
      const rowSub = r.quoted_quantity * r.quoted_unit_price;
      const rowDisc = rowSub * (r.discount_percent / 100);
      const rowTax = (rowSub - rowDisc) * (r.tax_percent / 100);
      sub += rowSub;
      disc += rowDisc;
      tax += rowTax;
    });
    return { subtotal: sub, discount: disc, tax: tax, total: sub - disc + tax };
  }, [rows]);

  const addRow = () => setRows([...rows, makeRow()]);
  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };
  const updateRow = (id: string, field: keyof QuotationRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    if (!supplierId) return toast.error('Supplier is required');
    if (rows.length === 0) return toast.error('At least one item is required');
    const invalidRows = rows.filter(r => !r.medicine || r.quoted_quantity <= 0 || r.quoted_unit_price < 0);
    if (invalidRows.length > 0) return toast.error('Please ensure all items have a medicine, valid quantity and price');

    const items: PurchaseQuotationItem[] = rows.map(r => ({
      medicine_id: r.medicine!.id,
      quoted_quantity: r.quoted_quantity,
      unit: r.unit,
      quoted_unit_price: r.quoted_unit_price,
      discount_percent: r.discount_percent,
      tax_percent: r.tax_percent,
      lead_time_days: r.lead_time_days,
      moq: r.moq,
      brand: r.brand || undefined,
      manufacturer: r.manufacturer || undefined,
      batch_number: r.batch_number || undefined,
      expiry_date: r.expiry_date || undefined
    } as PurchaseQuotationItem));

    const payload: CreatePurchaseQuotationPayload = {
      supplier_id: supplierId,
      request_id: requestId || undefined,
      quotation_date: quotationDate || undefined,
      valid_until: validUntil || undefined,
      currency,
      status: isDraft ? 'Draft' : 'Received',
      payment_terms: paymentTerms || undefined,
      delivery_terms: deliveryTerms || undefined,
      warranty: warranty || undefined,
      remarks: remarks || undefined,
      items
    };

    try {
      const res = await createQuotation.mutateAsync(payload);
      toast.success(isDraft ? 'Quotation saved as draft' : 'Quotation created successfully');
      router.push(`/purchase/quotations/${res.id}`);
    } catch (error: any) {
      toast.error(parseApiError(error));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-blue-500" />
              New Supplier Quotation
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Record a new price quote from a supplier</p>
          </div>
        </div>
      </div>

      <form className="space-y-6">
        
        {/* Config Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" /> General Details
            </h3>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Supplier *</label>
                <select 
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Select Supplier...</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Link to Request (Optional)</label>
                <select 
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={requestId}
                  onChange={e => setRequestId(e.target.value)}
                >
                  <option value="">No linked request</option>
                  {requests?.map(r => <option key={r.id} value={r.id}>{r.request_number}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Quotation Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none" 
                  value={quotationDate} onChange={e => setQuotationDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Valid Until</label>
                <input type="date" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none" 
                  value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={16} className="text-purple-500" /> Terms & Conditions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Currency</label>
                <select className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="PKR">PKR (Pakistani Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Terms</label>
                <input type="text" placeholder="e.g. Net 30, Cash on Delivery" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none" 
                  value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivery Terms</label>
                <input type="text" placeholder="e.g. FOB, CIF" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none" 
                  value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calculator size={16} className="text-emerald-500" /> Quoted Items
            </h3>
            <button type="button" onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs hover:bg-blue-100 transition-colors">
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="p-3 w-64 border-b border-slate-200">Medicine *</th>
                  <th className="p-3 w-24 border-b border-slate-200">Qty *</th>
                  <th className="p-3 w-20 border-b border-slate-200">Unit</th>
                  <th className="p-3 w-28 border-b border-slate-200">Price *</th>
                  <th className="p-3 w-20 border-b border-slate-200">Disc %</th>
                  <th className="p-3 w-20 border-b border-slate-200">Tax %</th>
                  <th className="p-3 w-24 border-b border-slate-200">Lead Time</th>
                  <th className="p-3 w-24 border-b border-slate-200">Brand</th>
                  <th className="p-3 w-12 border-b border-slate-200 text-center"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence initial={false}>
                  {rows.map((row) => (
                    <motion.tr 
                      key={row.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border-b border-slate-100 group hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-2">
                        <MedicineSearchDropdown 
                          value={row.medicine} 
                          onChange={(med) => {
                            updateRow(row.id, 'medicine', med);
                            if (med) {
                              updateRow(row.id, 'unit', med.base_unit || 'pcs');
                              // Pre-fill price if needed, though for a quote it's from supplier
                            }
                          }} 
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" min="1" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
                          value={row.quoted_quantity || ''} onChange={e => updateRow(row.id, 'quoted_quantity', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="p-2">
                        <input type="text" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm outline-none"
                          value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <input type="number" min="0" step="0.01" className="w-full h-9 pl-6 pr-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 font-medium text-slate-900"
                            value={row.quoted_unit_price || ''} onChange={e => updateRow(row.id, 'quoted_unit_price', parseFloat(e.target.value) || 0)} />
                        </div>
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" max="100" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm outline-none"
                          value={row.discount_percent || ''} onChange={e => updateRow(row.id, 'discount_percent', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" max="100" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm outline-none"
                          value={row.tax_percent || ''} onChange={e => updateRow(row.id, 'tax_percent', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <input type="number" min="1" className="w-full h-9 px-2 pr-8 rounded-lg border border-slate-200 text-sm outline-none"
                            value={row.lead_time_days || ''} onChange={e => updateRow(row.id, 'lead_time_days', parseInt(e.target.value) || 1)} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">d</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <input type="text" placeholder="Brand..." className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm outline-none placeholder:text-slate-300"
                          value={row.brand} onChange={e => updateRow(row.id, 'brand', e.target.value)} />
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1 max-w-lg">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks / Internal Notes</label>
              <textarea 
                className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 resize-none"
                placeholder="Add any internal notes regarding this quotation..."
                value={remarks} onChange={e => setRemarks(e.target.value)}
              />
            </div>
            
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-600">
                <span>Discount</span>
                <span className="font-medium">- {totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span className="font-medium">+ {totals.tax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex justify-between text-lg font-black text-slate-900">
                <span>Total</span>
                <span>{currency} {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] lg:pl-64 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, true)}
            disabled={createQuotation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Save size={16} /> Save as Draft
          </button>
          
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, false)}
            disabled={createQuotation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {createQuotation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
            Submit Quotation
          </button>
        </div>

      </form>
    </div>
  );
}
