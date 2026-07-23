"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GitBranch } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultBranch = {
  default_branch_id: '',
  allow_inter_branch_transfer: false,
  require_branch_login: true,
};

export default function BranchSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultBranch);

  useEffect(() => {
    if (data?.branch_settings) {
      setForm({ ...defaultBranch, ...data.branch_settings });
    }
  }, [data?.branch_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultBranch, ...(data?.branch_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ branch_settings: form });
      toast.success('Branch settings saved');
    } catch {
      toast.error('Failed to save branch settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={GitBranch} title="Branches" description="Default branch behavior and cross-branch permissions." />

      <SettingsCard delay={0.05} accent="violet">
        <SettingsField label="Default Branch ID">
          <SettingsInput
            type="text"
            value={form.default_branch_id}
            onChange={(e) => setForm({ ...form, default_branch_id: e.target.value })}
            placeholder="e.g. branch-uuid"
          />
        </SettingsField>

        <SettingsToggleRow
          label="Allow Inter-Branch Stock Transfer"
          description="Move stock between branches"
          checked={form.allow_inter_branch_transfer}
          onChange={(v) => setForm({ ...form, allow_inter_branch_transfer: v })}
        />
        <SettingsToggleRow
          label="Require Branch-Level Login"
          description="Users must be assigned to a branch"
          checked={form.require_branch_login}
          onChange={(v) => setForm({ ...form, require_branch_login: v })}
        />

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
