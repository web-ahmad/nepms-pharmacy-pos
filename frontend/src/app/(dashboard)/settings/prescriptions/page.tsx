"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Stethoscope } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput, SettingsSelect,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultPrescription = {
  require_prescription_for_controlled: true,
  prescription_expiry_days: 30,
  enable_ocr_auto_fill: false,
  ocr_provider: 'Google Vision',
};

export default function PrescriptionSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultPrescription);

  useEffect(() => {
    if (data?.prescription_settings) {
      setForm({ ...defaultPrescription, ...data.prescription_settings });
    }
  }, [data?.prescription_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultPrescription, ...(data?.prescription_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ prescription_settings: form });
      toast.success('Prescription settings saved');
    } catch {
      toast.error('Failed to save prescription settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={Stethoscope} title="Prescriptions" description="Rx enforcement, validity window, and OCR auto-fill." />

      <SettingsCard delay={0.05} accent="amber">
        <SettingsToggleRow
          label="Require Rx for Controlled Drugs"
          description="Block sale of Schedule I-III drugs without a valid prescription"
          checked={form.require_prescription_for_controlled}
          onChange={(v) => setForm({ ...form, require_prescription_for_controlled: v })}
        />
        <SettingsField label="Prescription Validity (days)">
          <SettingsInput type="number" min={1} max={365} value={form.prescription_expiry_days} onChange={(e) => setForm({ ...form, prescription_expiry_days: Number(e.target.value) })} />
        </SettingsField>
        <SettingsToggleRow
          label="Enable OCR Auto-Fill"
          description="AI reads prescriptions and auto-fills POS items (Phase 4)"
          checked={form.enable_ocr_auto_fill}
          onChange={(v) => setForm({ ...form, enable_ocr_auto_fill: v })}
        />
        <SettingsField label="OCR Provider">
          <SettingsSelect value={form.ocr_provider} onChange={(e) => setForm({ ...form, ocr_provider: e.target.value })}>
            <option>Google Vision</option>
            <option>AWS Textract</option>
            <option>Azure Computer Vision</option>
          </SettingsSelect>
        </SettingsField>

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
