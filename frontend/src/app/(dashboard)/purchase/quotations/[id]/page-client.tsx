'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  usePurchaseQuotationDetails, 
  useUpdateQuotationStatus, 
  useConvertQuotationToPO 
} from '@/features/purchase/services/purchase.api';
import {
  ArrowLeft, FileText, Calendar, Building2, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { format, isPast, parseISO } from 'date-fns';

export default function PurchaseQuotationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: quote, isLoading } = usePurchaseQuotationDetails(id);
  const updateStatus = useUpdateQuotationStatus(id);
  const convertToPO = useConvertQuotationToPO();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading quotation details...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Quotation not found</p>
        <button onClick={() => router.back()} className="text-xs text-blue-600 hover:underline">← Go back</button>
      </div>
    );
  }

  const isExpired = quote.valid_until && isPast(parseISO(quote.valid_until)) && quote.status !== 'Selected';

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ status: newStatus });
      toast.success(`Quotation marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(parseApiError(e));
    }
  };

  const handleConvertToPO = async () => {
    try {
      const po = await convertToPO.mutateAsync(id);
      toast.success('Converted to Purchase Order successfully');
      router.push(`/purchase/orders/${po.id}`);
    } catch (e: any) {
      toast.error(parseApiError(e));
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Received': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Compared': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Selected': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'Expired': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer" onClick={() => router.push('/purchase/quotations')}>
            Quotations
          </span>
          <ChevronRight size={12} />
          <span className="font-semibold text-slate-700 font-mono">{quote.quotation_number}</span>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                    {quote.quotation_number}
                  </h1>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isExpired && quote.status === 'Received' ? 'bg-red-50 text-red-600 border-red-100' :
                    quote.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                    quote.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {isExpired && quote.status === 'Received' ? 'Expired' : quote.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Building2 size={12} /> {quote.supplier_name}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {quote.quotation_date ? format(new Date(quote.quotation_date), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(quote.status === 'Received' || quote.status === 'Compared') && (
                <>
                  <button 
                    onClick={() => handleStatusChange('Rejected')}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-semibold text-xs border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button 
                    onClick={handleConvertToPO}
                    disabled={convertToPO.isPending}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <ShoppingCart size={14} /> Select & PO
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Linked Request</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{quote.request_number || 'None'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5">{quote.currency} {quote.total_amount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Valid Until</p>
              <p className="text-sm font-semibold mt-0.5">
                {quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Supplier Rating</p>
              <p className="text-sm font-semibold text-amber-600 mt-0.5">
                {quote.supplier_score != null ? `${quote.supplier_score.toFixed(1)} / 100` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quoted Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Disc %</th>
                <th className="px-4 py-3 text-right">Tax %</th>
                <th className="px-4 py-3 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {quote.items.map((item) => {
                const sub = item.quantity * item.unit_price;
                const disc = sub * ((item.discount_percentage || 0) / 100);
                const tax = (sub - disc) * ((item.tax_percentage || 0) / 100);
                const total = sub - disc + tax;
                
                return (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.medicine_name}
                      {item.brand && <span className="text-[10px] font-normal text-slate-500 ml-2 block">Brand: {item.brand}</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {quote.currency} {item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {item.discount_percentage || 0}%
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {item.tax_percentage || 0}%
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">
                      {quote.currency} {total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
