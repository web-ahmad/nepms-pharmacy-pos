"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultCrm = {
  enable_loyalty: true,
  points_per_currency_unit: 1,
  min_redemption_points: 100,
  enable_credit_limit: true,
  default_credit_limit: 5000,
};

export default function CRMSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultCrm);

  useEffect(() => {
    if (data?.crm_settings) {
      setForm({ ...defaultCrm, ...data.crm_settings });
    }
  }, [data?.crm_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultCrm, ...(data?.crm_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ crm_settings: form });
      toast.success('CRM settings saved');
    } catch {
      toast.error('Failed to save CRM settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={Heart} title="CRM & Loyalty" description="Loyalty points and customer credit rules." />

      <SettingsCard delay={0.05} accent="amber">
        <SettingsToggleRow
          label="Enable Loyalty Points"
          description="Award customers points on each purchase"
          checked={form.enable_loyalty}
          onChange={(v) => setForm({ ...form, enable_loyalty: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="Points per Currency Unit">
            <SettingsInput type="number" min={0} value={form.points_per_currency_unit} onChange={(e) => setForm({ ...form, points_per_currency_unit: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Min Redemption Points">
            <SettingsInput type="number" min={0} value={form.min_redemption_points} onChange={(e) => setForm({ ...form, min_redemption_points: Number(e.target.value) })} />
          </SettingsField>
        </div>

        <SettingsToggleRow
          label="Enable Credit Limit"
          description="Enforce a credit ceiling per customer"
          checked={form.enable_credit_limit}
          onChange={(v) => setForm({ ...form, enable_credit_limit: v })}
        />
        <SettingsField label="Default Credit Limit">
          <SettingsInput type="number" min={0} value={form.default_credit_limit} onChange={(e) => setForm({ ...form, default_credit_limit: Number(e.target.value) })} />
        </SettingsField>

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
