'use client';

import React, { useState } from 'react';
import { useReturnLogs } from '../services/sales.api';
import { ReturnLog } from '../types/sales';
import {
  Search, Calendar, User, RefreshCw, FileText,
  ArrowRightLeft, Filter, Printer, Eye, X, Receipt,
  Package, RotateCcw, CreditCard, Banknote, AlertCircle
} from 'lucide-react';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';

// ── Payment mode badge ─────────────────────────────────────────────────────
const PaymentBadge = ({ mode }: { mode: string }) => {
  const isCredit = mode === 'Store Credit';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
      isCredit
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCredit ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
      {mode}
    </span>
  );
};

// ── Stock action badge ─────────────────────────────────────────────────────
const StockBadge = ({ action }: { action: string }) => {
  const isDamaged = action === 'Marked as Damaged';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      isDamaged
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-teal-50 text-teal-700 border-teal-200'
    }`}>
      {action}
    </span>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function ReturnLogs() {
  const [filters, setFilters] = useState({ start_date: '', end_date: '', cashier_id: '' });
  const { data, isLoading, isFetching, refetch } = useReturnLogs(filters);
  const { data: invoiceSettings } = useInvoiceSettings();
  const [selectedReturn, setSelectedReturn] = useState<ReturnLog | null>(null);

  const handleFilterChange = (key: string, value: any) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const handlePrint = (log: ReturnLog) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(generateReceiptHtml(
      { ...log, subtotal: log.total_amount, amount_paid: log.total_amount },
      invoiceSettings, 'return'
    ));
    w.document.close();
  };

  const HEADERS = [
    'Return Number', 'Original Invoice', 'Date & Time',
    'Cashier', 'Refund Method', 'Items', 'Refund Total', 'Notes', 'Actions'
  ];

  return (
    <>
      {/* ── FILTER PANEL ────────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#006a43]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Search &amp; Filter Returns
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={filters.start_date}
                onChange={e => handleFilterChange('start_date', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#006a43] focus:bg-white rounded-xl text-[13px] text-gray-800 outline-none transition-colors"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Date</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={filters.end_date}
                onChange={e => handleFilterChange('end_date', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#006a43] focus:bg-white rounded-xl text-[13px] text-gray-800 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Cashier */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cashier</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cashier username"
                value={filters.cashier_id}
                onChange={e => handleFilterChange('cashier_id', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#006a43] focus:bg-white rounded-xl text-[13px] text-gray-800 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Fetch button */}
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006a43] hover:bg-[#005233] text-white rounded-xl text-[13px] font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 shadow-sm"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Fetch Logs
          </button>
        </div>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead>
            <tr className="bg-[#f6faf8] border-b border-gray-100">
              {HEADERS.map((h, i) => (
                <th
                  key={h}
                  className={`py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                    i === 6 ? 'text-right' : i === 5 ? 'text-center' : i === 8 ? 'text-right' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="inline-flex items-center gap-2.5 text-gray-400">
                    <div className="w-5 h-5 rounded-full border-2 border-[#006a43] border-t-transparent animate-spin" />
                    <span className="text-sm font-medium">Loading return logs…</span>
                  </div>
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <RotateCcw size={22} className="text-gray-300" />
                    </div>
                    <span className="text-sm italic">No return logs matched the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((log, idx) => (
                <tr
                  key={log.id}
                  className="group hover:bg-[#f4faf7] transition-colors duration-100"
                  style={{ animation: `rl-row 0.3s ease-out both ${idx * 0.03}s` }}
                >
                  {/* Return Number */}
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 font-bold text-gray-900 group-hover:text-[#006a43] transition-colors font-mono text-[13px]">
                      <ArrowRightLeft size={12} className="text-[#006a43] shrink-0" />
                      {log.return_number}
                    </span>
                  </td>

                  {/* Original Invoice */}
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-700 font-mono text-[13px]">
                      <FileText size={12} className="text-gray-400 shrink-0" />
                      {log.invoice_number}
                    </span>
                  </td>

                  {/* Date/Time */}
                  <td className="py-3.5 px-4 text-gray-500 font-medium whitespace-nowrap text-[12px]">
                    {new Date(log.return_date).toLocaleString('en-PK', {
                      timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short'
                    })}
                  </td>

                  {/* Cashier */}
                  <td className="py-3.5 px-4 text-gray-600 font-medium">{log.cashier_name}</td>

                  {/* Refund Method */}
                  <td className="py-3.5 px-4">
                    <PaymentBadge mode={log.payment_mode} />
                  </td>

                  {/* Items count */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold text-[12px] border border-gray-200">
                      {log.items_summary}
                    </span>
                  </td>

                  {/* Refund Total */}
                  <td className="py-3.5 px-4 text-right font-bold text-[#006a43] font-mono whitespace-nowrap">
                    Rs {log.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Notes */}
                  <td className="py-3.5 px-4 text-[11px] text-gray-400 max-w-[160px] truncate" title={log.notes || ''}>
                    {log.notes || <span className="text-gray-300">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        title="View Details"
                        onClick={() => setSelectedReturn(log)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#006a43] hover:bg-[#e8f5ef] border border-transparent hover:border-emerald-200 transition-all"
                      ><Eye size={14} /></button>
                      <button
                        title="Print Return Invoice"
                        onClick={() => handlePrint(log)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
                      ><Printer size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count footer */}
      {data && data.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 bg-[#f9fafb] rounded-b-2xl">
          <span className="text-[12px] text-gray-400 font-medium">
            Showing <span className="font-bold text-gray-700">{data.length}</span> return {data.length === 1 ? 'log' : 'logs'}
          </span>
        </div>
      )}

      {/* ── DETAIL SIDE DRAWER ──────────────────────────────────────── */}
      {selectedReturn && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end"
          onClick={e => { if (e.target === e.currentTarget) setSelectedReturn(null); }}
        >
          <div className="bg-white border-l border-gray-200 w-full max-w-lg h-screen shadow-2xl flex flex-col z-50 animate-slideLeft">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-[#f6faf8] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#006a43]/10">
                  <RotateCcw size={18} className="text-[#006a43]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">Return Invoice Details</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Summary of returned products</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              ><X size={16} /></button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#f6faf8] rounded-2xl border border-emerald-100 p-4">
                {[
                  { label: 'Return Number',   value: selectedReturn.return_number,  mono: true  },
                  { label: 'Original Invoice', value: selectedReturn.invoice_number, mono: true  },
                  { label: 'Timestamp',        value: new Date(selectedReturn.return_date).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }), mono: false },
                  { label: 'Cashier',          value: selectedReturn.cashier_name,  mono: false },
                  { label: 'Refund Method',    value: <PaymentBadge mode={selectedReturn.payment_mode} />, mono: false },
                ].map((row, i) => (
                  <div key={i}>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.label}</p>
                    <div className={`mt-1 text-[13px] font-semibold text-gray-800 ${row.mono ? 'font-mono font-bold' : ''}`}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Returned products */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Returned Products</h4>
                <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {selectedReturn.items && selectedReturn.items.length > 0 ? (
                    selectedReturn.items.map(item => (
                      <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start font-semibold text-gray-900 text-[13px]">
                          <span className="flex items-center gap-1.5">
                            <Package size={13} className="text-gray-400 shrink-0 mt-0.5" />
                            {item.medicine_name}
                          </span>
                          <span className="font-mono text-[#006a43] font-bold shrink-0 ml-2">
                            Rs {item.total_refund.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
                          <span>Qty: {item.quantity_returned} &bull; Rs {item.unit_price.toFixed(2)} each</span>
                          <StockBadge action={item.stock_action} />
                        </div>
                        {item.return_reason && (
                          <p className="text-[11px] text-gray-500 mt-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 italic">
                            &ldquo;{item.return_reason}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[12px] text-gray-400 italic flex flex-col items-center gap-2">
                      <AlertCircle size={20} className="text-gray-300" />
                      No product detail logs stored in the database.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes block */}
              {selectedReturn.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Audit Notes</p>
                  <p className="text-[13px] text-amber-800 leading-relaxed">{selectedReturn.notes}</p>
                </div>
              )}

              {/* Refund total summary */}
              <div className="bg-[#f4faf7] rounded-2xl border border-emerald-100 p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Refund</p>
                  <p className="text-[22px] font-extrabold text-[#006a43] font-mono mt-0.5 leading-none">
                    Rs {selectedReturn.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#006a43]/10">
                  <ArrowRightLeft size={22} className="text-[#006a43]" />
                </div>
              </div>

              {/* Print button */}
              <button
                onClick={() => handlePrint(selectedReturn)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#006a43] hover:bg-[#005233] text-white rounded-xl font-bold text-[14px] transition-all duration-150 active:scale-95"
              >
                <Printer size={16} />
                Print Return Invoice
              </button>

            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rl-row {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slideLeft { animation: slideLeft 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
      ` }} />
    </>
  );
}
