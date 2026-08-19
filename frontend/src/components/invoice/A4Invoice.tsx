'use client';

import React from 'react';
import { useSettings, resolveAssetUrl, InvoiceTemplateConfig, DEFAULT_INVOICE_TEMPLATE } from '@/features/settings/services/settings.api';

interface A4InvoiceProps {
  invoice: any;
  /** Template config; when omitted, the saved config is read from settings. */
  template?: InvoiceTemplateConfig;
  /** 'sale' | 'return' | 'purchase' — controls the document label. */
  type?: 'sale' | 'return' | 'purchase';
}

function contrastText(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#111827' : '#ffffff';
}

export default function A4Invoice({ invoice, template, type = 'sale' }: A4InvoiceProps) {
  const { data: settings } = useSettings();
  const tpl = template || { ...DEFAULT_INVOICE_TEMPLATE, ...((settings?.invoice_settings as Partial<InvoiceTemplateConfig>) || {}) };
  const company = settings?.company_settings || {};
  const logo = tpl.show_logo ? resolveAssetUrl(company.logo_url) : '';

  const accent = tpl.header_color || '#1e293b';
  const onAccent = contrastText(accent);
  const label = type === 'purchase' ? 'PURCHASE INVOICE' : type === 'return' ? 'RETURN INVOICE' : 'INVOICE';

  const name = company.name || 'Your Company';
  const address = [company.address, company.city, company.country].filter(Boolean).join(', ');
  const contact = [company.phone, company.email].filter(Boolean).join('  ·  ');
  const taxLine = [company.tax_number ? `NTN/Tax: ${company.tax_number}` : '', company.registration_number ? `Reg #: ${company.registration_number}` : ''].filter(Boolean).join('   ');

  const items = invoice.items || [];
  const money = (n: number) => `Rs ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Header variants ─────────────────────────────────────────────────────────
  const Header = () => {
    if (tpl.template === 'minimal') {
      return (
        <div className="mb-6 flex items-end justify-between border-b-2 pb-3" style={{ borderColor: accent }}>
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-12 w-auto object-contain" />}
            <div>
              <h1 className="text-xl font-bold" style={{ color: accent }}>{name}</h1>
              {address && <p className="text-[11px] text-zinc-500">{address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tracking-wide text-zinc-800">{label}</p>
            <p className="text-[11px] text-zinc-500">#{invoice.invoice_number || '—'}</p>
          </div>
        </div>
      );
    }
    if (tpl.template === 'classic') {
      return (
        <div className="mb-6 text-center">
          {logo && <img src={logo} alt="" className="mx-auto mb-2 h-14 w-auto object-contain" />}
          <h1 className="text-2xl font-bold" style={{ color: accent }}>{name}</h1>
          {address && <p className="text-[11px] text-zinc-500">{address}</p>}
          {contact && <p className="text-[11px] text-zinc-500">{contact}</p>}
          {taxLine && <p className="text-[11px] text-zinc-500">{taxLine}</p>}
          <div className="mx-auto mt-3 inline-block rounded-full px-4 py-1 text-sm font-bold tracking-widest" style={{ backgroundColor: accent, color: onAccent }}>{label}</div>
        </div>
      );
    }
    // modern (default) — coloured header band
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl px-5 py-4" style={{ backgroundColor: accent, color: onAccent }}>
        <div className="flex items-center gap-3">
          {logo && <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/95 p-1"><img src={logo} alt="" className="h-full w-full object-contain" /></div>}
          <div>
            <h1 className="text-xl font-bold">{name}</h1>
            <p className="text-[11px] opacity-80">{address}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-widest">{label}</p>
          <p className="text-[11px] opacity-80">#{invoice.invoice_number || '—'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="a4-invoice mx-auto w-[210mm] max-w-full bg-white p-8 text-zinc-900" style={{ minHeight: '297mm' }}>
      <Header />

      {/* Meta row */}
      <div className="mb-5 grid grid-cols-2 gap-4 text-[11px]">
        <div>
          <p className="font-bold uppercase tracking-wide text-zinc-400">{type === 'purchase' ? 'Supplier' : 'Billed To'}</p>
          <p className="mt-0.5 font-semibold">{invoice.customer_name || invoice.supplier_name || 'Walk-in Customer'}</p>
          {(tpl.template !== 'modern') && contact && <p className="text-zinc-500">{contact}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-bold text-zinc-400">Date: </span>{invoice.sale_date ? new Date(invoice.sale_date).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          {invoice.cashier_name && <p><span className="font-bold text-zinc-400">By: </span>{invoice.cashier_name}</p>}
          {invoice.payment_method && <p><span className="font-bold text-zinc-400">Payment: </span>{invoice.payment_method}</p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr style={{ backgroundColor: accent, color: onAccent }}>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-center">Qty</th>
            <th className="px-3 py-2 text-right">Unit Price</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
              <td className="px-3 py-2">{it.medicine_name || it.name || `Item ${i + 1}`}</td>
              <td className="px-3 py-2 text-center font-semibold">{it.quantity}</td>
              <td className="px-3 py-2 text-right">{money(it.unit_price)}</td>
              <td className="px-3 py-2 text-right">{money(it.total ?? (it.unit_price * it.quantity))}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-400">No items</td></tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{money(invoice.subtotal ?? invoice.total_amount)}</span></div>
          {(invoice.discount_amount ?? 0) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{money(invoice.discount_amount)}</span></div>}
          {(invoice.tax_amount ?? 0) > 0 && <div className="flex justify-between"><span className="text-zinc-500">Tax</span><span>{money(invoice.tax_amount)}</span></div>}
          {(invoice.adjustment_amount ?? 0) !== 0 && <div className="flex justify-between text-orange-700"><span>Adjustment</span><span>{money(invoice.adjustment_amount)}</span></div>}
          <div className="mt-1 flex justify-between rounded-md px-2 py-1.5 text-sm font-bold" style={{ backgroundColor: accent, color: onAccent }}>
            <span>Grand Total</span><span>{money(invoice.total_amount)}</span>
          </div>
          {invoice.amount_paid != null && <div className="flex justify-between pt-1"><span className="text-zinc-500">Paid</span><span>{money(invoice.amount_paid)}</span></div>}
          {invoice.change_due != null && invoice.change_due > 0 && <div className="flex justify-between text-blue-700"><span>Change</span><span>{money(invoice.change_due)}</span></div>}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 border-t border-zinc-200 pt-4 text-center text-[10px] text-zinc-400">
        {taxLine && tpl.template === 'modern' && <p>{taxLine}</p>}
        <p>Thank you for your business · Powered by Pharvix</p>
      </div>
    </div>
  );
}
