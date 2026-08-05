'use client';
// FBR (Pakistan) tax policy → POS cart.
//
// Structure follows the Sales Tax Act, 1990 as applied to retail:
//   • Sales Tax (GST)  — standard output tax on taxable supplies
//   • Further Tax      — s.3(1A): extra tax on supplies to buyers who are NOT
//                        sales-tax registered (no STRN on file)
//   • Exempt supplies  — Sixth Schedule; most registered drugs are exempt, so a
//                        pharmacy usually charges no output tax on medicines
//   • MRP pricing      — printed retail prices are tax-INCLUSIVE, so tax must be
//                        extracted from the price, not added on top
//
// RATES CHANGE WITH EVERY FINANCE ACT. The defaults below reflect the commonly
// applied standard rate; always confirm against the current Finance Act / SRO
// before going live. Every rate is editable in Settings → Tax.

import { useEffect } from 'react';
import { useSettings } from '@/features/settings/services/settings.api';
import { usePOSStore } from '../store/pos-store';

export interface TaxPolicy {
  /** Charge output sales tax at all. Off = exempt supplies only. */
  enable_sales_tax: boolean;
  sales_tax_label: string;
  sales_tax_rate: number;

  /** s.3(1A) Further Tax on supplies to unregistered buyers. */
  enable_further_tax: boolean;
  further_tax_rate: number;

  /** Printed MRP already contains the tax — extract rather than add. */
  prices_include_tax: boolean;

  /** Registration identifiers printed on every invoice. */
  ntn: string;
  strn: string;

  /** FBR POS integration (Tier-1 retailers). */
  fbr_pos_enabled: boolean;
  fbr_pos_registration_no: string;
}

export const DEFAULT_TAX_POLICY: TaxPolicy = {
  enable_sales_tax: false,
  sales_tax_label: 'Sales Tax',
  sales_tax_rate: 18,
  enable_further_tax: false,
  further_tax_rate: 3,
  prices_include_tax: true,   // pharmacy MRP is normally tax-inclusive
  ntn: '',
  strn: '',
  fbr_pos_enabled: false,
  fbr_pos_registration_no: '',
};

/** Legacy keys from the pre-FBR shape, so saved data still loads. */
export function normalisePolicy(raw: any): TaxPolicy {
  const p = { ...DEFAULT_TAX_POLICY, ...(raw || {}) };
  if (raw && p.enable_sales_tax === false && p.sales_tax_rate === DEFAULT_TAX_POLICY.sales_tax_rate) {
    // Migrate the old enable_gst / gst_percent / enable_vat pair if present.
    if (raw.enable_gst) { p.enable_sales_tax = true; p.sales_tax_rate = Number(raw.gst_percent) || p.sales_tax_rate; }
    else if (raw.enable_vat) { p.enable_sales_tax = true; p.sales_tax_rate = Number(raw.default_vat_percent) || p.sales_tax_rate; }
  }
  if (!p.strn && raw?.tax_number) p.strn = raw.tax_number;
  return p;
}

/**
 * Effective percentage applied to a sale.
 * `buyerRegistered` — true when the customer has an STRN on file. Further Tax
 * only applies to UNregistered buyers.
 */
export function effectiveTaxRate(p: Partial<TaxPolicy> | null | undefined, buyerRegistered = false): number {
  if (!p?.enable_sales_tax) return 0;
  const base = Math.max(0, Number(p.sales_tax_rate) || 0);
  const further = (p.enable_further_tax && !buyerRegistered)
    ? Math.max(0, Number(p.further_tax_rate) || 0)
    : 0;
  return base + further;
}

export function taxLabelFor(p: Partial<TaxPolicy> | null | undefined, buyerRegistered = false): string {
  if (!p?.enable_sales_tax) return 'Sales Tax';
  const label = p.sales_tax_label || 'Sales Tax';
  const withFurther = p.enable_further_tax && !buyerRegistered;
  return withFurther ? `${label} + Further Tax` : label;
}

/**
 * Splits an amount into net + tax.
 * Inclusive (MRP): tax = amount × r / (100 + r)  — extracted from the price.
 * Exclusive:       tax = amount × r / 100        — added on top.
 */
export function splitTax(amount: number, ratePercent: number, inclusive: boolean) {
  const r = Math.max(0, ratePercent || 0);
  const gross = Math.max(0, amount || 0);
  if (r === 0) return { net: gross, tax: 0, total: gross };
  if (inclusive) {
    const tax = gross * r / (100 + r);
    return { net: gross - tax, tax, total: gross };
  }
  const tax = gross * r / 100;
  return { net: gross, tax, total: gross + tax };
}

export function useTaxPolicy(): TaxPolicy {
  const { data } = useSettings();
  return normalisePolicy((data as any)?.tax_settings);
}

/** Mount inside the POS so every sale uses the configured FBR policy. */
export function useApplyTaxSettings(buyerRegistered = false) {
  const policy = useTaxPolicy();
  const setTaxRate = usePOSStore((s) => s.setTaxRate);
  const setTaxLabel = usePOSStore((s) => s.setTaxLabel);
  const setTaxInclusive = usePOSStore((s) => s.setTaxInclusive);

  const rate = effectiveTaxRate(policy, buyerRegistered);
  const label = taxLabelFor(policy, buyerRegistered);
  const inclusive = !!policy.prices_include_tax;

  useEffect(() => {
    setTaxRate(rate);
    setTaxLabel(label);
    setTaxInclusive(inclusive);
  }, [rate, label, inclusive, setTaxRate, setTaxLabel, setTaxInclusive]);

  return { policy, rate, label, inclusive };
}
