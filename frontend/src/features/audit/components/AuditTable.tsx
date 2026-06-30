import { AuditResponse } from '../types';

interface AuditTableProps {
  data: AuditResponse;
  isLoading: boolean;
}

export default function AuditTable({ data, isLoading }: AuditTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No audit logs found for this period.</p>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('failed') || act.includes('remove')) {
      return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-900/50">High Risk</span>;
    }
    if (act.includes('update') || act.includes('change') || act.includes('adjust') || act.includes('role')) {
      return <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500 dark:ring-yellow-900/50">Warning</span>;
    }
    return <span className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-800/50 dark:text-zinc-400 dark:ring-zinc-700/50">Info</span>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">Severity</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">User ID</th>
              <th className="px-6 py-3 font-medium">Entity Type</th>
              <th className="px-6 py-3 font-medium">Entity ID</th>
              <th className="px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.rows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{row.timestamp}</td>
                <td className="whitespace-nowrap px-6 py-4">{getSeverityBadge(row.action)}</td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{row.action}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{row.user_id}</td>
                <td className="whitespace-nowrap px-6 py-4">{row.entity_type}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{row.entity_id}</td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate" title={row.details}>
                    {row.details}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Showing {data.total_records} records
      </div>
    </div>
  );
}
