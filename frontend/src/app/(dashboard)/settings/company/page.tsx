"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

const defaultCompany = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
  tax_number: '',
  registration_number: '',
  logo_url: '',
  website: '',
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState(defaultCompany);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings', { company_settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, name, type = 'text' }: { label: string; name: keyof typeof defaultCompany; type?: string }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Company Settings</h2>
      <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Company Name" name="name" />
          <Field label="Website" name="website" />
          <Field label="Phone" name="phone" />
          <Field label="Email" name="email" type="email" />
          <Field label="Tax Registration Number" name="tax_number" />
          <Field label="Company Registration #" name="registration_number" />
          <Field label="City" name="city" />
          <Field label="Country" name="country" />
        </div>
        <Field label="Full Address" name="address" />
        <Field label="Logo URL" name="logo_url" />
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
