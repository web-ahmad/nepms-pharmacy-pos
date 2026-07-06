import PrescriptionViewer from '@/features/prescriptions/components/PrescriptionViewer';

export default async function PrescriptionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PrescriptionViewer id={id} />
    </div>
  );
}
