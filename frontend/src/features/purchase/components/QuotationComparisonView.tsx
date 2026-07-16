// @ts-nocheck
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  useQuotationComparison, 
  useConvertQuotationToPO, 
  useUpdateQuotationStatus 
} from '../services/purchase.api';
import { 
  Trophy, TrendingDown, Clock, Star, AlertCircle, 
  CheckCircle2, ArrowRight, Loader2, Building2, Package, XCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { PurchaseQuotation } from '../types/purchase';

interface QuotationComparisonViewProps {
  requestId: string;
}

export function QuotationComparisonView({ requestId }: QuotationComparisonViewProps) {
  const router = useRouter();
  const { data: comparison, isLoading, isError, refetch } = useQuotationComparison(requestId);
  const convertToPO = useConvertQuotationToPO();
  const updateStatus = useUpdateQuotationStatus(''); // dummy id, we'll call manually

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Analyzing and comparing quotations...</p>
      </div>
    );
  }

  if (isError || !comparison) {
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl border border-red-100 p-8 text-center font-medium flex flex-col items-center gap-2">
        <AlertCircle size={24} />
        Failed to load quotation comparison. Ensure quotations exist for this request.
      </div>
    );
  }

  const handleSelectQuotation = async (quotationId: string) => {
    if (!confirm('Are you sure you want to select this quotation? Other quotations will be marked as rejected.')) return;
    
    try {
      const po = await convertToPO.mutateAsync(quotationId);
      toast.success('Quotation selected and Purchase Order created successfully!');
      router.push(`/purchase/orders/${po.id}`);
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  const { quotations } = comparison;

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
        No quotations received for this request yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Highlights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HighlightCard 
          icon={Trophy} 
          title="Best Overall Value" 
          supplierName={quotations.find(q => q.quotation_id === comparison.best_overall_quotation_id)?.supplier_name} 
          color="amber" 
        />
        <HighlightCard 
          icon={TrendingDown} 
          title="Lowest Total Cost" 
          supplierName={quotations.find(q => q.quotation_id === comparison.lowest_price_quotation_id)?.supplier_name} 
          color="emerald" 
        />
        <HighlightCard 
          icon={Clock} 
          title="Fastest Delivery" 
          supplierName={quotations.find(q => q.quotation_id === comparison.fastest_delivery_quotation_id)?.supplier_name} 
          color="blue" 
        />
        <HighlightCard 
          icon={Star} 
          title="Highest Rated Supplier" 
          supplierName={quotations.find(q => q.supplier_id === comparison.highest_rated_supplier_id)?.supplier_name} 
          color="purple" 
        />
      </div>

      {/* Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-4 bg-slate-50 border-b border-slate-200 border-r min-w-[200px] align-bottom">
                <div className="text-sm font-bold text-slate-700">Evaluation Criteria</div>
                <div className="text-xs text-slate-400 font-normal mt-1">Quotations side-by-side</div>
              </th>
              {quotations.map((q) => (
                <th key={q.quotation_id} className="p-4 bg-white border-b border-slate-200 min-w-[280px]">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-blue-500" />
                          <span className="font-bold text-slate-900 text-lg">{q.supplier_name}</span>
                        </div>
                        {q.quotation_id === comparison.best_overall_quotation_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                            <Trophy size={10} /> Best
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">{q.quotation_number}</div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSelectQuotation(q.quotation_id)}
                        disabled={convertToPO.isPending || q.status === 'Selected' || q.status === 'Rejected'}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {q.status === 'Selected' ? <><CheckCircle2 size={14}/> Selected</> : <><FileText size={14} /> Select & PO</>}
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            
            {/* Total Cost */}
            <ComparisonRow 
              title="Total Cost" 
              quotations={quotations}
              highlightId={comparison.lowest_price_quotation_id}
              renderValue={(q) => (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-900">{q.currency} {q.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              )}
            />

            {/* Delivery Time */}
            <ComparisonRow 
              title="Avg. Lead Time" 
              quotations={quotations}
              highlightId={comparison.fastest_delivery_quotation_id}
              renderValue={(q) => (
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Clock size={14} className="text-blue-500" />
                  {q.lead_time_days} days
                </div>
              )}
            />

            {/* Supplier Score */}
            <ComparisonRow 
              title="Supplier Rating" 
              quotations={quotations}
              highlightId={quotations.find(q => q.supplier_id === comparison.highest_rated_supplier_id)?.quotation_id}
              renderValue={(q) => (
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Star size={14} className={q.supplier_score.total_score >= 80 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                  {q.supplier_score.total_score.toFixed(1)} / 100
                </div>
              )}
            />

            {/* Warranty & Terms */}
            <ComparisonRow 
              title="Terms & Conditions" 
              quotations={quotations}
              renderValue={(q) => (
                <div className="space-y-1.5 text-xs">
                  <p><span className="font-semibold text-slate-500">Payment:</span> <span className="text-slate-700">{q.payment_terms || '-'}</span></p>
                  <p><span className="font-semibold text-slate-500">Delivery:</span> <span className="text-slate-700">{q.delivery_terms || '-'}</span></p>
                  <p><span className="font-semibold text-slate-500">Warranty:</span> <span className="text-slate-700">{q.warranty || '-'}</span></p>
                </div>
              )}
            />
            
            {/* Item Level Comparison */}
            <tr>
              <td className="p-4 border-b border-slate-200 border-r bg-slate-50 font-bold text-slate-700 align-top">
                Line Items
              </td>
              {quotations.map(q => (
                <td key={q.quotation_id} className="p-4 border-b border-slate-200 align-top">
                  <div className="space-y-3">
                    {q.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="font-bold text-slate-800 mb-1">{item.medicine_name}</div>
                        <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                          <div>Qty: <span className="font-semibold text-slate-900">{item.quoted_quantity} {item.unit}</span></div>
                          <div>Unit: <span className="font-semibold text-slate-900">{q.currency} {item.quoted_unit_price}</span></div>
                          <div>Disc: <span className="font-semibold text-emerald-600">{item.discount_percent}%</span></div>
                          <div>Brand: <span className="font-semibold text-slate-900">{item.brand || '-'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper components
function HighlightCard({ icon: Icon, title, supplierName, color }: { icon: any, title: string, supplierName?: string, color: string }) {
  const colorMap: any = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700 icon-amber-500',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 icon-emerald-500',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 icon-blue-500',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 icon-purple-500',
  };
  const theme = colorMap[color];

  return (
    <motion.div whileHover={{ y: -2 }} className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 ${theme}`}>
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
        <Icon size={18} className={theme.split(' ')[3].replace('icon-', 'text-')} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{title}</p>
        <p className="font-black text-sm mt-0.5 truncate">{supplierName || 'N/A'}</p>
      </div>
    </motion.div>
  );
}

function ComparisonRow({ title, quotations, highlightId, renderValue }: { title: string, quotations: any[], highlightId?: string, renderValue: (q: any) => React.ReactNode }) {
  return (
    <tr className="hover:bg-slate-50/30 transition-colors">
      <td className="p-4 border-b border-slate-200 border-r bg-slate-50/50 text-sm font-semibold text-slate-700">
        {title}
      </td>
      {quotations.map(q => {
        const isHighlighted = q.quotation_id === highlightId;
        return (
          <td key={q.quotation_id} className="p-4 border-b border-slate-200 relative">
            {isHighlighted && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            )}
            {renderValue(q)}
          </td>
        );
      })}
    </tr>
  );
}
