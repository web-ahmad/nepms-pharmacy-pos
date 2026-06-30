"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function InventorySettingsPage() {
  const [form, setForm] = useState({
    low_stock_threshold: 10,
    near_expiry_days: 30,
    enable_auto_reorder: false,
    default_markup_percent: 30,
    fifo_enabled: true,
    allow_negative_stock: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { inventory_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Inventory Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Low Stock Threshold (units)</label>
            <input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Near Expiry Warning (days)</label>
            <input type="number" min={1} value={form.near_expiry_days} onChange={(e) => setForm({ ...form, near_expiry_days: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default Markup %</label>
            <input type="number" min={0} value={form.default_markup_percent} onChange={(e) => setForm({ ...form, default_markup_percent: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        {[
          { name: 'fifo_enabled', label: 'FIFO Costing Method', desc: 'First-In First-Out for stock valuation' },
          { name: 'enable_auto_reorder', label: 'Auto-Reorder Alerts', desc: 'Generate purchase requests when stock is low' },
          { name: 'allow_negative_stock', label: 'Allow Negative Stock', desc: 'Permit sales even if stock reaches zero' },
        ].map(({ name, label, desc }) => (
          <div key={name} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <input type="checkbox" checked={form[name as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [name]: e.target.checked })} className="h-4 w-4" />
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Inventory Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
