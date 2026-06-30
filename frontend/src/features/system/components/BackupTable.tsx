import { BackupHistory } from '../services/system.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { DownloadCloud, CloudOff } from 'lucide-react';

interface BackupTableProps {
  data: BackupHistory[];
  isLoading: boolean;
}

export default function BackupTable({ data, isLoading }: BackupTableProps) {
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
          <CloudOff className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="font-medium">No backups found.</p>
        </div>
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
              <th className="px-6 py-3 font-medium">File Name</th>
              <th className="px-6 py-3 font-medium">Size</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((backup) => (
              <tr key={backup.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                  {format(new Date(backup.created_at), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {backup.file_name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono">{backup.size_mb.toFixed(2)} MB</td>
                <td className="whitespace-nowrap px-6 py-4">
                  {backup.status === 'Success' ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Success</Badge>
                  ) : backup.status === 'In_Progress' ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" disabled={backup.status !== 'Success'}>
                    <DownloadCloud className="mr-2 h-4 w-4" /> Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
