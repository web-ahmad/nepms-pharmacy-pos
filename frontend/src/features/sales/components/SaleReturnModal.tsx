'use client';

import React, { useState, useEffect } from 'react';
import { useProcessReturn, useSaleDetail } from '../services/sales.api';
import { SaleReturnItemCreate } from '../types/sales';

interface SaleReturnModalProps {
  saleId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Inline SVG icons (no font dependency) ──────────────────────────────────
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconReturn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
);

const IconPayment = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#006a43' : '#d1d5db'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006a43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconSpinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function SaleReturnModal({ saleId, onClose, onSuccess }: SaleReturnModalProps) {
  const { data: sale, isLoading: isLoadingSale, error: saleError } = useSaleDetail(saleId);
  const processReturnMutation = useProcessReturn();

  const [returnItems, setReturnItems] = useState<Record<string, {
    quantity: number;
    reason: string;
    stockAction: 'Returned to Stock' | 'Marked as Damaged';
  }>>({});

  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Store Credit'>('Cash');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (sale && Object.keys(returnItems).length === 0) {
      const initial: Record<string, any> = {};
      sale.items.forEach(item => {
        initial[item.id] = { quantity: 0, reason: 'Customer Changed Mind', stockAction: 'Returned to Stock' };
      });
      setReturnItems(initial);
    }
  }, [sale]);

  if (isLoadingSale || saleError || !sale) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-xl flex items-center gap-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#006a43] border-t-transparent"></div>
          <p className="font-bold text-slate-700">Loading invoice data...</p>
        </div>
      </div>
    );
  }

  const handleQtyChange = (itemId: string, val: number, maxQty: number) => {
    const safeVal = Math.max(0, Math.min(maxQty, val));
    setReturnItems(prev => ({ ...prev, [itemId]: { ...prev[itemId], quantity: safeVal } }));
    setValidationError(null);
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setReturnItems(prev => ({ ...prev, [itemId]: { ...prev[itemId], reason } }));
  };

  const activeReturns = Object.entries(returnItems)
    .filter(([_, data]) => data.quantity > 0)
    .map(([itemId, data]) => {
      const originalItem = sale.items.find(item => item.id === itemId);
      const unitPrice = originalItem?.unit_price || 0;
      return {
        itemId,
        quantity: data.quantity,
        reason: data.reason,
        stockAction: data.stockAction,
        refund: unitPrice * data.quantity,
        unitPrice,
        name: originalItem?.medicine_name || 'Unknown Item'
      };
    });

  const totalRefund = activeReturns.reduce((sum, item) => sum + item.refund, 0);

  const handleSubmit = async () => {
    if (activeReturns.length === 0) {
      setValidationError('Please specify a return quantity of at least 1.');
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
        payload: { items: payloadItems, payment_mode: paymentMode, notes: notes || undefined }
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setValidationError(err.response?.data?.detail || 'Failed to process return.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <main className="w-full max-w-[960px] mx-auto max-h-[90vh] bg-[#f8f9fa] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
        style={{ animation: 'srm-fadein 0.2s ease-out' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006a43] shrink-0"></span>
            <div>
              <h1 className="text-[17px] font-bold text-gray-900 leading-tight">Process Item Return</h1>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                INVOICE NO:&nbsp;<span className="text-gray-700">{sale.invoice_number}</span>
                &nbsp;&bull;&nbsp;DATE:&nbsp;<span className="text-gray-700">{new Date(sale.sale_date).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <IconClose />
          </button>
        </header>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT COLUMN */}
          <section className="flex flex-col flex-[3] p-6 overflow-y-auto border-r border-gray-200 min-h-0 bg-[#f8f9fa]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>

            {validationError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 font-medium shrink-0">
                {validationError}
              </div>
            )}

            {/* Items table */}
            <div className="mb-5 flex-1">
              <h2 className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">Return Items Inventory</h2>

              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">

                {/* Table header */}
                <div className="flex items-center px-4 py-2.5 bg-[#f8f9fa] border-b border-gray-200 gap-3">
                  <div className="w-[130px] shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item Name</div>
                  <div className="w-[36px] shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Sold</div>
                  <div className="w-[100px] shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Return</div>
                  <div className="flex-1 min-w-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason</div>
                  <div className="w-[80px] shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
                    Stock<br />Action
                  </div>
                  <div className="w-[56px] shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Refund</div>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-gray-100">
                  {sale.items.map(item => {
                    const qtyReturned = item.quantity_returned_so_far || 0;
                    const maxReturn = item.quantity - qtyReturned;
                    const itemState = returnItems[item.id] || { quantity: 0, reason: 'Customer Changed Mind', stockAction: 'Returned to Stock' };
                    const unitPrice = item.unit_price || 0;
                    const lineRefund = unitPrice * itemState.quantity;

                    return (
                      <div key={item.id} className="flex items-center px-4 py-3 gap-3">
                        {/* Item Name */}
                        <div className="w-[130px] shrink-0 min-w-0">
                          <div className="text-[13px] font-bold text-gray-800 truncate">{item.medicine_name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Unit Price: Rs {unitPrice.toFixed(2)}</div>
                        </div>

                        {/* Sold qty */}
                        <div className="w-[36px] shrink-0 text-center text-[13px] text-gray-600 font-medium">
                          {item.quantity}
                        </div>

                        {/* Return qty control */}
                        <div className="w-[100px] shrink-0 flex items-center justify-center gap-1">
                          {maxReturn <= 0 ? (
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Returned</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, itemState.quantity - 1, maxReturn)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 bg-white transition-colors text-[15px] font-medium leading-none"
                              >-</button>
                              <input
                                type="text"
                                readOnly
                                value={itemState.quantity}
                                className="w-9 h-7 text-center border border-gray-300 rounded bg-white text-[13px] font-semibold text-gray-800 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, itemState.quantity + 1, maxReturn)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 bg-white transition-colors text-[15px] font-medium leading-none"
                              >+</button>
                            </>
                          )}
                        </div>

                        {/* Reason dropdown */}
                        <div className="flex-1 min-w-0">
                          {maxReturn > 0 ? (
                            <div className="relative">
                              <select
                                value={itemState.reason}
                                onChange={(e) => handleReasonChange(item.id, e.target.value)}
                                className="w-full h-8 bg-white border border-gray-300 rounded-lg px-2.5 pr-7 text-[11px] text-gray-700 font-medium outline-none appearance-none cursor-pointer focus:border-[#006a43] transition-colors"
                              >
                                <option value="Customer Changed Mind">Custom</option>
                                <option value="Damaged">Defective</option>
                                <option value="Wrong Medicine">Wrong Size</option>
                                <option value="Expired">Expired</option>
                                <option value="Other">Other</option>
                              </select>
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <IconChevronDown />
                              </span>
                            </div>
                          ) : <span className="text-gray-300 text-[12px]">—</span>}
                        </div>

                        {/* Stock Action */}
                        <div className="w-[80px] shrink-0 flex justify-center">
                          {maxReturn > 0 && itemState.quantity > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#006a43] font-semibold text-[12px]">
                              <IconReturn />
                              Return
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[12px]">—</span>
                          )}
                        </div>

                        {/* Refund */}
                        <div className="w-[56px] shrink-0 text-right text-[13px] font-bold text-[#006a43]">
                          Rs {lineRefund.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Processing Policy */}
            <div className="bg-[#f0f7f4] rounded-xl border border-[#c8dfd6] p-4 shrink-0 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#d5ece3] border border-[#b0d5c6] flex items-center justify-center shrink-0 mt-0.5">
                <IconInfo />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-gray-800 mb-1">Processing Policy</h3>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Items returned within 30 days qualify for a full cash refund. After 30 days, only store credit is applicable. Ensure stock action is verified before processing.
                </p>
              </div>
            </div>

          </section>

          {/* RIGHT COLUMN */}
          <section className="flex-[1.6] flex flex-col p-5 bg-[#f8f9fa] overflow-y-auto min-h-0 gap-5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>

            {/* Payment Mode */}
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">Payment Mode for Refund</h2>
              <div className="space-y-2">

                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`w-full flex items-center justify-between p-3 border-2 rounded-xl bg-white transition-all text-left ${paymentMode === 'Cash' ? 'border-[#006a43] bg-[#f4faf7]' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paymentMode === 'Cash' ? 'border-[#006a43]' : 'border-gray-300'}`}>
                      {paymentMode === 'Cash' && <div className="w-3 h-3 rounded-full bg-[#006a43]"></div>}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-gray-800">Cash Refund</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Refund in cash immediately</div>
                    </div>
                  </div>
                  <IconPayment active={paymentMode === 'Cash'} />
                </button>

                {/* Store Credit */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('Store Credit')}
                  className={`w-full flex items-center justify-between p-3 border-2 rounded-xl bg-white transition-all text-left ${paymentMode === 'Store Credit' ? 'border-[#006a43] bg-[#f4faf7]' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paymentMode === 'Store Credit' ? 'border-[#006a43]' : 'border-gray-300'}`}>
                      {paymentMode === 'Store Credit' && <div className="w-3 h-3 rounded-full bg-[#006a43]"></div>}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-gray-800">Store Credit</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Credit to customer ledger</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Return Notes */}
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Return Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-[80px] p-3 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 outline-none resize-none focus:border-[#006a43] transition-colors placeholder:text-gray-400"
                placeholder="Optional details about this return..."
              />
            </div>

            {/* Refund Calculation */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">Refund Calculation</h2>
              <div className="space-y-2">
                {activeReturns.length === 0 ? (
                  <div className="text-[12px] text-gray-400 italic">No items selected</div>
                ) : (
                  activeReturns.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center text-[13px] text-gray-700">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="font-bold text-gray-900">Rs {item.refund.toFixed(2)}</span>
                    </div>
                  ))
                )}
                <div className="border-t border-gray-100 pt-2.5 mt-2.5 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">TAX (0%)</span>
                  <span className="text-[13px] font-bold text-gray-500">Rs 0.00</span>
                </div>
              </div>
            </div>

          </section>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="flex justify-between items-center px-6 py-4 bg-white border-t border-gray-200 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Refund</span>
            <span className="text-[28px] font-bold text-[#006a43] mt-0.5 leading-none">Rs {totalRefund.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-[14px] font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={processReturnMutation.isPending || activeReturns.length === 0}
              className="flex items-center gap-2 bg-[#006a43] hover:bg-[#005233] text-white px-5 py-2.5 rounded-xl text-[14px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processReturnMutation.isPending ? <IconSpinner /> : <IconCheck />}
              <span>{processReturnMutation.isPending ? 'Processing...' : 'Process Return'}</span>
            </button>
          </div>
        </footer>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes srm-fadein {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1);    }
        }
      ` }} />
    </div>
  );
}
