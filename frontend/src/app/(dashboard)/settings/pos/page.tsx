"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MonitorSmartphone, Store, Monitor, CreditCard, Percent, ScanLine, ClipboardList,
  CalendarClock, ShieldAlert, Wallet, Save, CheckCircle2, Loader2,
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import { SettingsPageHeader, SettingsSkeleton } from '@/features/settings/components/SettingsUI';

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

type Accent = 'blue' | 'emerald' | 'violet' | 'amber';
const ACCENT: Record<Accent, string> = {
  blue: 'from-blue-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
};

function Section({ title, subtitle, icon: Icon, accent, delay = 0, children }: {
  title: string; subtitle: string; icon: any; accent: Accent; delay?: number; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className={`flex items-center gap-3 bg-gradient-to-r ${ACCENT[accent]} px-5 py-3.5`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Icon className="h-5 w-5 text-white" /></div>
        <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="text-xs text-white/80">{subtitle}</p></div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">{children}</div>
    </motion.section>
  );
}

function Toggle({ icon: Icon, label, desc, checked, onChange }: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${checked ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
      </div>
      <button
        type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
      >
        <motion.span layout className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" animate={{ left: checked ? 24 : 4 }} transition={{ type: 'spring', stiffness: 550, damping: 32 }} />
      </button>
    </div>
  );
}

export default function POSSettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultPos);

  useEffect(() => { if (data?.pos_settings) setForm({ ...defaultPos, ...data.pos_settings }); }, [data?.pos_settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify({ ...defaultPos, ...(data?.pos_settings || {}) });
  const set = (patch: Partial<typeof defaultPos>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ pos_settings: form });
      // Refresh the live POS terminal config immediately.
      queryClient.invalidateQueries({ queryKey: ['sales', 'pos-config'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'workflow-mode'] });
      toast.success('POS settings saved');
    } catch {
      toast.error('Failed to save POS settings');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <SettingsPageHeader icon={MonitorSmartphone} title="POS" description="These settings change how the POS terminal behaves for every cashier." />

      {/* Workflow mode */}
      <Section title="Workflow Mode" subtitle="Single vs Dual counter checkout" icon={Store} accent="blue" delay={0.03}>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Enable Cashier Portal (Dual Counter)</p>
              <p className="text-xs text-zinc-500 mt-0.5">Orders go to a dedicated cashier for payment verification.</p>
            </div>
            <button
              onClick={() => set({ workflow_mode: form.workflow_mode === 'SINGLE_COUNTER' ? 'DUAL_COUNTER' : 'SINGLE_COUNTER' })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${form.workflow_mode === 'DUAL_COUNTER' ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.workflow_mode === 'DUAL_COUNTER' ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {form.workflow_mode === 'DUAL_COUNTER'
              ? <><Store size={16} className="text-blue-500" /><span>Currently <b>Dual Counter</b> — order takers can't collect payments.</span></>
              : <><Monitor size={16} className="text-zinc-500" /><span>Currently <b>Single Counter</b> — order takers collect payments instantly.</span></>}
          </div>
        </div>
      </Section>

      {/* Payments & checkout */}
      <Section title="Payments & Checkout" subtitle="Payment defaults and credit rules" icon={Wallet} accent="emerald" delay={0.06}>
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><CreditCard className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Default Payment Mode</p><p className="text-xs text-zinc-500">Pre-selected method at checkout</p></div>
          <select value={form.default_payment_mode} onChange={(e) => set({ default_payment_mode: e.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900">
            <option>Cash</option><option>Card</option><option>Bank Transfer</option>
          </select>
        </div>
        <Toggle icon={CreditCard} label="Allow Credit Sale" desc="Sell on credit to registered customers (adds a Credit method)" checked={form.allow_credit_sale} onChange={(v) => set({ allow_credit_sale: v })} />
        <Toggle icon={Wallet} label="Allow Partial Payment" desc="Let customers pay less than the total" checked={form.allow_partial_payment} onChange={(v) => set({ allow_partial_payment: v })} />
      </Section>

      {/* Discounts */}
      <Section title="Discounts" subtitle="Manual discount control" icon={Percent} accent="violet" delay={0.09}>
        <Toggle icon={Percent} label="Enable Discounts" desc="Allow cashiers to apply a cart discount" checked={form.enable_discounts} onChange={(v) => set({ enable_discounts: v })} />
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"><Percent className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Max Discount %</p><p className="text-xs text-zinc-500">Percentage discounts are capped at this value</p></div>
          <input type="number" min={0} max={100} value={form.max_discount_percent} disabled={!form.enable_discounts}
            onChange={(e) => set({ max_discount_percent: Number(e.target.value) })}
            className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
      </Section>

      {/* Sale behaviour */}
      <Section title="Sale Behaviour" subtitle="Cart and item rules on the terminal" icon={ClipboardList} accent="amber" delay={0.12}>
        <Toggle icon={ClipboardList} label="Allow Hold Sale" desc="Show the Hold Sale (F8) button to park a sale" checked={form.allow_hold_sale} onChange={(v) => set({ allow_hold_sale: v })} />
        <Toggle icon={ScanLine} label="Enable Barcode Scanner" desc="Scan barcodes in the search box to add items" checked={form.enable_barcode_scanner} onChange={(v) => set({ enable_barcode_scanner: v })} />
        <Toggle icon={CalendarClock} label="Show Expiry Warning" desc="Warn when adding near-expiry stock (≤30 days)" checked={form.show_expiry_warning} onChange={(v) => set({ show_expiry_warning: v })} />
        <Toggle icon={ShieldAlert} label="Require Prescription" desc="Prompt for Rx on controlled items" checked={form.enable_prescription_requirement} onChange={(v) => set({ enable_prescription_requirement: v })} />
      </Section>

      {/* Sticky save */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <span className="text-xs text-zinc-500">{isDirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <button onClick={handleSave} disabled={!isDirty || updateSettings.isPending}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all ${isDirty && !updateSettings.isPending ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-zinc-300 dark:bg-zinc-700'}`}>
          {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : isDirty ? <Save size={16} /> : <CheckCircle2 size={16} />}
          {updateSettings.isPending ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
