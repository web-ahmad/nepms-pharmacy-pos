"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function PrescriptionSettingsPage() {
  const [form, setForm] = useState({
    require_prescription_for_controlled: true,
    prescription_expiry_days: 30,
    enable_ocr_auto_fill: false,
    ocr_provider: 'Google Vision',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { prescription_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Prescription Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Require Rx for Controlled Drugs</p>
            <p className="text-xs text-zinc-500">Block sale of Schedule I-III drugs without a valid prescription</p>
          </div>
          <input type="checkbox" checked={form.require_prescription_for_controlled} onChange={(e) => setForm({ ...form, require_prescription_for_controlled: e.target.checked })} className="h-4 w-4" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Prescription Validity (days)</label>
          <input type="number" min={1} max={365} value={form.prescription_expiry_days} onChange={(e) => setForm({ ...form, prescription_expiry_days: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Enable OCR Auto-Fill</p>
            <p className="text-xs text-zinc-500">AI reads prescriptions and auto-fills POS items (Phase 4)</p>
          </div>
          <input type="checkbox" checked={form.enable_ocr_auto_fill} onChange={(e) => setForm({ ...form, enable_ocr_auto_fill: e.target.checked })} className="h-4 w-4" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">OCR Provider</label>
          <select value={form.ocr_provider} onChange={(e) => setForm({ ...form, ocr_provider: e.target.value })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option>Google Vision</option>
            <option>AWS Textract</option>
            <option>Azure Computer Vision</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Prescription Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
