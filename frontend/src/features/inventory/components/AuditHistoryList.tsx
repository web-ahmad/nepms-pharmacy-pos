import { History } from 'lucide-react';

interface AuditHistoryListProps {
  entityId: string;
}

export default function AuditHistoryList({ entityId }: AuditHistoryListProps) {
  // TODO: Implement actual data fetching when the Audit API is ready.
  // Placeholder since Audit API wasn't explicitly exposed in previous phases 
  // but it's recorded in the database.
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-zinc-500 border rounded-lg dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <History className="h-10 w-10 text-zinc-300 mb-3" />
      <p>Audit history is recorded automatically in the background.</p>
      <p className="text-xs mt-1">Full viewing interface will be available in the Audit Module.</p>
    </div>
  );
}
