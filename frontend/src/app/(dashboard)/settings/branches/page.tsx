"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function BranchSettingsPage() {
  const [form, setForm] = useState({ default_branch_id: '', allow_inter_branch_transfer: false, require_branch_login: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { branch_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Branch Settings</h2>
      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default Branch ID</label>
          <input type="text" value={form.default_branch_id} onChange={(e) => setForm({ ...form, default_branch_id: e.target.value })} placeholder="e.g. branch-uuid" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        {[
          { name: 'allow_inter_branch_transfer', label: 'Allow Inter-Branch Stock Transfer', desc: 'Move stock between branches' },
          { name: 'require_branch_login', label: 'Require Branch-Level Login', desc: 'Users must be assigned to a branch' },
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
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Branch Settings'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
