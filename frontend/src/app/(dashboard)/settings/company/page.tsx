"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

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
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultCompany);

  useEffect(() => {
    if (data?.company_settings) {
      setForm({ ...defaultCompany, ...data.company_settings });
    }
  }, [data?.company_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultCompany, ...(data?.company_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ company_settings: form });
      toast.success('Company settings saved');
    } catch {
      toast.error('Failed to save company settings');
    }
  };

  const Field = ({ label, name, type = 'text' }: { label: string; name: keyof typeof defaultCompany; type?: string }) => (
    <SettingsField label={label}>
      <SettingsInput type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
    </SettingsField>
  );

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader
        icon={Building2}
        title="Company & Branch"
        description="Business identity shown on invoices, receipts, and reports."
      />

      <SettingsCard delay={0.05} accent="emerald">
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

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
