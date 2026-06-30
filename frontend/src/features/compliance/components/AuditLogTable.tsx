import { AuditLog } from '../services/compliance.api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AuditLogTableProps {
  data: AuditLog[];
  isLoading: boolean;
}

export default function AuditLogTable({ data, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Entity</th>
              <th className="px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data?.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                  {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{log.user_id.substring(0, 8)}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {log.action}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{log.entity_type}</span>
                  <span className="ml-1 font-mono text-xs text-zinc-500">#{log.entity_id.substring(0, 6)}</span>
                </td>
                <td className="px-6 py-4 text-xs">{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
