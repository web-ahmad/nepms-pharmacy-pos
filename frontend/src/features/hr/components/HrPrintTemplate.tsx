'use client';
// Print letterhead for HR documents (payslip, payroll master sheet).
// Kept separate from GlobalPrintTemplate on purpose — that one is shared by
// expenses, audits and purchase returns, so its header must not change here.
//
// Layout: logo on the left · company name + details on the right ·
// a full-width filled title band · content below. No coloured page borders.

import React, { forwardRef } from 'react';
import { useCompanyIdentity, resolveAssetUrl } from '@/features/settings/services/settings.api';

interface HrPrintTemplateProps {
  children: React.ReactNode;
  /** Text inside the dark band, e.g. "Payslip" or "Payroll Master Sheet". */
  title: string;
  /** Shown small under the band, e.g. "July, 2026". */
  periodLabel?: string;
  /** Set false when the document renders its own signature block. */
  showSignatures?: boolean;
  signatureLabels?: string[];
  footerNote?: string;
}

export const HrPrintTemplate = forwardRef<HTMLDivElement, HrPrintTemplateProps>(
  ({
    children,
    title,
    periodLabel,
    showSignatures = true,
    signatureLabels = ['Employee Signature', 'Prepared By', 'Authorised Signature'],
    footerNote = 'This is a system-generated document and does not require a physical stamp.',
  }, ref) => {
    const { data: co } = useCompanyIdentity();

    const name = co?.name || 'Pharmacy';
    const logo = resolveAssetUrl(co?.logo_url);
    // Field names match Settings → Company exactly (address / city / country /
    // phone / email / website / tax_number / registration_number).
    const addressLines = [
      co?.address,
      [co?.city, co?.country].filter(Boolean).join(', '),
      [co?.phone && `Tel: ${co.phone}`, co?.email && `Email: ${co.email}`].filter(Boolean).join(' | '),
      [co?.tax_number && `NTN: ${co.tax_number}`, co?.registration_number && `Reg #: ${co.registration_number}`]
        .filter(Boolean).join(' | '),
      co?.website,
    ].filter(Boolean) as string[];

    return (
      <div
        ref={ref}
        className="print-template-root absolute left-[-9999px] top-[-9999px] min-h-[100vh] w-full bg-white font-sans text-black print:static print:z-[99999] print:block"
      >
        <div className="flex min-h-[100vh] flex-col p-10">
          {/* ── Header: logo left · company details right ─────────────── */}
          <div className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-5">
            <div className="flex items-center">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={name} className="max-h-20 max-w-[200px] object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-900 text-2xl font-black text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-right">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">{name}</h2>
              <div className="mt-1 space-y-0.5">
                {addressLines.map((line, i) => (
                  <p key={i} className="text-[10px] font-medium text-zinc-500">{line}</p>
                ))}
              </div>
            </div>
          </div>

          {/* ── Full-width filled title band ──────────────────────────── */}
          <div className="my-6">
            <div className="w-full rounded-md bg-zinc-900 px-6 py-3 text-center">
              <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-white">{title}</h1>
            </div>
            {periodLabel && (
              <p className="mt-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">{periodLabel}</p>
            )}
          </div>

          {/* ── Content ───────────────────────────────────────────────── */}
          <div className="print-table-wrapper w-full flex-1">{children}</div>

          {/* ── Signatures ────────────────────────────────────────────── */}
          {showSignatures && (
            <div className="mt-16 flex justify-between gap-10 pt-6">
              {signatureLabels.map((label) => (
                <div key={label} className="flex-1 text-center">
                  <div className="mx-auto w-full border-t border-zinc-400" />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          )}

          {footerNote && <p className="mt-6 text-center text-[9px] text-zinc-400">{footerNote}</p>}
        </div>
      </div>
    );
  },
);

HrPrintTemplate.displayName = 'HrPrintTemplate';
