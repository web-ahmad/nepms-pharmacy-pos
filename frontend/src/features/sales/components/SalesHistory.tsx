'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSalesHistory, useSaleDetail, useVoidSale } from '../services/sales.api';
import { Sale } from '../types/sales';
import SaleReturnModal from './SaleReturnModal';
import {
  Printer, Eye, RotateCcw, Calendar, User, Search,
  RefreshCw, X, ChevronLeft, ChevronRight, FileText,
  Filter, Receipt, Ban, CheckCircle2, Clock, AlertCircle,
  ArrowDownLeft, Minus
} from 'lucide-react';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';
import PrintableReceipt from '@/components/invoice/PrintableReceipt';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth-store';
import { parseApiError } from '@/utils/errorParser';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Status badge helper ────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; dot: string; icon?: React.ReactNode }> = {
    'Completed':          { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500 animate-pulse' },
    'Partially Returned': { cls: 'bg-indigo-50  text-indigo-700  border-indigo-200',   dot: 'bg-indigo-400  animate-pulse' },
    'Returned':           { cls: 'bg-slate-100  text-slate-600   border-slate-200',    dot: 'bg-slate-400' },
    'Voided':             { cls: 'bg-rose-50    text-rose-700    border-rose-200',      dot: 'bg-rose-500'  },
    'Held':               { cls: 'bg-amber-50   text-amber-700   border-amber-200',    dot: 'bg-amber-500  animate-pulse' },
    'Partially Paid':     { cls: 'bg-amber-50   text-amber-700   border-amber-200',    dot: 'bg-amber-500  animate-pulse' },
    'Partial':            { cls: 'bg-amber-50   text-amber-700   border-amber-200',    dot: 'bg-amber-500  animate-pulse' },
  };
  const cfg = map[status] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function SalesHistory() {
  const [filters, setFilters] = useState({
    invoice_id: '', start_date: '', end_date: '', cashier_id: '', page: 1, limit: 10,
  });
  const [activePreset, setActivePreset] = useState<string>('all');

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    let start = '', end = '';
    if (preset === 'today') {
      const s = new Date(today); s.setHours(0, 0, 0, 0);
      const e = new Date(today); e.setHours(23, 59, 59, 999);
      start = s.toLocaleDateString('en-CA'); end = e.toLocaleDateString('en-CA');
    } else if (preset === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const sw = new Date(today.setDate(diff)); sw.setHours(0, 0, 0, 0);
      start = sw.toLocaleDateString('en-CA'); end = new Date().toLocaleDateString('en-CA');
    } else if (preset === 'month') {
      const sm = new Date(today.getFullYear(), today.getMonth(), 1);
      start = sm.toLocaleDateString('en-CA'); end = new Date().toLocaleDateString('en-CA');
    }
    setFilters(p => ({ ...p, start_date: start, end_date: end, page: 1 }));
  };

  const { data, isLoading, isFetching, refetch } = useSalesHistory(filters);
  const { data: invoiceSettings } = useInvoiceSettings();
  const searchParams = useSearchParams();
  const viewId = searchParams.get('view_id');

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(viewId);
  const [returnSaleId,   setReturnSaleId]   = useState<string | null>(null);
  const [voidSaleId,     setVoidSaleId]     = useState<string | null>(null);

  const voidSaleMutation = useVoidSale();
  const { user } = useAuthStore();

  React.useEffect(() => { if (viewId) setSelectedSaleId(viewId); }, [viewId]);

  const { data: saleDetail, isLoading: isLoadingDetail, isError, error } = useSaleDetail(selectedSaleId || undefined);

  const handleVoidSale = async () => {
    if (!voidSaleId) return;
    try {
      await voidSaleMutation.mutateAsync({
        saleId: voidSaleId,
        payload: { voided_by: user?.username || 'System', void_reason: 'Voided from Sales History' }
      });
      toast.success('Invoice Voided & Stock Reverted!');
      setVoidSaleId(null); refetch();
      if (selectedSaleId === voidSaleId) setSelectedSaleId(null);
    } catch (err: any) { toast.error(parseApiError(err)); }
  };

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'start_date' || key === 'end_date') setActivePreset('');
    setFilters(p => ({ ...p, [key]: value, page: 1 }));
  };

  const handlePrint = (sale: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(generateReceiptHtml(sale, invoiceSettings, 'sale'));
    w.document.close();
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 1;

  const PRESETS = [
    { id: 'all',   label: 'All Time'     },
    { id: 'today', label: 'Today'        },
    { id: 'week',  label: 'This Week'    },
    { id: 'month', label: 'This Month'   },
  ];

  return (
    <>
      {/* ── FILTER PANEL ────────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100 space-y-4">
        {/* Row 1: title + presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter size={15} className="text-[#006a43]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Search Filters</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150 ${
                  activePreset === p.id
                    ? 'bg-[#006a43] border-[#006a43] text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#006a43] hover:text-[#006a43]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Invoice */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice No.</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder="SAL-XXXXX"
                value={filters.invoice_id}
                onChange={e => handleFilterChange('invoice_id', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#006a43] focus:bg-white rounded-xl text-[13px] text-gray-800 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date" value={filters.start_date}
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
                type="date" value={filters.end_date}
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
                type="text" placeholder="Cashier username"
                value={filters.cashier_id}
                onChange={e => handleFilterChange('cashier_id', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#006a43] focus:bg-white rounded-xl text-[13px] text-gray-800 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Row 3: search button */}
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006a43] hover:bg-[#005233] text-white rounded-xl text-[13px] font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 shadow-sm"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Search Invoices
          </button>
        </div>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead>
            <tr className="bg-[#f6faf8] border-b border-gray-100">
              {['Invoice Number', 'Date & Time', 'Cashier', 'Payment Mode', 'Total Amount', 'Status', 'Actions'].map((h, i) => (
                <th key={h} className={`py-3.5 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${i === 4 ? 'text-right' : i === 5 ? 'text-center' : i === 6 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="inline-flex items-center gap-2.5 text-gray-400">
                    <div className="w-5 h-5 rounded-full border-2 border-[#006a43] border-t-transparent animate-spin" />
                    <span className="text-sm font-medium">Loading invoices…</span>
                  </div>
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-gray-400 text-sm italic">
                  No sales invoices matched the selected filters.
                </td>
              </tr>
            ) : (
              [...data.items]
                .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
                .map((sale, idx) => (
                  <tr
                    key={sale.id}
                    className="group hover:bg-[#f4faf7] transition-colors duration-100"
                    style={{ animation: `sh-row 0.3s ease-out both ${idx * 0.03}s` }}
                  >
                    {/* Invoice No */}
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-gray-900 group-hover:text-[#006a43] transition-colors font-mono text-[13px]">
                        {sale.invoice_number}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="py-3.5 px-5 text-gray-500 font-medium whitespace-nowrap">
                      {new Date(
                        sale.sale_date.endsWith('Z') ? sale.sale_date : sale.sale_date + 'Z'
                      ).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    {/* Cashier */}
                    <td className="py-3.5 px-5 text-gray-600 font-medium">{sale.cashier_name || 'System'}</td>
                    {/* Payment */}
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
                        {sale.payment_method}
                      </span>
                    </td>
                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                      Rs {sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Status */}
                    <td className="py-3.5 px-5 text-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          title="View Details"
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#006a43] hover:bg-[#e8f5ef] border border-transparent hover:border-emerald-200 transition-all"
                        ><Eye size={14} /></button>
                        <button
                          title="Reprint Invoice"
                          onClick={() => handlePrint(sale)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
                        ><Printer size={14} /></button>
                        {(sale.status === 'Completed' || sale.status === 'Partially Returned') && (
                          <button
                            title="Process Return"
                            onClick={() => setReturnSaleId(sale.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                          ><RotateCcw size={14} /></button>
                        )}
                        {(sale.status === 'Completed' || sale.status === 'Pending Verification' || sale.status === 'Pending') && (
                          <button
                            title="Void Sale"
                            onClick={() => setVoidSaleId(sale.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                          ><Ban size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ──────────────────────────────────────────────── */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-[#f9fafb] rounded-b-2xl">
          <span className="text-[12px] text-gray-400 font-medium">
            Showing {(filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, data.total)} of <span className="font-bold text-gray-700">{data.total}</span> sales
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              disabled={filters.page <= 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-[#006a43] hover:text-[#006a43] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            ><ChevronLeft size={15} /></button>
            <span className="px-3 py-1.5 text-[12px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
              {filters.page} / {totalPages}
            </span>
            <button
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              disabled={filters.page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-[#006a43] hover:text-[#006a43] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            ><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* ── DETAIL SIDE DRAWER ──────────────────────────────────────── */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSaleId(null); }}>
          <div className="bg-white border-l border-gray-200 w-full max-w-4xl h-screen shadow-2xl flex flex-col z-50 animate-slideLeft">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-[#f6faf8] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#006a43]/10">
                  <Receipt size={18} className="text-[#006a43]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">Invoice Details</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Summary and financial logs</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleId(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              ><X size={16} /></button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-hidden">
              {isLoadingDetail ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#006a43] border-t-transparent animate-spin" />
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center mt-16 space-y-2 px-6">
                  <AlertCircle size={32} className="text-red-400" />
                  <p className="text-center text-red-500 font-bold">Failed to load invoice details.</p>
                  <p className="text-center text-gray-400 text-sm">{parseApiError(error) || 'Unknown error.'}</p>
                </div>
              ) : !saleDetail ? (
                <p className="text-center text-gray-400 mt-10 text-sm">Select an invoice to view details.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-gray-100">

                  {/* Left: info */}
                  <div className="overflow-y-auto p-6 space-y-5">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3 bg-[#f6faf8] rounded-2xl border border-emerald-100 p-4 text-sm">
                      {[
                        { label: 'Invoice Number', value: saleDetail.invoice_number, bold: true },
                        { label: 'Status', value: <StatusBadge status={saleDetail.status} /> },
                        { label: 'Timestamp', value: new Date(saleDetail.sale_date.endsWith('Z') ? saleDetail.sale_date : saleDetail.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) },
                        { label: 'Cashier', value: saleDetail.cashier_name || 'System' },
                        { label: 'Payment Method', value: saleDetail.payment_method },
                      ].map(row => (
                        <div key={row.label}>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.label}</p>
                          <div className={`mt-1 ${row.bold ? 'font-bold text-gray-900 font-mono' : 'font-semibold text-gray-700'} text-[13px]`}>
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Products */}
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sold Products</h4>
                      <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {saleDetail.items?.map(item => (
                          <div key={item.id} className="p-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start font-semibold text-gray-900 text-[13px]">
                              <span>{item.medicine_name}</span>
                              <span className="font-mono text-gray-800">Rs {item.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                              <span>Qty: {item.quantity} &bull; Rs {item.unit_price.toFixed(2)} each</span>
                              {item.quantity_returned_so_far > 0 && (
                                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                                  {item.quantity_returned_so_far} returned
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="bg-[#f4faf7] rounded-2xl border border-emerald-100 p-4 space-y-2">
                      {[
                        { label: 'Subtotal', value: `Rs ${(saleDetail.subtotal ?? saleDetail.total_amount)?.toFixed(2)}`, cls: 'text-gray-600' },
                        ...(saleDetail.discount_amount > 0 ? [{ label: 'Discount', value: `-Rs ${saleDetail.discount_amount?.toFixed(2)}`, cls: 'text-emerald-600 font-bold' }] : []),
                        ...(saleDetail.tax_amount > 0 ? [{ label: 'Tax', value: `Rs ${saleDetail.tax_amount?.toFixed(2)}`, cls: 'text-gray-600' }] : []),
                      ].map(row => (
                        <div key={row.label} className={`flex justify-between text-[13px] ${row.cls}`}>
                          <span>{row.label}</span><span className="font-mono font-medium">{row.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[15px] font-extrabold text-[#006a43] pt-2 border-t border-emerald-200">
                        <span>Grand Total</span>
                        <span className="font-mono">Rs {saleDetail.total_amount?.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => handlePrint(saleDetail)}
                        className="flex-1 bg-gray-800 hover:bg-gray-900 text-white px-4 py-3 rounded-xl font-bold text-[13px] transition flex items-center justify-center gap-2"
                      ><Printer size={16} /> Reprint</button>

                      {(saleDetail.status === 'Completed' || saleDetail.status === 'Partially Returned') && (
                        <button
                          onClick={() => setReturnSaleId(saleDetail.id)}
                          className="flex-1 bg-[#006a43] hover:bg-[#005233] text-white px-4 py-3 rounded-xl font-bold text-[13px] transition flex items-center justify-center gap-2"
                        ><RotateCcw size={16} /> Return Items</button>
                      )}
                      {(saleDetail.status === 'Completed' || saleDetail.status === 'Pending Verification' || saleDetail.status === 'Pending') && (
                        <button
                          onClick={() => setVoidSaleId(saleDetail.id)}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl font-bold text-[13px] transition flex items-center justify-center gap-2"
                        ><Ban size={16} /> Void Sale</button>
                      )}
                    </div>
                  </div>

                  {/* Right: receipt preview */}
                  <div className="overflow-y-auto p-6 bg-gray-100 flex justify-center items-start">
                    <div className="w-[90mm] bg-white shadow-md border border-gray-200 pointer-events-none transform scale-90 origin-top">
                      <PrintableReceipt invoice={saleDetail} settings={invoiceSettings} />
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RETURN MODAL ────────────────────────────────────────────── */}
      {returnSaleId && (
        <SaleReturnModal saleId={returnSaleId} onClose={() => setReturnSaleId(null)} onSuccess={() => refetch()} />
      )}

      {/* ── VOID DIALOG ─────────────────────────────────────────────── */}
      <AlertDialog open={!!voidSaleId} onOpenChange={(o) => !o && setVoidSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Ban size={18} /> Void Sale Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the sale, reverse the cash entry, and return all items back to inventory stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleVoidSale(); }}
              className="bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-600"
              disabled={voidSaleMutation.isPending}
            >
              {voidSaleMutation.isPending ? 'Voiding…' : 'Yes, Void Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sh-row {
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
