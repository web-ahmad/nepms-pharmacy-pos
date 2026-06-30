'use client';

import React, { useState } from 'react';
import { useReturnLogs } from '../services/sales.api';
import { ReturnLog } from '../types/sales';
import { Search, Calendar, User, RefreshCw, FileText, ArrowRightLeft, Filter, Printer, Eye, X, Receipt } from 'lucide-react';

export default function ReturnLogs() {
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    cashier_id: ''
  });

  const { data, isLoading, isFetching, refetch } = useReturnLogs(filters);
  const [selectedReturn, setSelectedReturn] = useState<ReturnLog | null>(null);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePrint = (log: ReturnLog) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = log.items?.map((item: any) => `
      <tr>
        <td style="padding: 4px 0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.medicine_name || 'Medicine'}
        </td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity_returned}</td>
        <td style="padding: 4px 0; text-align: right;">Rs ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right;">Rs ${item.total_refund.toFixed(2)}</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Return Invoice - ${log.return_number}</title>
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
            <h3 style="margin: 0 0 4px 0;">RETURN INVOICE</h3>
            <p style="margin: 0;">NEPMS PHARMACY</p>
            <div class="divider"></div>
          </div>

          <div style="line-height: 1.4; margin-bottom: 8px;">
            <div>Return No: <b>${log.return_number}</b></div>
            <div>Ref Invoice: <b>${log.invoice_number}</b></div>
            <div>Date: ${new Date(log.return_date).toLocaleString()}</div>
            <div>Cashier: ${log.cashier_name || 'Operator'}</div>
            <div class="divider"></div>
          </div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">Item</th>
                <th style="padding-bottom: 4px;">Qty</th>
                <th style="text-align: right; padding-bottom: 4px;">Price</th>
                <th style="text-align: right; padding-bottom: 4px;">Refund</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="divider"></div>

          <div style="line-height: 1.4; text-align: right; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Total Refund:</span>
              <span>Rs ${log.total_amount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Refund Method:</span>
              <span>${log.payment_mode}</span>
            </div>
            ${log.notes ? `
            <div style="text-align: left; font-size: 10px; margin-top: 5px;">
              <span>Notes: ${log.notes}</span>
            </div>` : ''}
          </div>

          <div class="divider"></div>
          <div class="text-center" style="margin-top: 10px; font-size: 10px;">
            <p style="margin: 0;">Stock processed successfully</p>
            <p style="margin: 4px 0 0 0;">Software Powered by NEPMS</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 font-premium-sans">
      
      {/* Interactive Filters Panel (White Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter size={18} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Search & Filter Returns</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full bg-slate-55 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none transition-all"
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
                className="w-full bg-slate-55 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none transition-all"
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
                className="w-full bg-slate-55 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 pl-9 text-sm text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
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
            Fetch Logs
          </button>
        </div>
      </div>

      {/* Return Logs Table Container (White Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Return Number</th>
                <th className="py-4 px-6">Original Invoice</th>
                <th className="py-4 px-6">Date / Time</th>
                <th className="py-4 px-6">Cashier</th>
                <th className="py-4 px-6">Refund Method</th>
                <th className="py-4 px-6 text-center">Items Returned</th>
                <th className="py-4 px-6 text-right">Refund Total</th>
                <th className="py-4 px-6">Audit Notes</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"></span>
                      <span>Loading return logs...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 italic">
                    No return logs matched the selected search filters.
                  </td>
                </tr>
              ) : (
                data.map((log) => (
                  <tr key={log.id} className="group hover:bg-slate-50/50 transition duration-150">
                    <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <ArrowRightLeft size={13} className="text-emerald-500" />
                        {log.return_number}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-slate-400" />
                        {log.invoice_number}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {new Date(log.return_date).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-slate-600">{log.cashier_name}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        log.payment_mode === 'Store Credit' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-250'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.payment_mode === 'Store Credit' ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}></span>
                        {log.payment_mode}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-slate-800">{log.items_summary}</td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-600 font-mono">
                      Rs {log.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 max-w-[200px] truncate" title={log.notes || ''}>
                      {log.notes || '-'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        title="View Details"
                        onClick={() => setSelectedReturn(log)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90 inline-flex items-center border border-slate-200"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Print Return Invoice"
                        onClick={() => handlePrint(log)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90 inline-flex items-center border border-slate-200"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Detail Sidebar Drawer (White Theme) */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-lg h-screen shadow-2xl flex flex-col z-50 animate-slideLeft font-premium-sans">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-slate-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-950 font-premium-heading">Return Invoice Details</h3>
                  <p className="text-xs text-slate-500">Summary of returned products</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-6">
                
                {/* Meta Grid details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Return Number</p>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedReturn.return_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Original Invoice</p>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedReturn.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Timestamp</p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {new Date(selectedReturn.return_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cashier</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedReturn.cashier_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Refund Method</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedReturn.payment_mode}</p>
                  </div>
                </div>

                {/* List of returned Medicines */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Returned Products</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-150">
                    {selectedReturn.items && selectedReturn.items.length > 0 ? (
                      selectedReturn.items.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50/50 transition duration-150">
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{item.medicine_name}</span>
                            <span className="font-mono text-emerald-600">Rs {item.total_refund.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>
                              Returned: {item.quantity_returned} &bull; Price: Rs {item.unit_price.toFixed(2)}
                            </span>
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-150 text-[10px]">
                              {item.stock_action}
                            </span>
                          </div>
                          {item.return_reason && (
                            <p className="text-xs text-slate-450 mt-1.5 bg-slate-100 p-1.5 rounded font-medium italic">
                              Reason: {item.return_reason}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-xs text-slate-400">No product return detail logs stored in database.</p>
                    )}
                  </div>
                </div>

                {/* Refund Summary */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-between font-extrabold text-slate-900 text-base">
                  <span>Total Refund</span>
                  <span className="font-mono text-emerald-600">Rs {selectedReturn.total_amount.toFixed(2)}</span>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handlePrint(selectedReturn)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print Return Invoice
                </button>

              </div>
            </div>

          </div>
        </div>
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
