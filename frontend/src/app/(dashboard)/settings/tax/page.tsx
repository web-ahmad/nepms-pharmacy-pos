'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Percent, Receipt, Info, CheckCircle2, AlertTriangle, Calculator,
  Landmark, ScanLine, BadgeCheck,
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';
import {
  DEFAULT_TAX_POLICY, normalisePolicy, effectiveTaxRate, taxLabelFor, splitTax,
  type TaxPolicy,
} from '@/features/pos/hooks/useApplyTaxSettings';

const PRESETS: { label: string; note: string; patch: Partial<TaxPolicy> }[] = [
  {
    label: 'Standard 18%',
    note: 'Taxable retail supplies',
    patch: { enable_sales_tax: true, sales_tax_rate: 18, sales_tax_label: 'Sales Tax', prices_include_tax: true },
  },
  {
    label: 'Standard + Further Tax',
    note: '18% + 3% for unregistered buyers',
    patch: { enable_sales_tax: true, sales_tax_rate: 18, enable_further_tax: true, further_tax_rate: 3, prices_include_tax: true },
  },
  {
    label: 'Reduced 1%',
    note: 'Certain pharmaceutical supplies',
    patch: { enable_sales_tax: true, sales_tax_rate: 1, sales_tax_label: 'Sales Tax', prices_include_tax: true },
  },
  {
    label: 'Exempt',
    note: 'Sixth Schedule — no output tax',
    patch: { enable_sales_tax: false, enable_further_tax: false },
  },
];

