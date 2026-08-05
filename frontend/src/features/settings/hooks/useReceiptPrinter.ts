'use client';

import React from 'react';
import JsBarcode from 'jsbarcode';
import { useInvoiceSettings, useCompanyIdentity, resolveAssetUrl } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';

/**
 * Single source of truth for thermal receipt printing.
 *
 * The receipt toggles live in Invoice Settings, but the logo and the WhatsApp
 * barcode come from Company Settings — so every caller has to merge the two
 * before handing them to `generateReceiptHtml`. That merge used to be inlined
 * in the sales history screen only, which is why return receipts printed
 * without a logo and ignored the "With Logo" option entirely.
 *
 * Reads the company side through /settings/company-identity rather than the
 * full settings blob: identity is open to every authenticated user, so a
 * cashier printing a receipt gets the real logo instead of a 403 and defaults.
 */
export function useReceiptPrinter() {
  const { data: invoiceSettings } = useInvoiceSettings();
  const { data: company } = useCompanyIdentity();

  const co: any = company || {};
  const rawWa = String(co.whatsapp || co.whatsapp_number || co.phone || '03000040305').trim();

  const settings = React.useMemo(() => {
    const logo_url = resolveAssetUrl(co.logo_url);

    // Footer WhatsApp barcode (Code128) — encodes the direct chat link.
    let barcode_data_url = '';
    if (typeof document !== 'undefined') {
      try {
        const digits = rawWa.replace(/\D/g, '');
        const intl = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, `https://wa.me/${intl}`, {
          format: 'CODE128', width: 1.4, height: 46, displayValue: false,
          margin: 4, background: '#ffffff', lineColor: '#000000',
        });
        barcode_data_url = canvas.toDataURL('image/png');
      } catch { /* barcode is optional — never block the print */ }
    }

    // Letterhead falls back to the company profile when the invoice-settings
    // overrides are blank, so a receipt never prints the hardcoded sample name.
    const addressLine = [co.address, co.city, co.country].filter(Boolean).join(', ');

    return {
      ...invoiceSettings,
      business_name:    (invoiceSettings as any)?.business_name    || co.name      || undefined,
      business_address: (invoiceSettings as any)?.business_address || addressLine  || undefined,
      business_phone:   (invoiceSettings as any)?.business_phone   || co.phone     || undefined,
      logo_url,
      barcode_data_url,
      barcode_caption: `WhatsApp: ${rawWa}`,
    };
  }, [invoiceSettings, co.logo_url, co.name, co.address, co.city, co.country, co.phone, rawWa]);

  /** Opens the print window. Call this synchronously from the click handler
   *  so the browser doesn't treat the popup as unsolicited. */
  const printReceipt = React.useCallback((doc: any, type: 'sale' | 'return' = 'sale') => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(generateReceiptHtml(doc, settings, type));
    w.document.close();
  }, [settings]);

  return { printReceipt, receiptSettings: settings };
}
