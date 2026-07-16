'use client';

import { useState } from 'react';
import { usePurchaseQuotations } from '../services/purchase.api';
import { 
  Eye, CheckCircle2, XCircle, Search, Plus, FileText, 
  Building2, Calendar, DollarSign, Clock, AlertTriangle, ArrowRight
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function PurchaseQuotationTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: quotations, isLoading, isError } = usePurchaseQuotations();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading quotations...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl border border-red-100 p-8 text-center font-medium flex flex-col items-center gap-2">
        <AlertTriangle size={24} />
        Failed to load quotations. Please try again.
      </div>
    );
  }

  const filtered = quotations?.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.supplier_name && q.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'Draft': return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: FileText };
      case 'Received': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock };
      case 'Compared': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Eye };
      case 'Selected': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 };
      case 'Rejected': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle };
      case 'Expired': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle };
      default: return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: FileText };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        
        <Link 
          href="/purchase/quotations/create" 
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Plus size={16} /> New Quotation
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider font-bold text-slate-500">
              <th className="px-6 py-4 border-b border-slate-100">Quotation ID</th>
              <th className="px-6 py-4 border-b border-slate-100">Supplier</th>
              <th className="px-6 py-4 border-b border-slate-100 text-center">Amount</th>
              <th className="px-6 py-4 border-b border-slate-100">Validity</th>
              <th className="px-6 py-4 border-b border-slate-100">Status</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-12 text-center flex flex-col items-center justify-center text-slate-400"
                    >
                      <FileText size={48} className="mb-4 text-slate-200" strokeWidth={1} />
                      <p className="font-medium text-slate-500">No quotations found</p>
                      <p className="text-xs mt-1">Try adjusting your search or create a new quotation.</p>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const status = getStatusConfig(q.status);
                  const StatusIcon = status.icon;
                  const isExpired = q.valid_until && isPast(parseISO(q.valid_until)) && q.status !== 'Selected' && q.status !== 'Received' ? true : false; // simplistic check

                  return (
                    <motion.tr 
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ID & Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {q.quotation_number}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 font-medium">
                              <Calendar size={10} />
                              {q.quotation_date ? format(new Date(q.quotation_date), 'MMM d, yyyy') : '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          <span className="font-semibold text-slate-700">{q.supplier_name || 'Unknown Supplier'}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-600 tracking-wide uppercase">{q.currency || 'PKR'}</span>
                          <span className="font-black text-emerald-700">{(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="px-6 py-4">
                        {q.valid_until ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Clock size={12} className={isExpired ? 'text-red-400' : 'text-slate-400'} />
                            {format(new Date(q.valid_until), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.className}`}>
                          <StatusIcon size={12} />
                          {isExpired && q.status === 'Received' ? 'Expired' : q.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/purchase/quotations/${q.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                          title="View Details"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
