'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSalesHistory, useSaleDetail, useVoidSale } from '../services/sales.api';
import { Sale } from '../types/sales';
import SaleReturnModal from './SaleReturnModal';
import { Printer, Eye, RotateCcw, Calendar, User, Search, RefreshCw, X, ChevronLeft, ChevronRight, FileText, Filter, Receipt, Ban } from 'lucide-react';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';
import PrintableReceipt from '@/components/invoice/PrintableReceipt';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth-store';
import { parseApiError } from '@/utils/errorParser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SalesHistory() {
  const [filters, setFilters] = useState({
    invoice_id: '',
    start_date: '',
    end_date: '',
    cashier_id: '',
    page: 1,
    limit: 10
  });

  const [activePreset, setActivePreset] = useState<string>('all');

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      start = startOfDay.toLocaleDateString('en-CA');
      end = endOfDay.toLocaleDateString('en-CA');
    } else if (preset === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const todayDate = new Date();
      start = startOfWeek.toLocaleDateString('en-CA');
      end = todayDate.toLocaleDateString('en-CA');
    } else if (preset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const todayDate = new Date();
      start = startOfMonth.toLocaleDateString('en-CA');
      end = todayDate.toLocaleDateString('en-CA');
    }

    setFilters(prev => ({
      ...prev,
      start_date: start,
      end_date: end,
      page: 1
    }));
  };

  const { data, isLoading, isFetching, refetch } = useSalesHistory(filters);
  const { data: invoiceSettings } = useInvoiceSettings();

  const searchParams = useSearchParams();
  const viewId = searchParams.get('view_id');

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(viewId);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [voidSaleId, setVoidSaleId] = useState<string | null>(null);

  const voidSaleMutation = useVoidSale();
  const { user } = useAuthStore();

  const handleVoidSale = async () => {
    if (!voidSaleId) return;
    try {
      await voidSaleMutation.mutateAsync({
        saleId: voidSaleId,
        payload: {
          voided_by: user?.username || 'System',
          void_reason: 'Voided from Sales History'
        }
      });
      toast.success('Invoice Voided & Stock Reverted Successfully!');
      setVoidSaleId(null);
      refetch();
      if (selectedSaleId === voidSaleId) {
        setSelectedSaleId(null);
      }
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  React.useEffect(() => {
    if (viewId) {
      setSelectedSaleId(viewId);
    }
  }, [viewId]);
  const { data: saleDetail, isLoading: isLoadingDetail } = useSaleDetail(selectedSaleId || undefined);

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'start_date' || key === 'end_date') {
      setActivePreset('');
    }
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Completed
          </span>
        );
      case 'Partially Paid':
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-250">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Partially Paid
          </span>
        );
      case 'Held':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-250">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Held
          </span>
        );
      case 'Voided':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-250">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Voided
          </span>
        );
      case 'Partially Returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-250">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Partially Returned
          </span>
        );
      case 'Fully Returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Fully Returned
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const handlePrint = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateReceiptHtml(sale, invoiceSettings, 'sale');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 1;

  return (
    <div className="space-y-6 font-premium-sans">

      {/* Interactive Filters Panel (White Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-premium-heading">Search Filters</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Daily (Today)' },
              { id: 'week', label: 'Weekly' },
              { id: 'month', label: 'Monthly' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${activePreset === preset.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-slate-55 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Invoice Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="SAL-XXXXX"
                value={filters.invoice_id}
                onChange={(e) => handleFilterChange('invoice_id', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none placeholder-slate-400 transition-all shadow-inner-sm"
              />
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none transition-all"
              />
              <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none transition-all"
              />
              <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cashier / Operator
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cashier username"
                value={filters.cashier_id}
                onChange={(e) => handleFilterChange('cashier_id', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
              />
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-slate-200 transition active:scale-95 duration-200"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Search Invoices
          </button>
        </div>
      </div>

      {/* Sales List Table container (White Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Invoice Number</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Cashier</th>
                <th className="py-4 px-6">Payment Mode</th>
                <th className="py-4 px-6 text-right">Total Amount</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"></span>
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 italic">
                    No sales invoices matched the selected search filters.
                  </td>
                </tr>
              ) : (
                data.items.map((sale) => (
                  <tr key={sale.id} className="group hover:bg-slate-50/50 transition duration-150">
                    <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {sale.invoice_number}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {new Date(sale.sale_date.endsWith('Z') ? sale.sale_date : sale.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-slate-600">{sale.cashier_name || 'System'}</td>
                    <td className="py-4 px-6 font-medium text-slate-500">{sale.payment_method}</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono">
                      Rs {sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(sale.status)}</td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        title="View Details"
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90 inline-flex items-center border border-slate-200"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Reprint Invoice"
                        onClick={() => handlePrint(sale)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90 inline-flex items-center border border-slate-200"
                      >
                        <Printer size={15} />
                      </button>
                      {(sale.status === 'Completed' || sale.status === 'Partially Returned') && (
                        <button
                          title="Process Return"
                          onClick={() => setReturnSaleId(sale.id)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg transition active:scale-90 inline-flex items-center border border-emerald-200"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                      {(sale.status === 'Completed' || sale.status === 'Pending Verification' || sale.status === 'Pending') && (
                        <button
                          title="Void Sale"
                          onClick={() => setVoidSaleId(sale.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition active:scale-90 inline-flex items-center border border-red-200"
                        >
                          <Ban size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Panel */}
        {data && data.total > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(filters.page - 1) * filters.limit + 1} - {Math.min(filters.page * filters.limit, data.total)} of {data.total} sales
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
                className="p-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 rounded-lg transition border border-slate-200"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= totalPages}
                className="p-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 rounded-lg transition border border-slate-200"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Sidebar Drawer (White Theme) */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-4xl h-screen shadow-2xl flex flex-col z-50 animate-slideLeft font-premium-sans">

            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-slate-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-950 font-premium-heading">Invoice Details</h3>
                  <p className="text-xs text-slate-500">Summary and financial logs</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleId(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoadingDetail ? (
                <div className="h-full flex items-center justify-center">
                  <span className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></span>
                </div>
              ) : !saleDetail ? (
                <p className="text-center text-slate-500 mt-10">Could not fetch invoice details.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-slate-200">
                  {/* Left Column: Summary */}
                  <div className="overflow-y-auto p-6 space-y-6 bg-white">
                    {/* Meta Grid details */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-55 p-4 rounded-2xl border border-slate-200 text-sm">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Invoice Number</p>
                        <p className="font-bold text-slate-900 mt-0.5">{saleDetail.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status</p>
                        <div className="mt-1">{getStatusBadge(saleDetail.status)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Timestamp</p>
                        <p className="font-semibold text-slate-700 mt-0.5">
                          {new Date(saleDetail.sale_date.endsWith('Z') ? saleDetail.sale_date : saleDetail.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      {invoiceSettings?.show_cashier_name !== false && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cashier</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{saleDetail.cashier_name || 'System'}</p>
                        </div>
                      )}
                      {invoiceSettings?.show_customer_name !== false && saleDetail.customer_id && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Customer</p>
                          <p className="font-semibold text-slate-700 mt-0.5">Registered Account</p>
                        </div>
                      )}
                      {invoiceSettings?.show_payment_method !== false && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Payment Method</p>
                          <p className="font-bold text-slate-800 mt-0.5">{saleDetail.payment_method}</p>
                        </div>
                      )}
                    </div>

                    {/* List of Medicines */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sold Products</h4>
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {saleDetail.items?.map((item) => (
                          <div key={item.id} className="p-4 hover:bg-slate-50 transition duration-150">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span>{item.medicine_name}</span>
                              <span className="font-mono text-slate-700">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{item.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                              <span>
                                Qty: {item.quantity} &bull; Price: {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{item.unit_price.toFixed(2)}
                              </span>
                              {item.quantity_returned_so_far > 0 && (
                                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {item.quantity_returned_so_far} returned
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 space-y-3">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-mono font-medium">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{(saleDetail.subtotal ?? saleDetail.total_amount)?.toFixed(2)}</span>
                      </div>
                      {invoiceSettings?.show_discount !== false && saleDetail.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>Discount</span>
                          <span className="font-mono font-medium">-{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{saleDetail.discount_amount?.toFixed(2)}</span>
                        </div>
                      )}
                      {invoiceSettings?.show_adjustment !== false && saleDetail.adjustment_amount !== undefined && saleDetail.adjustment_amount !== 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Adjustment</span>
                          <span className="font-mono font-medium">{saleDetail.adjustment_amount > 0 ? '+' : ''}{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{saleDetail.adjustment_amount?.toFixed(2)}</span>
                        </div>
                      )}
                      {invoiceSettings?.show_tax !== false && saleDetail.tax_amount > 0 && (
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Tax</span>
                          <span className="font-mono font-medium">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{saleDetail.tax_amount?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-emerald-950 pt-2 border-t border-emerald-200">
                        <span>Grand Total</span>
                        <span className="font-mono">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{saleDetail.total_amount?.toFixed(2)}</span>
                      </div>

                      {(invoiceSettings?.show_received_amount !== false || invoiceSettings?.show_change_amount !== false) && (
                        <div className="mt-4 pt-3 border-t border-dashed border-emerald-200 space-y-2">
                          {invoiceSettings?.show_received_amount !== false && (
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Amount Received</span>
                              <span className="font-mono">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{(saleDetail.amount_paid ?? saleDetail.total_amount)?.toFixed(2)}</span>
                            </div>
                          )}
                          {invoiceSettings?.show_change_amount !== false && (
                            <div className="flex justify-between text-xs text-blue-600 font-bold">
                              <span>Change Returned</span>
                              <span className="font-mono">{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{Math.max(0, (saleDetail.amount_paid ?? saleDetail.total_amount) - saleDetail.total_amount).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => handlePrint(saleDetail)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                      >
                        <Printer size={18} />
                        Reprint Receipt
                      </button>

                      {(saleDetail.status === 'Completed' || saleDetail.status === 'Partially Returned') && (
                        <button
                          onClick={() => setReturnSaleId(saleDetail.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={18} />
                          Return Items
                        </button>
                      )}

                      {(saleDetail.status === 'Completed' || saleDetail.status === 'Pending Verification' || saleDetail.status === 'Pending') && (
                        <button
                          onClick={() => setVoidSaleId(saleDetail.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                        >
                          <Ban size={18} />
                          Void Sale
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Receipt Preview */}
                  <div className="overflow-y-auto p-6 bg-slate-100 flex justify-center items-start shadow-inner">
                    <div className="w-[90mm] h-auto bg-white shadow-md border border-slate-300 pointer-events-none transform scale-90 origin-top">
                      <PrintableReceipt invoice={saleDetail} settings={invoiceSettings} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sale Return Modal */}
      {returnSaleId && (
        <SaleReturnModal
          saleId={returnSaleId}
          onClose={() => setReturnSaleId(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Void Sale Alert Dialog */}
      <AlertDialog open={!!voidSaleId} onOpenChange={(open) => !open && setVoidSaleId(null)}>
        <AlertDialogContent className="font-premium-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Ban size={20} />
              Void Sale Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this entire invoice? This will cancel the sale, reverse the cash entry, and return all items back to the inventory stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleVoidSale();
              }}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
              disabled={voidSaleMutation.isPending}
            >
              {voidSaleMutation.isPending ? 'Voiding...' : 'Yes, Void Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideLeft {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
