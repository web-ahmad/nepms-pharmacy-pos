'use client';

import React, { useState } from 'react';
import { useSalesHistory, useSaleDetail } from '../services/sales.api';
import { Sale } from '../types/sales';
import SaleReturnModal from './SaleReturnModal';
import { Printer, Eye, RotateCcw, Calendar, User, Search, RefreshCw, X, ChevronLeft, ChevronRight, FileText, Filter, Receipt } from 'lucide-react';

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
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23,59,59,999);
      
      start = startOfDay.toLocaleDateString('en-CA');
      end = endOfDay.toLocaleDateString('en-CA');
    } else if (preset === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      
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
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);

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

    const itemsRows = sale.items?.map((item: any, idx: number) => `
      <tr>
        <td style="padding: 4px 0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.medicine_name || 'Medicine'}
        </td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right;">Rs ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right;">Rs ${item.total.toFixed(2)}</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.invoice_number}</title>
          <style>
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 11px; }
            }
            body { font-family: monospace; font-size: 11px; color: #000; width: 80mm; padding: 10px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="text-center">
            <h3 style="margin: 0 0 4px 0;">NEPMS PHARMACY</h3>
            <p style="margin: 0;">Plot 12-C, Commercial Area, Sector G-10</p>
            <p style="margin: 0;">Ph: +92-51-1234567</p>
            <div class="divider"></div>
          </div>

          <div style="line-height: 1.4; margin-bottom: 8px;">
            <div>Invoice: <b>${sale.invoice_number}</b></div>
            <div>Date: ${new Date(sale.sale_date.endsWith('Z') ? sale.sale_date : sale.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</div>
            <div>Cashier: ${sale.cashier_name || 'Operator'}</div>
            <div class="divider"></div>
          </div>

          <table>
            <thead>
              <tr style="border-b: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">Item</th>
                <th style="padding-bottom: 4px;">Qty</th>
                <th style="text-align: right; padding-bottom: 4px;">Price</th>
                <th style="text-align: right; padding-bottom: 4px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="divider"></div>

          <div style="line-height: 1.4; text-align: right; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>Rs ${sale.subtotal.toFixed(2)}</span>
            </div>
            ${sale.discount_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: green;">
              <span>Discount:</span>
              <span>-Rs ${sale.discount_amount.toFixed(2)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Grand Total:</span>
              <span>Rs ${sale.total_amount.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
          </div>

          <div style="line-height: 1.4; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Method:</span>
              <span>{sale.payment_method}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Paid:</span>
              <span>Rs ${sale.amount_paid.toFixed(2)}</span>
            </div>
            ${sale.amount_paid < sale.total_amount ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #991b1b;">
              <span>Balance Owed:</span>
              <span>Rs ${(sale.total_amount - sale.amount_paid).toFixed(2)}</span>
            </div>
            ` : `
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Change:</span>
              <span>Rs ${sale.change_due.toFixed(2)}</span>
            </div>
            `}
          </div>

          <div class="divider"></div>
          <div class="text-center" style="margin-top: 10px; font-size: 10px;">
            <p style="margin: 0;">Thank you for your visit!</p>
            <p style="margin: 4px 0 0 0;">Software Powered by NEPMS</p>
          </div>
        </body>
      </html>
    `);
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  activePreset === preset.id
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
                      {sale.status !== 'Held' && sale.status !== 'Voided' && sale.status !== 'Fully Returned' && (
                        <button
                          title="Process Return"
                          onClick={() => setReturnSaleId(sale.id)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg transition active:scale-90 inline-flex items-center border border-emerald-200"
                        >
                          <RotateCcw size={15} />
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
          <div className="bg-white border-l border-slate-200 w-full max-w-lg h-screen shadow-2xl flex flex-col z-50 animate-slideLeft font-premium-sans">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="h-full flex items-center justify-center">
                  <span className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></span>
                </div>
              ) : !saleDetail ? (
                <p className="text-center text-slate-500">Could not fetch invoice details.</p>
              ) : (
                <div className="space-y-6">
                  
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
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cashier</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{saleDetail.cashier_name || 'System'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Payment Method</p>
                      <p className="font-bold text-slate-800 mt-0.5">{saleDetail.payment_method}</p>
                    </div>
                  </div>

                  {/* List of Medicines */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sold Products</h4>
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      {saleDetail.items?.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition duration-150">
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{item.medicine_name}</span>
                            <span className="font-mono text-slate-700">Rs {item.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>
                              Qty: {item.quantity} &bull; Price: Rs {item.unit_price.toFixed(2)}
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

                  {/* Bill Calculator Summary */}
                  <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-200 space-y-2.5 text-sm">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono text-slate-800">Rs {saleDetail.subtotal.toFixed(2)}</span>
                    </div>
                    {saleDetail.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount Applied</span>
                        <span className="font-mono">-Rs {saleDetail.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {saleDetail.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Tax</span>
                        <span className="font-mono text-slate-800">Rs {saleDetail.tax_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2.5 flex justify-between font-extrabold text-slate-900 text-base">
                      <span>Grand Total</span>
                      <span className="font-mono text-emerald-600">Rs {saleDetail.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrint(saleDetail)}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Printer size={16} />
                      Reprint Receipt
                    </button>
                    {saleDetail.status !== 'Held' && saleDetail.status !== 'Voided' && saleDetail.status !== 'Fully Returned' && (
                      <button
                        onClick={() => {
                          setReturnSaleId(saleDetail.id);
                          setSelectedSaleId(null);
                        }}
                        className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} />
                        Return Items
                      </button>
                    )}
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
