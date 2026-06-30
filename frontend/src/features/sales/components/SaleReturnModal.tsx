'use client';

import React, { useState, useEffect } from 'react';
import { useProcessReturn, useSaleDetail } from '../services/sales.api';
import { SaleReturnItemCreate } from '../types/sales';

interface SaleReturnModalProps {
  saleId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SaleReturnModal({ saleId, onClose, onSuccess }: SaleReturnModalProps) {
  const { data: sale, isLoading: isLoadingSale, error: saleError } = useSaleDetail(saleId);
  const processReturnMutation = useProcessReturn();

  // Return quantities & details state mapped by sale_item_id
  const [returnItems, setReturnItems] = useState<Record<string, {
    quantity: number;
    reason: string;
    stockAction: 'Returned to Stock' | 'Marked as Damaged';
  }>>({});

  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Store Credit'>('Cash');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize returnItems when sale details load
  useEffect(() => {
    if (sale?.items) {
      const initial: Record<string, any> = {};
      sale.items.forEach(item => {
        initial[item.id] = {
          quantity: 0,
          reason: 'Customer Changed Mind',
          stockAction: 'Returned to Stock'
        };
      });
      setReturnItems(initial);
    }
  }, [sale]);

  if (isLoadingSale) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-700 font-bold">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (saleError || !sale) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <h3 className="text-xl font-bold text-rose-600 mb-2">Error Loading Sale</h3>
          <p className="text-slate-500 mb-6 font-medium">Could not fetch invoice details. Please try again.</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleQtyChange = (itemId: string, val: number, maxQty: number) => {
    const safeVal = Math.max(0, Math.min(maxQty, val));
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: safeVal
      }
    }));
    setValidationError(null);
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason
      }
    }));
  };

  const handleStockActionChange = (itemId: string, stockAction: 'Returned to Stock' | 'Marked as Damaged') => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        stockAction
      }
    }));
  };

  // Calculate live pro-rated refunds and totals
  const activeReturns = Object.entries(returnItems)
    .filter(([_, data]) => data.quantity > 0)
    .map(([itemId, data]) => {
      const originalItem = sale.items.find(item => item.id === itemId);
      const unitPriceAfterDisc = originalItem ? originalItem.total / originalItem.quantity : 0;
      const refund = unitPriceAfterDisc * data.quantity;
      return {
        itemId,
        quantity: data.quantity,
        reason: data.reason,
        stockAction: data.stockAction,
        refund,
        name: originalItem?.medicine_name || 'Unknown Item'
      };
    });

  const totalRefund = activeReturns.reduce((sum, item) => sum + item.refund, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeReturns.length === 0) {
      setValidationError('Please specify a return quantity of at least 1 for at least one item.');
      return;
    }

    const payloadItems: SaleReturnItemCreate[] = activeReturns.map(item => ({
      sale_item_id: item.itemId,
      quantity_returned: item.quantity,
      return_reason: item.reason,
      stock_action: item.stockAction
    }));

    try {
      await processReturnMutation.mutateAsync({
        saleId: sale.id,
        payload: {
          items: payloadItems,
          payment_mode: paymentMode,
          notes: notes || undefined
        }
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setValidationError(err.response?.data?.detail || 'Failed to process return. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn font-premium-sans">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-premium-heading">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Process Item Return
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Invoice No: <span className="font-bold text-slate-800">{sale.invoice_number}</span> &bull; 
              Date: <span className="text-slate-700 font-medium">{new Date(sale.sale_date).toLocaleDateString()}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {validationError && (
            <div className="p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded-2xl text-sm flex items-center gap-2 font-semibold">
              ⚠️ <span>{validationError}</span>
            </div>
          )}

          {/* Items List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-inner-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-center">Qty / Sold</th>
                  <th className="py-3 px-4 text-center">Already Ret.</th>
                  <th className="py-3 px-4 text-center">Qty to Return</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Stock Action</th>
                  <th className="py-3 px-4 text-right">Refund (Est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm text-slate-700">
                {sale.items.map(item => {
                  const qtyReturned = item.quantity_returned_so_far || 0;
                  const maxReturn = item.quantity - qtyReturned;
                  const itemState = returnItems[item.id] || { quantity: 0, reason: 'Customer Changed Mind', stockAction: 'Returned to Stock' };
                  const unitPriceAfterDisc = item.total / item.quantity;
                  const lineRefund = unitPriceAfterDisc * itemState.quantity;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{item.medicine_name}</p>
                        <p className="text-xs text-slate-400 font-medium">Unit Price: ${item.unit_price.toFixed(2)}</p>
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-800">{item.quantity}</td>
                      <td className="py-4 px-4 text-center text-slate-400 font-medium">{qtyReturned}</td>
                      <td className="py-4 px-4 text-center">
                        {maxReturn <= 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-250">
                            Returned
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, itemState.quantity - 1, maxReturn)}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-lg select-none transition-colors border border-slate-200 active:scale-90"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxReturn}
                              value={itemState.quantity}
                              onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0, maxReturn)}
                              className="w-14 h-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-mono transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, itemState.quantity + 1, maxReturn)}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-lg select-none transition-colors border border-slate-200 active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {maxReturn > 0 && (
                          <select
                            value={itemState.reason}
                            onChange={(e) => handleReasonChange(item.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium cursor-pointer"
                          >
                            <option value="Customer Changed Mind">Customer Changed Mind</option>
                            <option value="Wrong Medicine">Wrong Medicine</option>
                            <option value="Expired">Expired</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Other">Other</option>
                          </select>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {maxReturn > 0 && (
                          <select
                            value={itemState.stockAction}
                            onChange={(e) => handleStockActionChange(item.id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium cursor-pointer"
                          >
                            <option value="Returned to Stock">Return to Stock</option>
                            <option value="Marked as Damaged">Mark as Damaged</option>
                          </select>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 font-mono">
                        ${lineRefund.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Refund Summary and Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode for Refund</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer select-none transition-all border ${
                    paymentMode === 'Cash' 
                      ? 'border-emerald-500 bg-emerald-50/30' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMode"
                      value="Cash"
                      checked={paymentMode === 'Cash'}
                      onChange={() => setPaymentMode('Cash')}
                      className="accent-emerald-500 h-4 w-4"
                    />
                    <div className="text-sm">
                      <p className="font-bold text-slate-900">Cash Refund</p>
                      <p className="text-xs text-slate-500">Refund in cash immediately</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer select-none transition-all border ${
                    paymentMode === 'Store Credit' 
                      ? 'border-emerald-500 bg-emerald-50/30' 
                      : 'border-slate-200 bg-white hover:border-slate-350'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMode"
                      value="Store Credit"
                      checked={paymentMode === 'Store Credit'}
                      onChange={() => setPaymentMode('Store Credit')}
                      className="accent-emerald-500 h-4 w-4"
                    />
                    <div className="text-sm">
                      <p className="font-bold text-slate-900">Store Credit</p>
                      <p className="text-xs text-slate-500">Credit to customer ledger</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Return Notes / Reason Description</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details about this return request..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>

            {/* Calculations right panel */}
            <div className="flex flex-col justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refund Calculation</h3>
                
                <div className="space-y-2 text-sm text-slate-700">
                  {activeReturns.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-[200px]">{item.name} x{item.quantity}</span>
                      <span className="font-mono text-slate-800 font-bold">Rs {item.refund.toFixed(2)}</span>
                    </div>
                  ))}
                  {activeReturns.length === 0 && (
                    <p className="text-xs text-slate-400 italic font-medium">No items selected for return</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-slate-500">Total Refund:</span>
                  <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                    ${totalRefund.toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processReturnMutation.isPending || activeReturns.length === 0}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-500/10 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {processReturnMutation.isPending ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                        Processing...
                      </>
                    ) : (
                      'Process Return'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
