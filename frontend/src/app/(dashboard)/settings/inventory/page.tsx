"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Boxes } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultInventory = {
  low_stock_threshold: 10,
  near_expiry_days: 30,
  enable_auto_reorder: false,
  default_markup_percent: 30,
  fifo_enabled: true,
  allow_negative_stock: false,
};

export default function InventorySettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultInventory);

  useEffect(() => {
    if (data?.inventory_settings) {
      setForm({ ...defaultInventory, ...data.inventory_settings });
    }
  }, [data?.inventory_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultInventory, ...(data?.inventory_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ inventory_settings: form });
      toast.success('Inventory settings saved');
    } catch {
      toast.error('Failed to save inventory settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={Boxes} title="Inventory" description="Stock alerts, costing method, and reorder behavior." />

      <SettingsCard delay={0.05} accent="violet">
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="Low Stock Threshold (units)">
            <SettingsInput type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Near Expiry Warning (days)">
            <SettingsInput type="number" min={1} value={form.near_expiry_days} onChange={(e) => setForm({ ...form, near_expiry_days: Number(e.target.value) })} />
          </SettingsField>
          <SettingsField label="Default Markup %">
            <SettingsInput type="number" min={0} value={form.default_markup_percent} onChange={(e) => setForm({ ...form, default_markup_percent: Number(e.target.value) })} />
          </SettingsField>
        </div>

        <SettingsToggleRow
          label="FIFO Costing Method"
          description="First-In First-Out for stock valuation"
          checked={form.fifo_enabled}
          onChange={(v) => setForm({ ...form, fifo_enabled: v })}
        />
        <SettingsToggleRow
          label="Auto-Reorder Alerts"
          description="Generate purchase requests when stock is low"
          checked={form.enable_auto_reorder}
          onChange={(v) => setForm({ ...form, enable_auto_reorder: v })}
        />
        <SettingsToggleRow
          label="Allow Negative Stock"
          description="Permit sales even if stock reaches zero"
          checked={form.allow_negative_stock}
          onChange={(v) => setForm({ ...form, allow_negative_stock: v })}
        />

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
