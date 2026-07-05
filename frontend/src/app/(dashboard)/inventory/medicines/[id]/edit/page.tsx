'use client';

import React, { use, useEffect } from 'react';
import SimpleFormLayout from '@/features/inventory/components/MedicineMasterWizard/SimpleFormLayout';
import MedicineFormSettingsModal from '@/features/inventory/components/MedicineMasterWizard/MedicineFormSettingsModal';
import { useGetMedicine, mapBackendToForm } from '@/features/inventory/services/medicine.api';
import { Loader2 } from 'lucide-react';

export default function EditMedicinePage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  // Unwrap the promise if needed in Next.js 15+ or just use params.id directly
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id;

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
        <MedicineFormSettingsModal />
      </div>

      <SimpleFormLayout initialData={initialData as any} medicineId={id} isEdit={true} />
    </div>
  );
}
