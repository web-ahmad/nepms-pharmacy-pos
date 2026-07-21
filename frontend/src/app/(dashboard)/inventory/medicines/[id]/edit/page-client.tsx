'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SimpleFormLayout from '@/features/inventory/components/MedicineMasterWizard/SimpleFormLayout';
import { useGetMedicine, mapBackendToForm } from '@/features/inventory/services/medicine.api';
import { Loader2 } from 'lucide-react';

export default function EditMedicinePage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: medicine, isLoading, isError } = useGetMedicine(id);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !medicine) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        Failed to load medicine details.
      </div>
    );
  }

  // Map backend response back to form values
  const initialData = mapBackendToForm(medicine) as any;

  return (
    <div className="space-y-6 p-8 bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Edit Medicine</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Update medicine profile and inventory settings.
          </p>
        </div>
      </div>

      <SimpleFormLayout initialData={initialData as any} medicineId={id} isEdit={true} />
    </div>
  );
}
