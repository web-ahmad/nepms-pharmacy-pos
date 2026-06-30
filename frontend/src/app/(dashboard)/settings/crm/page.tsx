"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function CRMSettingsPage() {
  const [form, setForm] = useState({ enable_loyalty: true, points_per_currency_unit: 1, min_redemption_points: 100, enable_credit_limit: true, default_credit_limit: 5000 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { crm_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">CRM Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Enable Loyalty Points</p>
            <p className="text-xs text-zinc-500">Award customers points on each purchase</p>
          </div>
          <input type="checkbox" checked={form.enable_loyalty} onChange={(e) => setForm({ ...form, enable_loyalty: e.target.checked })} className="h-4 w-4" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Points per Currency Unit</label>
            <input type="number" min={0} value={form.points_per_currency_unit} onChange={(e) => setForm({ ...form, points_per_currency_unit: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Min Redemption Points</label>
            <input type="number" min={0} value={form.min_redemption_points} onChange={(e) => setForm({ ...form, min_redemption_points: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Enable Credit Limit</p>
            <p className="text-xs text-zinc-500">Enforce a credit ceiling per customer</p>
          </div>
          <input type="checkbox" checked={form.enable_credit_limit} onChange={(e) => setForm({ ...form, enable_credit_limit: e.target.checked })} className="h-4 w-4" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default Credit Limit</label>
          <input type="number" min={0} value={form.default_credit_limit} onChange={(e) => setForm({ ...form, default_credit_limit: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save CRM Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
