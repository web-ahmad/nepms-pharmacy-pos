'use client';

import React, { useState } from 'react';
import { useReturnLogs } from '../services/sales.api';
import { ReturnLog } from '../types/sales';
import {
  Search, Calendar, User, RefreshCw, FileText,
  ArrowRightLeft, Filter, Printer, Eye, X, Receipt,
  Package, RotateCcw, CreditCard, Banknote, AlertCircle
} from 'lucide-react';
import ReturnDetailsModal, { PaymentBadge, StockBadge } from './ReturnDetailsModal';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';


export default function ReturnLogs() {
  const [filters, setFilters] = useState({ start_date: '', end_date: '', cashier_id: '' });
  const { data, isLoading, isFetching, refetch } = useReturnLogs(filters);
  const [selectedReturn, setSelectedReturn] = useState<ReturnLog | null>(null);

  const handleFilterChange = (key: string, value: any) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const { data: invoiceSettings } = useInvoiceSettings();

  const handlePrint = (log: ReturnLog) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(generateReceiptHtml(
      { ...log, subtotal: log.total_amount, amount_paid: log.total_amount } as any,
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

      <ReturnDetailsModal
        returnLog={selectedReturn}
        onClose={() => setSelectedReturn(null)}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rl-row {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      ` }} />
    </>
  );
}
