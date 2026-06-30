'use client';

import PurchaseInvoiceTable from '@/features/purchase/components/PurchaseInvoiceTable';

export default function PurchaseInvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Purchase Invoices
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track amounts owed to suppliers and manage payments.
          </p>
        </div>
      </div>

      <PurchaseInvoiceTable />
    </div>
  );
}
