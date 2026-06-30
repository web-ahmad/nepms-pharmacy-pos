import { ReportResponse } from '../types';

interface ReportTableProps {
  data: ReportResponse;
  isLoading: boolean;
}

export default function ReportTable({ data, isLoading }: ReportTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No data found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      </div>
    );
  }

  // Helper to format values
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // If it looks like currency (e.g. sales, revenue, cost)
      if (key.includes('revenue') || key.includes('sales') || key.includes('amount') || key.includes('cost') || key.includes('price') || key.includes('value')) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(value);
      }
      return new Intl.NumberFormat('en-US').format(value);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data.summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.summary).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{key}</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {typeof value === 'number' && (key.toLowerCase().includes('total') || key.toLowerCase().includes('profit'))
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(value)
                  : value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                {data.headers.map((header) => (
                  <th key={header} className="px-6 py-3 font-medium">
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  {data.headers.map((header) => (
                    <td key={`${i}-Rs {header}`} className="whitespace-nowrap px-6 py-4">
                      {formatValue(header, row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Showing {data.total_records} records
        </div>
      </div>
    </div>
  );
}
