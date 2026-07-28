"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MonitorSmartphone, Store, Monitor } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import {
  SettingsPageHeader, SettingsCard, SettingsField, SettingsInput, SettingsSelect,
  SettingsToggleRow, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

const defaultPos = {
  workflow_mode: 'SINGLE_COUNTER',
  enable_barcode_scanner: true,
  default_payment_mode: 'Cash',
  allow_partial_payment: false,
  allow_credit_sale: true,
  enable_discounts: true,
  max_discount_percent: 20,
  enable_prescription_requirement: false,
  allow_hold_sale: true,
  show_expiry_warning: true,
};

export default function POSSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(defaultPos);

  useEffect(() => {
    if (data?.pos_settings) {
      setForm({ ...defaultPos, ...data.pos_settings });
    }
  }, [data?.pos_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultPos, ...(data?.pos_settings || {}) });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ pos_settings: form });
      toast.success('POS settings saved');
    } catch {
      toast.error('Failed to save POS settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={MonitorSmartphone} title="POS" description="Workflow mode, checkout behavior, discounts, and payment defaults." />

      {/* POS Workflow Mode (moved here from General) */}
      <SettingsCard icon={Store} title="POS Workflow Mode" description="Toggle between Single Counter (Instant) and Dual Counter (Cashier Portal)." delay={0.03} accent="blue">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-zinc-900 dark:text-white">Enable Cashier Portal (Dual Counter)</p>
            <p className="text-xs text-zinc-500 mt-0.5">Orders are sent to a dedicated Cashier for payment verification.</p>
          </div>
          <button
            onClick={() => setForm({ ...form, workflow_mode: form.workflow_mode === 'SINGLE_COUNTER' ? 'DUAL_COUNTER' : 'SINGLE_COUNTER' })}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              form.workflow_mode === 'DUAL_COUNTER' ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.workflow_mode === 'DUAL_COUNTER' ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
          {form.workflow_mode === 'DUAL_COUNTER' ? (
            <><Store size={16} className="text-blue-500" /><span>Currently set to <b>Dual Counter</b>. Order Takers cannot collect payments.</span></>
          ) : (
            <><Monitor size={16} className="text-zinc-500" /><span>Currently set to <b>Single Counter</b>. Order Takers collect payments instantly.</span></>
          )}
        </div>
      </SettingsCard>

      <SettingsCard delay={0.05} accent="violet">
        <SettingsToggleRow
          label="Enable Barcode Scanner"
          description="Allow scanning barcodes to add items"
          checked={form.enable_barcode_scanner}
          onChange={(v) => setForm({ ...form, enable_barcode_scanner: v })}
        />
        <SettingsToggleRow
          label="Allow Partial Payment"
          description="Customers can pay part of the total"
          checked={form.allow_partial_payment}
          onChange={(v) => setForm({ ...form, allow_partial_payment: v })}
        />
        <SettingsToggleRow
          label="Allow Credit Sale"
          description="Sell on credit to registered customers"
          checked={form.allow_credit_sale}
          onChange={(v) => setForm({ ...form, allow_credit_sale: v })}
        />
        <SettingsToggleRow
          label="Enable Discounts"
          description="Allow cashiers to apply manual discounts"
          checked={form.enable_discounts}
          onChange={(v) => setForm({ ...form, enable_discounts: v })}
        />
        <SettingsToggleRow
          label="Require Prescription"
          description="Block controlled items without Rx"
          checked={form.enable_prescription_requirement}
          onChange={(v) => setForm({ ...form, enable_prescription_requirement: v })}
        />
        <SettingsToggleRow
          label="Allow Hold Sale"
          description="Let cashiers park a sale and return later"
          checked={form.allow_hold_sale}
          onChange={(v) => setForm({ ...form, allow_hold_sale: v })}
        />
        <SettingsToggleRow
          label="Show Expiry Warning"
          description="Warn when adding near-expiry stock"
          checked={form.show_expiry_warning}
          onChange={(v) => setForm({ ...form, show_expiry_warning: v })}
        />

        <div className="grid grid-cols-2 gap-4 pt-1">
          <SettingsField label="Default Payment Mode">
            <SettingsSelect value={form.default_payment_mode} onChange={(e) => setForm({ ...form, default_payment_mode: e.target.value })}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </SettingsSelect>
          </SettingsField>
          <SettingsField label="Max Discount %">
            <SettingsInput type="number" min={0} max={100} value={form.max_discount_percent} onChange={(e) => setForm({ ...form, max_discount_percent: Number(e.target.value) })} />
          </SettingsField>
        </div>

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>
    </div>
  );
}
