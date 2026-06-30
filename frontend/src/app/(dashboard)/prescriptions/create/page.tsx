import PrescriptionForm from '@/features/prescriptions/components/PrescriptionForm';

export default function CreatePrescriptionPage() {
  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Add New Prescription
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter prescription details, attach scans, and link to a patient.
        </p>
      </div>
      <PrescriptionForm />
    </div>
  );
}
