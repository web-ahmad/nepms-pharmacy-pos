import React from 'react';
import SimpleFormLayout from '@/features/inventory/components/MedicineMasterWizard/SimpleFormLayout';
import MedicineFormSettingsModal from '@/features/inventory/components/MedicineMasterWizard/MedicineFormSettingsModal';

export default function AddMedicinePage() {
  return (
    <div className="space-y-6 p-8 bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Add New Medicine</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Create a new medicine profile with advanced configurations and inventory settings.
          </p>
        </div>
        <MedicineFormSettingsModal />
      </div>

      <SimpleFormLayout />
    </div>
  );
}