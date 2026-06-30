'use client';

import CustomerForm from '@/features/crm/components/CustomerForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateCustomerPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/customers"
          className="p-2 -ml-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Add New Customer
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a new customer profile.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <CustomerForm />
      </div>
    </div>
  );
}
