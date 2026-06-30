'use client';

import PrescriptionForm from '@/features/prescriptions/components/PrescriptionForm';
import { usePrescriptionDetails } from '@/features/prescriptions/services/prescription.api';

export default function EditPrescriptionPage({ params }: { params: { id: string } }) {
  const { data: prescription, isLoading } = usePrescriptionDetails(params.id);

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading prescription...</div>;
  if (!prescription) return <div className="p-8 text-center text-red-500">Prescription not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit Prescription
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Update Rx {prescription.id.split('-')[0].toUpperCase()}
        </p>
      </div>
      <PrescriptionForm initialData={prescription} />
    </div>
  );
}
