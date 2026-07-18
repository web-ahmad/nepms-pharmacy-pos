import { BranchStatsFullView } from '@/features/branches/components/BranchStatsFullView';

export default async function BranchStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BranchStatsFullView branchId={id} />;
}
