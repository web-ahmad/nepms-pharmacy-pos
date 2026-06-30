"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function HRSettingsPage() {
  const [form, setForm] = useState({
    default_work_hours_per_day: 8,
    enable_overtime: true,
    overtime_multiplier: 1.5,
    leave_approval_required: true,
    payroll_day: 25,
    default_leave_days_per_year: 21,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { hr_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">HR Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Work Hours / Day</label>
            <input type="number" min={1} max={24} value={form.default_work_hours_per_day} onChange={(e) => setForm({ ...form, default_work_hours_per_day: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Payroll Processing Day</label>
            <input type="number" min={1} max={28} value={form.payroll_day} onChange={(e) => setForm({ ...form, payroll_day: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Overtime Multiplier</label>
            <input type="number" step={0.1} min={1} value={form.overtime_multiplier} onChange={(e) => setForm({ ...form, overtime_multiplier: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default Annual Leave Days</label>
            <input type="number" min={0} max={60} value={form.default_leave_days_per_year} onChange={(e) => setForm({ ...form, default_leave_days_per_year: Number(e.target.value) })} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>
        {[
          { name: 'enable_overtime', label: 'Enable Overtime Tracking', desc: 'Calculate and log overtime hours' },
          { name: 'leave_approval_required', label: 'Require Leave Approval', desc: 'HR manager must approve all leave requests' },
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
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save HR Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
