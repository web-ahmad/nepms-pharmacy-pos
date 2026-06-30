import { useEffect } from 'react';
import { CheckCircle2, Printer, ArrowRight, ClipboardList } from 'lucide-react';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { usePrintReceipt } from '../services/pos.api';

interface InvoicePreviewProps {
  invoice: any;
  onNewSale: () => void;
  /** When true, suppress auto-print (used by cashier terminal after verify-complete) */
  skipPrint?: boolean;
}

export default function InvoicePreview({ invoice, onNewSale, skipPrint = false }: InvoicePreviewProps) {
  const { data: invoiceSettings } = useInvoiceSettings();
  const printReceiptMutation = usePrintReceipt();

  // Auto-print on every successful checkout/verification.
  useEffect(() => {
    if (invoice && !skipPrint) {
      if (invoiceSettings?.print_mode === 'ESC_POS_RAW') {
        // Trigger backend direct printing
        printReceiptMutation.mutate(invoice, {
          onSettled: () => {
            const timer = setTimeout(() => onNewSale(), 1000);
            return () => clearTimeout(timer);
          }
        });
      } else {
        // Browser print
        const timer = setTimeout(() => {
          window.print();
          // Immediately go to new sale when print dialog closes (or is cancelled)
          onNewSale();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else if (invoice && skipPrint) {
      // If skip print is true, just wait a brief moment to show success, then return to POS
      const timer = setTimeout(() => {
        onNewSale();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [invoice, skipPrint, onNewSale, invoiceSettings]);

  if (!invoice) return null;

  // isPickingSlip controls the SCREEN-ONLY left panel text/icon only.
  // The printed receipt always looks like a completed paid invoice regardless of DB status.
  const isPickingSlip = invoice.status === 'Pending Verification';

  // Determine display values for the receipt.
  // For Pending Verification, amount_paid is 0 in DB — show total as if fully paid.
  const displayAmountPaid = isPickingSlip ? invoice.total_amount : (invoice.amount_paid ?? invoice.total_amount);
  const displayPaymentMethod = (isPickingSlip || !invoice.payment_method || invoice.payment_method === 'Cash')
    ? 'Cash'
    : invoice.payment_method;
  const displayChangeDue = Math.max(0, displayAmountPaid - (invoice.total_amount ?? 0));

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-lowest">
      {/* Screen Loading Overlay (Never Printed) */}
      <div className="flex flex-col items-center justify-center no-print">
        {isPickingSlip ? (
          <ClipboardList className="mb-4 h-16 w-16 text-blue-500 animate-pulse" />
        ) : (
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500 animate-bounce" />
        )}
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {isPickingSlip ? 'Order Saved' : 'Sale Completed'}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {skipPrint ? 'Returning to terminal...' : 'Sending to printer...'}
        </p>
      </div>

      {/* Right Side: Thermal Receipt — ALWAYS renders as a full paid invoice (ONLY VISIBLE ON PRINT) */}
      <div className="hidden print:flex items-center justify-center receipt-print-wrapper w-full">
          <div className="receipt-container w-[80mm] min-w-[80mm] max-w-[80mm] bg-white text-zinc-900 p-4 border border-zinc-200 shadow-sm font-mono text-[11px] leading-relaxed dark:bg-white dark:text-zinc-900">
            
            {/* Header */}
            <div className="text-center space-y-1 mb-4">
              {invoiceSettings?.show_logo !== false && (
                <h3 className="text-sm font-bold tracking-wide uppercase">NEPMS PHARMACY</h3>
              )}
              <p className="text-[10px] text-zinc-600">Plot 12-C, Commercial Area, Sector G-10</p>
              <p className="text-[10px] text-zinc-600">Ph: +92-51-1234567</p>
              <div className="border-b border-dashed border-zinc-300 my-2"></div>
            </div>

            {/* Meta Details */}
            <div className="space-y-1 text-[10px] mb-3">
              <div className="flex justify-between">
                <span>Invoice #:</span>
                <span className="font-bold">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{invoice.sale_date ? new Date(invoice.sale_date.endsWith('Z') ? invoice.sale_date : invoice.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              {invoiceSettings?.show_cashier_name !== false && (
                <div className="flex justify-between">
                  <span>Sale Person:</span>
                  <span>{invoice.cashier_name || (invoice.cashier_id ? invoice.cashier_id.substring(0, 8).toUpperCase() : 'OPERATOR')}</span>
                </div>
              )}
              {invoiceSettings?.show_customer_name !== false && invoice.customer_id && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>Registered Account</span>
                </div>
              )}
              <div className="border-b border-dashed border-zinc-300 my-2"></div>
            </div>

            {/* Items Table — always shows prices (never a "picking slip") */}
            <table className="w-full text-left mb-3">
              <thead>
                <tr className="border-b border-dashed border-zinc-300 text-[10px] font-bold">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-zinc-150">
                {invoice.items?.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-1 max-w-[28mm] truncate pr-1">
                      {item.medicine_name || ('Medicine ' + (item.medicine_id ? item.medicine_id.substring(0, 4) : idx))}
                    </td>
                    <td className="py-1 text-center font-mono font-bold text-xs">{item.quantity}</td>
                    <td className="py-1 text-right font-mono">
                      {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{item.unit_price?.toFixed(2)}
                    </td>
                    <td className="py-1 text-right font-mono">
                      {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{item.total?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-b border-dashed border-zinc-300 mb-3"></div>

            {/* Financial Summary — always shown */}
            <div className="space-y-1 text-right mb-3">
              <div className="flex justify-between text-[10px]">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{invoice.subtotal?.toFixed(2) ?? invoice.total_amount?.toFixed(2)}
                </span>
              </div>
              {invoiceSettings?.show_discount !== false && (invoice.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-[10px] text-green-700">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{invoice.discount_amount?.toFixed(2)}
                  </span>
                </div>
              )}
              {invoiceSettings?.show_adjustments !== false && invoice.adjustment_amount !== undefined && invoice.adjustment_amount !== 0 && (
                <div className="flex justify-between text-[10px] text-orange-700">
                  <span>Adjustment:</span>
                  <span className="font-mono">
                    {invoice.adjustment_amount > 0 ? '+' : ''}{invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{invoice.adjustment_amount?.toFixed(2)}
                  </span>
                </div>
              )}
              {invoiceSettings?.show_tax !== false && (invoice.tax_amount ?? 0) > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>Tax:</span>
                  <span className="font-mono">
                    {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{invoice.tax_amount?.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold border-t border-dashed border-zinc-200 pt-1">
                <span>Grand Total:</span>
                <span className="font-mono">
                  {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{invoice.total_amount?.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-b border-dashed border-zinc-300 mb-3"></div>

            {/* Payment Details — always shown, with display values */}
            <div className="space-y-1 text-[10px] mb-4">
              {invoiceSettings?.show_payment_method !== false && (
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{displayPaymentMethod}</span>
                </div>
              )}
              {invoiceSettings?.show_received_amount !== false && (
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-mono">
                    {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{displayAmountPaid.toFixed(2)}
                  </span>
                </div>
              )}
              {invoiceSettings?.show_change_amount !== false && (
                <div className="flex justify-between text-blue-800 font-bold">
                  <span>Change Returned:</span>
                  <span className="font-mono">
                    {invoiceSettings?.show_currency_symbol !== false ? 'Rs ' : ''}{displayChangeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            {invoiceSettings?.show_footer_text !== false && (
              <div className="text-center space-y-1 text-[9px] text-zinc-600 border-t border-dashed border-zinc-200 pt-3">
                <p className="font-semibold">{invoiceSettings?.footer_text || 'Thank you for your visit!'}</p>
                <p>Software Powered by NEPMS</p>
              </div>
            )}
          </div>
        </div>

      <style>{`
        @media print {
          @page {
            size: ${invoiceSettings?.paper_size || '80mm'} auto;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .no-print-bg {
            background: white !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
          }
          .no-print-card {
            box-shadow: none !important;
            border: none !important;
            width: ${invoiceSettings?.paper_size || '80mm'} !important;
            max-width: ${invoiceSettings?.paper_size || '80mm'} !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .receipt-print-wrapper {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .receipt-container {
            border: none !important;
            box-shadow: none !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
