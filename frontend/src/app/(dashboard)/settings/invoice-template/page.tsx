"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileText, Check, Image as ImageIcon, Printer, Monitor, Save, Loader2 } from 'lucide-react';
import {
  useSettings, useUpdateSettings, DEFAULT_INVOICE_TEMPLATE, InvoiceTemplateConfig, InvoiceTemplateStyle,
} from '@/features/settings/services/settings.api';
import { SettingsPageHeader, SettingsSkeleton, SettingsToggleRow } from '@/features/settings/components/SettingsUI';
import A4Invoice from '@/components/invoice/A4Invoice';

const TEMPLATES: { id: InvoiceTemplateStyle; label: string; blurb: string }[] = [
  { id: 'modern',  label: 'Modern',  blurb: 'Coloured header band with logo & totals highlight' },
  { id: 'classic', label: 'Classic', blurb: 'Centered letterhead, formal & symmetrical' },
  { id: 'minimal', label: 'Minimal', blurb: 'Clean single-line header, lots of whitespace' },
];

const COLORS = ['#1e293b', '#2563eb', '#059669', '#7c3aed', '#e11d48', '#d97706', '#0891b2', '#0f172a'];

const DUMMY = {
  invoice_number: 'INV-000123',
  sale_date: new Date().toISOString(),
  cashier_name: 'Irfan Saghir',
  customer_name: 'Walk-in Customer',
  payment_method: 'Cash',
  items: [
    { medicine_name: 'Panadol 500mg', quantity: 2, unit_price: 150, total: 300 },
    { medicine_name: 'Brufen Syrup 120ml', quantity: 1, unit_price: 220, total: 220 },
    { medicine_name: 'Augmentin 625mg', quantity: 1, unit_price: 480, total: 480 },
  ],
  subtotal: 1000, discount_amount: 50, tax_amount: 40, adjustment_amount: 0,
  total_amount: 990, amount_paid: 1000, change_due: 10,
};

export default function InvoiceTemplatePage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_TEMPLATE);

  useEffect(() => {
    if (data) setForm({ ...DEFAULT_INVOICE_TEMPLATE, ...((data.invoice_settings as Partial<InvoiceTemplateConfig>) || {}) });
  }, [data]);

  const saved = { ...DEFAULT_INVOICE_TEMPLATE, ...((data?.invoice_settings as Partial<InvoiceTemplateConfig>) || {}) };
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ invoice_settings: form });
      toast.success('Invoice template saved');
    } catch {
      toast.error('Failed to save template');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={FileText}
        title="Invoice Template"
        description="Design how printed documents look. Applies to POS invoices, purchase invoices and report printouts."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Template style */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Template Style</h3>
            <div className="space-y-2.5">
              {TEMPLATES.map((t) => {
                const active = form.template === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, template: t.id })}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      active ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-300'}`}>
                      {active && <Check size={13} />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.label}</span>
                      <span className="block text-xs text-zinc-500">{t.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header colour */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Header / Accent Colour</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, header_color: c })}
                  className={`h-9 w-9 rounded-lg transition-transform hover:scale-105 ${form.header_color === c ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-950' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700" title="Custom colour">
                <input type="color" value={form.header_color} onChange={(e) => setForm({ ...form, header_color: e.target.value })} className="h-10 w-10 cursor-pointer border-0 bg-transparent p-0" />
              </label>
            </div>
          </div>

          {/* Options */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-2 text-sm font-bold text-zinc-800 dark:text-zinc-200">Options</h3>
            <SettingsToggleRow
              label="Show Company Logo"
              description="Display the uploaded logo on documents"
              checked={form.show_logo}
              onChange={(v) => setForm({ ...form, show_logo: v })}
            />
            <div className="pt-3">
              <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">POS Invoice Paper</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, pos_paper: 'thermal' })}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${form.pos_paper === 'thermal' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-zinc-200 text-zinc-500 dark:border-zinc-800'}`}
                >
                  <Printer size={15} /> Thermal (80mm)
                </button>
                <button
                  onClick={() => setForm({ ...form, pos_paper: 'a4' })}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${form.pos_paper === 'a4' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-zinc-200 text-zinc-500 dark:border-zinc-800'}`}
                >
                  <Monitor size={15} /> A4 Invoice
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || updateSettings.isPending}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-all ${isDirty && !updateSettings.isPending ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-zinc-300 dark:bg-zinc-700'}`}
          >
            {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {updateSettings.isPending ? 'Saving…' : isDirty ? 'Save Template' : 'Saved'}
          </button>
        </div>

        {/* ── Live preview ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            <ImageIcon size={15} /> Live Preview <span className="text-xs font-normal text-zinc-400">(A4)</span>
          </div>
          <div className="overflow-auto rounded-lg bg-white shadow-inner">
            <motion.div key={form.template + form.header_color} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="origin-top scale-[0.62] sm:scale-75">
              <A4Invoice invoice={DUMMY} template={form} type="sale" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
