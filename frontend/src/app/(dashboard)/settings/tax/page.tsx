"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function TaxSettingsPage() {
  const [form, setForm] = useState({
    default_vat_percent: 0,
    enable_vat: false,
    vat_label: 'VAT',
    enable_gst: false,
    gst_percent: 0,
    tax_number: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { tax_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tax Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">

        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">Enable VAT</p>
            <p className="text-xs text-zinc-500">Apply Value Added Tax to invoices and POS</p>
          </div>
          <input type="checkbox" checked={form.enable_vat} onChange={(e) => setForm({ ...form, enable_vat: e.target.checked })} className="h-4 w-4" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">VAT Label</label>
            <input type="text" value={form.vat_label} onChange={(e) => setForm({ ...form, vat_label: e.target.value })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default VAT %</label>
            <input type="number" min={0} max={100} value={form.default_vat_percent} onChange={(e) => setForm({ ...form, default_vat_percent: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">Enable GST</p>
            <p className="text-xs text-zinc-500">Apply Goods and Services Tax</p>
          </div>
          <input type="checkbox" checked={form.enable_gst} onChange={(e) => setForm({ ...form, enable_gst: e.target.checked })} className="h-4 w-4" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">GST %</label>
          <input type="number" min={0} max={100} value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tax Registration Number</label>
          <input type="text" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Tax Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
