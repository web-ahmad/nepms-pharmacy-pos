'use client';

import MedicineForm from '@/features/inventory/components/MedicineForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateMedicinePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/inventory" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Add New Medicine
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a new medicine profile. Stock can be added later via Purchase Order (GRN) or Manual Adjustment.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <MedicineForm />
      </div>
    </div>
  );
}