const rs = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TaxSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<TaxPolicy>(DEFAULT_TAX_POLICY);

  const saved = useMemo(() => normalisePolicy((data as any)?.tax_settings), [data]);
  useEffect(() => { setForm(saved); }, [saved]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);
  const rateUnreg = effectiveTaxRate(form, false);
  const rateReg = effectiveTaxRate(form, true);
  const label = taxLabelFor(form, false);

  const set = (patch: Partial<TaxPolicy>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (rateUnreg > 100) { toast.error('Combined rate cannot exceed 100%.'); return; }
    if (form.enable_sales_tax && !(Number(form.sales_tax_rate) > 0)) {
      toast.error('Sales tax is enabled but the rate is 0% — set a rate or mark supplies exempt.');
      return;
    }
    if (form.enable_further_tax && !form.enable_sales_tax) {
      toast.error('Further Tax only applies alongside sales tax. Enable sales tax first.');
      return;
    }
    if (form.enable_further_tax && !(Number(form.further_tax_rate) > 0)) {
      toast.error('Further Tax is enabled but the rate is 0%.');
      return;
    }
    if (form.fbr_pos_enabled && !form.fbr_pos_registration_no.trim()) {
      toast.error('FBR POS integration needs your POS registration number.');
      return;
    }
    try {
      await updateSettings.mutateAsync({ tax_settings: form } as any);
      toast.success(rateUnreg > 0
        ? `Saved — POS now applies ${label} at ${rateUnreg}%`
        : 'Saved — supplies marked exempt, POS charges no output tax');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save tax settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="max-w-5xl space-y-6">
      <SettingsPageHeader
        icon={Percent}
        title="Tax — FBR (Pakistan)"
        description="Sales Tax Act, 1990. Configure output tax, Further Tax and registration details used on every invoice."
      />

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 rounded-2xl border p-4 ${
          rateUnreg > 0
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20'
            : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40'
        }`}
      >
        {rateUnreg > 0
          ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
          : <Info size={18} className="mt-0.5 shrink-0 text-zinc-400" />}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${rateUnreg > 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {rateUnreg > 0
              ? `POS applies ${label} — ${rateUnreg}% to unregistered buyers, ${rateReg}% to registered`
              : 'Supplies are exempt — POS charges no output tax'}
          </p>
          <p className={`mt-0.5 text-xs ${rateUnreg > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-500'}`}>
            {form.prices_include_tax
              ? 'Prices are treated as MRP (tax-inclusive) — tax is extracted from the price, not added on top.'
              : 'Tax is added on top of the listed price.'}
            {isDirty && ' · Unsaved changes shown in the preview.'}
          </p>
        </div>
      </motion.div>

      {/* Rate-accuracy caveat — honest, not decorative */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Rates change with each Finance Act and SRO. The presets reflect commonly applied
          figures — confirm the current rate for your supply category with FBR or your tax
          advisor before going live. Every value here is editable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          {/* Presets */}
          <SettingsCard delay={0.03} accent="emerald">
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Common configurations</p>
              <p className="mb-3 text-xs text-zinc-400">Apply one, then adjust below.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRESETS.map((p) => (
                  <motion.button
                    key={p.label}
                    whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                    onClick={() => set(p.patch)}
                    className="rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:hover:bg-emerald-900/20"
                  >
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{p.label}</p>
                    <p className="text-[11px] text-zinc-400">{p.note}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </SettingsCard>

          {/* Output sales tax */}
          <SettingsCard delay={0.06} accent="blue">
            <SettingsToggleRow
              label="Charge Sales Tax"
              description="Output tax on taxable supplies. Leave off if your supplies are exempt (Sixth Schedule)."
              checked={form.enable_sales_tax}
              onChange={(v) => set({ enable_sales_tax: v })}
            />
            <AnimatePresence initial={false}>
              {form.enable_sales_tax && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <SettingsField label="Label on invoice">
                      <SettingsInput type="text" value={form.sales_tax_label} placeholder="Sales Tax"
                        onChange={(e) => set({ sales_tax_label: e.target.value })} />
                    </SettingsField>
                    <SettingsField label="Rate %">
                      <SettingsInput type="number" min={0} max={100} step="0.01" value={form.sales_tax_rate}
                        onChange={(e) => set({ sales_tax_rate: Number(e.target.value) })} />
                    </SettingsField>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SettingsCard>

          {/* Further Tax */}
          <SettingsCard delay={0.09} accent="violet">
            <SettingsToggleRow
              label="Further Tax — unregistered buyers"
              description="Section 3(1A): extra tax when the buyer has no STRN on file. Registered buyers are exempt from it."
              checked={form.enable_further_tax}
              onChange={(v) => set({ enable_further_tax: v })}
            />
            <AnimatePresence initial={false}>
              {form.enable_further_tax && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <SettingsField label="Further Tax %">
                      <SettingsInput type="number" min={0} max={100} step="0.01" value={form.further_tax_rate}
                        onChange={(e) => set({ further_tax_rate: Number(e.target.value) })} />
                    </SettingsField>
                  </div>
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    Record a customer&apos;s STRN on their profile to treat them as registered — POS then drops Further Tax for that sale.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </SettingsCard>

          {/* Pricing basis */}
          <SettingsCard delay={0.12} accent="amber">
            <SettingsToggleRow
              label="Prices include tax (MRP)"
              description="Medicines are sold at printed MRP, which already contains the tax. Tax is extracted from the price instead of being added."
              checked={form.prices_include_tax}
              onChange={(v) => set({ prices_include_tax: v })}
            />
          </SettingsCard>

          {/* Registration */}
          <SettingsCard delay={0.15} accent="red">
            <div className="flex items-center gap-2">
              <Landmark size={15} className="text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Registration</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingsField label="NTN">
                <SettingsInput type="text" value={form.ntn} placeholder="0000000-0"
                  onChange={(e) => set({ ntn: e.target.value })} />
              </SettingsField>
              <SettingsField label="STRN">
                <SettingsInput type="text" value={form.strn} placeholder="00-00-0000-000-00"
                  onChange={(e) => set({ strn: e.target.value })} />
              </SettingsField>
            </div>
            <p className="text-xs text-zinc-400">Both are printed on invoices and receipts.</p>
          </SettingsCard>

          {/* FBR POS integration */}
          <SettingsCard delay={0.18} accent="emerald">
            <SettingsToggleRow
              label="FBR POS integration"
              description="Tier-1 retailers must report invoices to FBR in real time and print the FBR invoice number and QR code."
              checked={form.fbr_pos_enabled}
              onChange={(v) => set({ fbr_pos_enabled: v })}
            />
            <AnimatePresence initial={false}>
              {form.fbr_pos_enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <SettingsField label="FBR POS Registration Number">
                      <SettingsInput type="text" value={form.fbr_pos_registration_no} placeholder="e.g. 123456"
                        onChange={(e) => set({ fbr_pos_registration_no: e.target.value })} />
                    </SettingsField>
                  </div>
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Storing the number prints it on receipts. Live invoice transmission to
                    FBR&apos;s IMS endpoint is <b>not</b> implemented yet — that needs your
                    sandbox/production token from FBR.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
          </SettingsCard>
        </div>

        <TaxPreview policy={form} />
      </div>
    </div>
  );
}

/* ── Live invoice preview ─────────────────────────────────────────────── */
function TaxPreview({ policy }: { policy: TaxPolicy }) {
  const [base, setBase] = useState(1000);
  const [registered, setRegistered] = useState(false);

  const rate = effectiveTaxRate(policy, registered);
  const label = taxLabelFor(policy, registered);
  const { net, tax, total } = splitTax(base, rate, policy.prices_include_tax);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="h-fit lg:sticky lg:top-6"
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Receipt size={15} className="text-zinc-400" />
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Invoice preview</p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {policy.prices_include_tax ? 'MRP charged to customer' : 'Price before tax'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Rs</span>
              <input
                type="number" min={0} value={base}
                onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Buyer type toggle — shows the Further Tax difference */}
          <button
            onClick={() => setRegistered((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              registered
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            <BadgeCheck size={14} className="shrink-0" />
            <span className="flex-1 font-semibold">
              {registered ? 'Registered buyer (has STRN)' : 'Unregistered buyer'}
            </span>
            <span className="text-[10px] text-zinc-400">tap to switch</span>
          </button>

          <div className="space-y-2 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span>{policy.prices_include_tax ? 'Value excl. tax' : 'Subtotal'}</span>
              <span className="font-medium">{rs(net)}</span>
            </div>
            <AnimatePresence initial={false}>
              {rate > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between overflow-hidden text-zinc-600 dark:text-zinc-300"
                >
                  <span className="pr-2">{label} ({rate}%)</span>
                  <motion.span key={tax} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="whitespace-nowrap font-medium">
                    {rs(tax)}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between border-t border-dashed border-zinc-300 pt-2 dark:border-zinc-700">
              <span className="font-bold text-zinc-800 dark:text-zinc-100">Total payable</span>
              <motion.span key={total} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {rs(total)}
              </motion.span>
            </div>
          </div>

          {(policy.ntn || policy.strn || policy.fbr_pos_enabled) && (
            <div className="space-y-1 rounded-lg border border-dashed border-zinc-200 p-2.5 text-[10px] text-zinc-500 dark:border-zinc-700">
              {policy.ntn && <p>NTN: <span className="font-mono">{policy.ntn}</span></p>}
              {policy.strn && <p>STRN: <span className="font-mono">{policy.strn}</span></p>}
              {policy.fbr_pos_enabled && (
                <p className="flex items-center gap-1"><ScanLine size={11} /> FBR POS #{policy.fbr_pos_registration_no || '—'}</p>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 text-[11px] text-zinc-400">
            <Calculator size={12} className="mt-0.5 shrink-0" />
            {policy.prices_include_tax
              ? 'Tax is extracted from the MRP after discounts — the customer pays the printed price.'
              : 'Tax is added after discounts, exactly as the POS calculates it.'}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
