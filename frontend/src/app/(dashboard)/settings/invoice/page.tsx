"use client";

import InvoiceSettingsForm from '@/features/settings/components/InvoiceSettingsForm';

export default function InvoiceSettingsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Tax & Invoice</h2>
          <p className="text-sm text-zinc-500">Configure global tax rules, invoice layouts, and ESC/POS thermal printing.</p>
        </div>
      </div>
      
      <InvoiceSettingsForm />
    </div>
  );
}
