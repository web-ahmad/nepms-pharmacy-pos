import { AuditLog } from '../services/compliance.api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface SensitiveActionsTableProps {
  data: AuditLog[];
  isLoading: boolean;
}

export default function SensitiveActionsTable({ data, isLoading }: SensitiveActionsTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No sensitive actions found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-900/30 dark:bg-zinc-950">
      <div className="border-b border-red-100 bg-red-50/50 px-6 py-4 flex items-center gap-2 dark:border-red-900/30 dark:bg-red-950/20">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <h3 className="font-semibold text-red-800 dark:text-red-400">High-Risk Activity Monitor</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Critical Action</th>
              <th className="px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                  {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{log.user_id.substring(0, 8)}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                    {log.action}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-xs font-medium">{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
