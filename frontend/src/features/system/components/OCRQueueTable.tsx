import { OCRQueue } from '../services/system.api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface OCRQueueTableProps {
  data: OCRQueue[];
  isLoading: boolean;
}

export default function OCRQueueTable({ data, isLoading }: OCRQueueTableProps) {
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
          <p className="font-medium">No files in OCR Queue.</p>
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
              <th className="px-6 py-3 font-medium">Uploaded At</th>
              <th className="px-6 py-3 font-medium">File Source</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Processed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((job) => (
              <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                  {format(new Date(job.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                  {job.file_path}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {job.status === 'Completed' ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>
                  ) : job.status === 'Pending' ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pending Worker</Badge>
                  ) : job.status === 'Processing' ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Extracting AI...</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                  {job.processed_at ? format(new Date(job.processed_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
