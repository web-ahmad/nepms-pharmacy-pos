"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function POSSettingsPage() {
  const [form, setForm] = useState({
    enable_barcode_scanner: true,
    default_payment_mode: 'Cash',
    allow_partial_payment: false,
    allow_credit_sale: true,
    enable_discounts: true,
    max_discount_percent: 20,
    enable_prescription_requirement: false,
    allow_hold_sale: true,
    show_expiry_warning: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { pos_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ label, desc, name }: { label: string; desc?: string; name: keyof typeof form }) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        {desc && <p className="text-xs text-zinc-500">{desc}</p>}
      </div>
      <input type="checkbox" checked={form[name] as boolean} onChange={(e) => setForm({ ...form, [name]: e.target.checked })} className="h-4 w-4" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">POS Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-2">
        <Toggle label="Enable Barcode Scanner" desc="Allow scanning barcodes to add items" name="enable_barcode_scanner" />
        <Toggle label="Allow Partial Payment" desc="Customers can pay part of the total" name="allow_partial_payment" />
        <Toggle label="Allow Credit Sale" desc="Sell on credit to registered customers" name="allow_credit_sale" />
        <Toggle label="Enable Discounts" desc="Allow cashiers to apply manual discounts" name="enable_discounts" />
        <Toggle label="Require Prescription" desc="Block controlled items without Rx" name="enable_prescription_requirement" />
        <Toggle label="Allow Hold Sale" desc="Let cashiers park a sale and return later" name="allow_hold_sale" />
        <Toggle label="Show Expiry Warning" desc="Warn when adding near-expiry stock" name="show_expiry_warning" />

        <div className="pt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default Payment Mode</label>
            <select value={form.default_payment_mode} onChange={(e) => setForm({ ...form, default_payment_mode: e.target.value })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Max Discount %</label>
            <input type="number" min={0} max={100} value={form.max_discount_percent} onChange={(e) => setForm({ ...form, max_discount_percent: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save POS Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
