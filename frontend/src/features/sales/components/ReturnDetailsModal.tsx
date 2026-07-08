import React, { useMemo } from 'react';
import { ReturnLog } from '../types/sales';
import {
  RotateCcw, X, FileText, Package, ArrowRightLeft, Printer, AlertCircle
} from 'lucide-react';
import { useReturnLogs } from '../services/sales.api';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';

export const PaymentBadge = ({ mode }: { mode: string }) => {
  const isCredit = mode === 'Store Credit';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
      isCredit ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCredit ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
      {mode}
    </span>
  );
};

export const StockBadge = ({ action }: { action: string }) => {
  const isDamaged = action === 'Marked as Damaged';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      isDamaged ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-teal-50 text-teal-700 border-teal-200'
    }`}>
      {action}
    </span>
  );
};

interface Props {
  returnLog?: ReturnLog | null;
  returnNumber?: string | null;
  onClose: () => void;
}

export default function ReturnDetailsModal({ returnLog, returnNumber, onClose }: Props) {
  // If returnLog is not provided, we fetch logs and find it by returnNumber
  const { data: logs, isLoading } = useReturnLogs({});
  const { data: invoiceSettings } = useInvoiceSettings();

  const selectedReturn = useMemo(() => {
    if (returnLog) return returnLog;
    if (returnNumber && logs) return logs.find(r => r.return_number === returnNumber);
    return null;
  }, [returnLog, returnNumber, logs]);

  const handlePrint = (log: ReturnLog) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(generateReceiptHtml(
      { ...log, subtotal: log.total_amount, amount_paid: log.total_amount },
      invoiceSettings, 'return'
    ));
    w.document.close();
  };

  const isVisible = !!returnLog || !!returnNumber;

  if (!isVisible) return null;

  if (isLoading && returnNumber && !selectedReturn) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex justify-end">
        <div className="bg-white border-l border-gray-200 w-full max-w-lg h-screen shadow-2xl flex flex-col justify-center items-center z-[1000]">
           <div className="w-8 h-8 border-4 border-[#006a43] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!selectedReturn) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-l border-gray-200 w-full max-w-lg h-screen shadow-2xl flex flex-col z-[1000] animate-slideLeft">

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
            onClick={onClose}
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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slideLeft { animation: slideLeft 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
      ` }} />
    </div>
  );
}
