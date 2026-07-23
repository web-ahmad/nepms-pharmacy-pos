"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultHr = {
  default_work_hours_per_day: 8,
  enable_overtime: true,
  overtime_multiplier: 1.5,
  leave_approval_required: true,
  payroll_day: 25,
  default_leave_days_per_year: 21,
};

export default function HRSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultHr);

  useEffect(() => {
    if (data?.hr_settings) {
      setForm({ ...defaultHr, ...data.hr_settings });
    }
  }, [data?.hr_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultHr, ...(data?.hr_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ hr_settings: form });
      toast.success('HR settings saved');
    } catch {
      toast.error('Failed to save HR settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={Users2} title="HR & Payroll" description="Working hours, overtime, and leave rules." />

      <SettingsCard delay={0.05} accent="amber">
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="Work Hours / Day">
            <SettingsInput type="number" min={1} max={24} value={form.default_work_hours_per_day} onChange={(e) => setForm({ ...form, default_work_hours_per_day: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Payroll Processing Day">
            <SettingsInput type="number" min={1} max={28} value={form.payroll_day} onChange={(e) => setForm({ ...form, payroll_day: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Overtime Multiplier">
            <SettingsInput type="number" step={0.1} min={1} value={form.overtime_multiplier} onChange={(e) => setForm({ ...form, overtime_multiplier: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Default Annual Leave Days">
            <SettingsInput type="number" min={0} max={60} value={form.default_leave_days_per_year} onChange={(e) => setForm({ ...form, default_leave_days_per_year: Number(e.target.value) })} />
          </SettingsField>
        </div>

        <SettingsToggleRow
          label="Enable Overtime Tracking"
          description="Calculate and log overtime hours"
          checked={form.enable_overtime}
          onChange={(v) => setForm({ ...form, enable_overtime: v })}
        />
        <SettingsToggleRow
          label="Require Leave Approval"
          description="HR manager must approve all leave requests"
          checked={form.leave_approval_required}
          onChange={(v) => setForm({ ...form, leave_approval_required: v })}
        />

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
