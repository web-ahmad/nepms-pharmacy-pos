export const generateReceiptHtml = (saleOrReturn: any, settings: any, type: 'sale' | 'return') => {
  const isReturn = type === 'return';
  
  // Settings fallbacks (default to true if undefined)
  const showLogo = settings?.show_logo !== false;
  const showCashier = settings?.show_cashier_name !== false;
  const showCustomer = settings?.show_customer_name !== false;
  const showCurrency = settings?.show_currency_symbol !== false;
  const showPaymentMethod = settings?.show_payment_method !== false;
  const showReceived = settings?.show_received_amount !== false;
  const showChange = settings?.show_change_amount !== false;
  const showDiscount = settings?.show_discount !== false;
  const showAdjustment = settings?.show_adjustment !== false;
  const showTax = settings?.show_tax !== false;
  const footerMessage = settings?.footer_message || 'Thank you for your business!';
  const returnPolicy = settings?.return_policy_text || 'Software Powered by NEPMS';
  
  const currencyPrefix = showCurrency ? 'Rs ' : '';
  
  const invoiceNumber = saleOrReturn.invoice_number || saleOrReturn.return_number;
  const dateStr = saleOrReturn.sale_date || saleOrReturn.return_date || new Date().toISOString();
  const dateDisplay = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' });
  const cashierName = saleOrReturn.cashier_name || (saleOrReturn.cashier_id ? saleOrReturn.cashier_id.substring(0, 8).toUpperCase() : 'OPERATOR');
  
  const items = saleOrReturn.items || [];
  
  const itemsRows = items.map((item: any, idx: number) => {
    const qty = isReturn ? item.quantity_returned : item.quantity;
    const total = isReturn ? item.total_refund : item.total;
    const name = item.medicine_name || ('Medicine ' + (item.medicine_id ? String(item.medicine_id).substring(0, 4) : idx));
    
    return `
      <tr>
        <td style="padding: 4px 0; max-width: 28mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${name}
        </td>
        <td style="padding: 4px 0; text-align: center; font-weight: bold;">${qty}</td>
        <td style="padding: 4px 0; text-align: right;">${currencyPrefix}${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right;">${currencyPrefix}${(total || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const subtotal = saleOrReturn.subtotal ?? saleOrReturn.total_amount;
  const discount = saleOrReturn.discount_amount || 0;
  const tax = saleOrReturn.tax_amount || 0;
  const totalAmount = saleOrReturn.total_amount || 0;
  
  const amountPaid = saleOrReturn.amount_paid ?? totalAmount;
  const paymentMethod = saleOrReturn.payment_method || saleOrReturn.payment_mode || 'Cash';
  const changeDue = Math.max(0, amountPaid - totalAmount);

  return `
    <html>
      <head>
        <title>Receipt - ${invoiceNumber}</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 10px; font-family: monospace; font-size: 11px; }
          }
          body { font-family: monospace; font-size: 11px; color: #000; width: 80mm; min-width: 80mm; max-width: 80mm; padding: 10px; line-height: 1.4; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { border-bottom: 1px dashed #000; font-size: 10px; padding-bottom: 4px; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="text-center" style="margin-bottom: 12px;">
          ${isReturn ? '<h3 style="margin: 0 0 4px 0;">RETURN INVOICE</h3>' : ''}
          ${showLogo ? '<h3 style="margin: 0 0 4px 0; font-size: 14px; letter-spacing: 1px;">NEPMS PHARMACY</h3>' : ''}
          <p style="margin: 0; font-size: 10px;">Plot 12-C, Commercial Area, Sector G-10</p>
          <p style="margin: 0; font-size: 10px;">Ph: +92-51-1234567</p>
          <div class="divider"></div>
        </div>

        <div style="font-size: 10px; margin-bottom: 12px;">
          <div class="flex-between">
            <span>Invoice #:</span>
            <span class="font-bold">${invoiceNumber}</span>
          </div>
          <div class="flex-between">
            <span>Date/Time:</span>
            <span>${dateDisplay}</span>
          </div>
          ${showCashier ? `
            <div class="flex-between">
              <span>Sale Person:</span>
              <span>${cashierName}</span>
            </div>
          ` : ''}
          ${showCustomer && saleOrReturn.customer_id ? `
            <div class="flex-between">
              <span>Customer:</span>
              <span>Registered Account</span>
            </div>
          ` : ''}
          <div class="divider"></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="divider"></div>

        <div style="font-size: 10px; text-align: right; margin-bottom: 12px;">
          <div class="flex-between">
            <span>Subtotal:</span>
            <span>${currencyPrefix}${subtotal.toFixed(2)}</span>
          </div>
          ${showDiscount && discount > 0 ? `
            <div class="flex-between" style="color: green;">
              <span>Discount:</span>
              <span>-${currencyPrefix}${discount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${showAdjustment && saleOrReturn.adjustment_amount ? `
            <div class="flex-between" style="color: red;">
              <span>Adjustment:</span>
              <span>${currencyPrefix}${saleOrReturn.adjustment_amount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${showTax && tax > 0 ? `
            <div class="flex-between">
              <span>Tax:</span>
              <span>${currencyPrefix}${tax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="flex-between font-bold" style="font-size: 11px;">
            <span>Grand Total:</span>
            <span>${currencyPrefix}${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <div class="divider"></div>

        <div style="font-size: 10px; margin-bottom: 16px;">
          ${showPaymentMethod ? `
            <div class="flex-between">
              <span>Payment Method:</span>
              <span>${paymentMethod}</span>
            </div>
          ` : ''}
          ${showReceived && !isReturn ? `
            <div class="flex-between">
              <span>Amount Received:</span>
              <span>${currencyPrefix}${amountPaid.toFixed(2)}</span>
            </div>
          ` : ''}
          ${showChange && !isReturn ? `
            <div class="flex-between font-bold" style="color: #1e40af;">
              <span>Change Returned:</span>
              <span>${currencyPrefix}${changeDue.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div class="text-center" style="font-size: 10px;">
          <p style="margin: 0 0 8px 0;">${footerMessage}</p>
          <p style="margin: 0; font-size: 9px; color: #555;">${returnPolicy}</p>
        </div>
      </body>
    </html>
  `;
};
