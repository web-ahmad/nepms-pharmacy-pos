import PrescriptionViewer from '@/features/prescriptions/components/PrescriptionViewer';

export default function PrescriptionDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PrescriptionViewer id={params.id} />
    </div>
  );
}
