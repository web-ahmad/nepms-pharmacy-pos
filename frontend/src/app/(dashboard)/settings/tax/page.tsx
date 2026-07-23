"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Percent } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultTax = {
  default_vat_percent: 0,
  enable_vat: false,
  vat_label: 'VAT',
  enable_gst: false,
  gst_percent: 0,
  tax_number: '',
};

export default function TaxSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultTax);

  useEffect(() => {
    if (data?.tax_settings) {
      setForm({ ...defaultTax, ...data.tax_settings });
    }
  }, [data?.tax_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultTax, ...(data?.tax_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ tax_settings: form });
      toast.success('Tax settings saved');
    } catch {
      toast.error('Failed to save tax settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={Percent} title="Tax" description="VAT, GST, and tax registration used across invoices and POS." />

      <SettingsCard delay={0.05} accent="emerald">
        <SettingsToggleRow
          label="Enable VAT"
          description="Apply Value Added Tax to invoices and POS"
          checked={form.enable_vat}
          onChange={(v) => setForm({ ...form, enable_vat: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="VAT Label">
            <SettingsInput type="text" value={form.vat_label} onChange={(e) => setForm({ ...form, vat_label: e.target.value })} />
          </SettingsField>
          <SettingsField label="Default VAT %">
            <SettingsInput type="number" min={0} max={100} value={form.default_vat_percent} onChange={(e) => setForm({ ...form, default_vat_percent: Number(e.target.value) })} />
          </SettingsField>
        </div>

        <SettingsToggleRow
          label="Enable GST"
          description="Apply Goods and Services Tax"
          checked={form.enable_gst}
          onChange={(v) => setForm({ ...form, enable_gst: v })}
        />
        <SettingsField label="GST %">
          <SettingsInput type="number" min={0} max={100} value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: Number(e.target.value) })} />
        </SettingsField>

        <SettingsField label="Tax Registration Number">
          <SettingsInput type="text" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
        </SettingsField>

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
