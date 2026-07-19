'use client';

import Link from 'next/link';
import PurchaseOrderTable from '@/features/purchase/components/PurchaseOrderTable';
import { useAuthStore } from '@/stores/auth-store';
import { Plus } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const { hasPermission } = useAuthStore();
  // RBAC 4.0: Use permission-based check, never role.name strings
  const canCreate = hasPermission('purchase_orders:create') || hasPermission('purchase_orders:manage');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Purchase Orders
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your procurement pipeline from draft to completion.
          </p>
        </div>
        
        {canCreate && (
          <Link
            href="/purchase/orders/create"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus size={16} />
            Create PO
          </Link>
        )}
      </div>

      <PurchaseOrderTable />
    </div>
  );
}
