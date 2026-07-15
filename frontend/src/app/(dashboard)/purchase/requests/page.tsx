'use client';

import PurchaseRequestTable from '@/features/purchase/components/PurchaseRequestTable';

export default function PurchaseRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Purchase Requests
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Internal requests for stock procurement before creating a Purchase Order.
          </p>
        </div>
      </div>

      <PurchaseRequestTable />
    </div>
  );
}
