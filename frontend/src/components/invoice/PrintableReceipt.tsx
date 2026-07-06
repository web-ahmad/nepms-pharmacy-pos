import React from 'react';

export interface PrintableReceiptProps {
  invoice: any;
  settings?: any;
  /** 'sale' (default) or 'return' — controls the invoice label only */
  type?: 'sale' | 'return';
}

export default function PrintableReceipt({ invoice, settings, type = 'sale' }: PrintableReceiptProps) {
  if (!invoice) return null;

  const isReturn = type === 'return';

  // Determine display values for the receipt.
  const isPickingSlip = invoice.status === 'Pending Verification';
  const displayAmountPaid = isPickingSlip ? invoice.total_amount : (invoice.amount_paid ?? invoice.total_amount);
  const displayPaymentMethod = (isPickingSlip || !invoice.payment_method || invoice.payment_method === 'Cash')
    ? 'Cash'
    : invoice.payment_method;
  const displayChangeDue = Math.max(0, displayAmountPaid - (invoice.total_amount ?? 0));

  const currencySymbol = settings?.show_currency_symbol !== false ? 'Rs ' : '';

  // ── Business identity from settings ───────────────────────────────────
  const businessName    = settings?.business_name    || 'NEPMS Pharmacy';
  const businessAddress = settings?.business_address || 'Plot 12-C, Commercial Area, Sector G-10';
  const businessPhone   = settings?.business_phone   || '+92-51-1234567';

  return (
    <div className="receipt-print-wrapper w-full flex items-center justify-center">
      <div className="receipt-container w-[80mm] min-w-[80mm] max-w-[80mm] bg-white text-zinc-900 p-4 border border-zinc-200 shadow-sm font-mono text-[11px] leading-relaxed dark:bg-white dark:text-zinc-900">
        
        {/* Header */}
        <div className="text-center space-y-1 mb-4">
          {/* Return Invoice label — only structural difference */}
          {isReturn && (
            <p className="text-[11px] font-bold tracking-widest border border-black px-2 py-0.5 inline-block mb-1">
              ⟵ RETURN INVOICE ⟶
            </p>
          )}
          {settings?.show_logo !== false && (
            <h3 className="text-sm font-bold tracking-wide uppercase">{businessName}</h3>
          )}
          <p className="text-[10px] text-zinc-600">{businessAddress}</p>
          <p className="text-[10px] text-zinc-600">Ph: {businessPhone}</p>
          {settings?.show_drug_license !== false && settings?.drug_license_number && (
            <p className="text-[10px] text-zinc-600">Drug Lic #: {settings.drug_license_number}</p>
          )}
          {settings?.show_ntn === true && settings?.business_ntn && (
            <p className="text-[10px] text-zinc-600">NTN: {settings.business_ntn}</p>
          )}
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
          {(settings?.show_sale_person !== false && settings?.show_cashier_name !== false) && (
            <div className="flex justify-between">
              <span>Sale Person:</span>
              <span>{invoice.cashier_name || (invoice.cashier_id ? invoice.cashier_id.substring(0, 8).toUpperCase() : 'OPERATOR')}</span>
            </div>
          )}
          {(settings?.show_customer_info !== false && settings?.show_customer_name !== false) && invoice.customer_id && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>Registered Account</span>
            </div>
          )}
          <div className="border-b border-dashed border-zinc-300 my-2"></div>
        </div>

        {/* Items Table */}
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
                  {currencySymbol}{item.unit_price?.toFixed(2)}
                </td>
                <td className="py-1 text-right font-mono">
                  {currencySymbol}{item.total?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-b border-dashed border-zinc-300 mb-3"></div>

        {/* Financial Summary */}
        <div className="space-y-1 text-right mb-3">
          <div className="flex justify-between text-[10px]">
            <span>Subtotal:</span>
            <span className="font-mono">
              {currencySymbol}{invoice.subtotal?.toFixed(2) ?? invoice.total_amount?.toFixed(2)}
            </span>
          </div>
          {settings?.show_discount !== false && (invoice.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-[10px] text-green-700">
              <span>Discount:</span>
              <span className="font-mono">
                -{currencySymbol}{invoice.discount_amount?.toFixed(2)}
              </span>
            </div>
          )}
          {(settings?.show_adjustments !== false && settings?.show_adjustment !== false) && invoice.adjustment_amount !== undefined && invoice.adjustment_amount !== 0 && (
            <div className="flex justify-between text-[10px] text-orange-700">
              <span>Adjustment:</span>
              <span className="font-mono">
                {invoice.adjustment_amount > 0 ? '+' : ''}{currencySymbol}{invoice.adjustment_amount?.toFixed(2)}
              </span>
            </div>
          )}
          {settings?.show_tax !== false && (invoice.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Tax:</span>
              <span className="font-mono">
                {currencySymbol}{invoice.tax_amount?.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold border-t border-dashed border-zinc-200 pt-1">
            <span>Grand Total:</span>
            <span className="font-mono">
              {currencySymbol}{invoice.total_amount?.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="border-b border-dashed border-zinc-300 mb-3"></div>

        {/* Payment Details */}
        <div className="space-y-1 text-[10px] mb-4">
          {settings?.show_payment_method !== false && (
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>{displayPaymentMethod}</span>
            </div>
          )}
          {settings?.show_received_amount !== false && (
            <div className="flex justify-between">
              <span>Amount Received:</span>
              <span className="font-mono">
                {currencySymbol}{displayAmountPaid.toFixed(2)}
              </span>
            </div>
          )}
          {settings?.show_change_amount !== false && (
            <div className="flex justify-between text-blue-800 font-bold">
              <span>Change Returned:</span>
              <span className="font-mono">
                {currencySymbol}{displayChangeDue.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        {settings?.show_footer_text !== false && (
          <div className="text-center space-y-1 text-[9px] text-zinc-600 border-t border-dashed border-zinc-200 pt-3">
            <p className="font-semibold">{settings?.footer_text || 'Thank you for your visit!'}</p>
            <p>Software Powered by NEPMS</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: ${settings?.paper_size || '80mm'} auto;
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
