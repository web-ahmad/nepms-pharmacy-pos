import { useState, useMemo } from 'react';
import { ReportResponse } from '../types';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

interface ReportTableProps {
  data: ReportResponse;
  isLoading: boolean;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export default function ReportTable({ data, isLoading }: ReportTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Sorting logic
  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];
    let sortableRows = [...data.rows];
    
    if (sortConfig !== null) {
      sortableRows.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric parsing if it's a string containing numbers
        if (typeof aValue === 'string' && !isNaN(Number(aValue))) aValue = Number(aValue);
        if (typeof bValue === 'string' && !isNaN(Number(bValue))) bValue = Number(bValue);

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableRows;
  }, [data, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil((sortedRows.length || 0) / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to page 1 on sort
  };

  const getSortIcon = (columnName: string) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-500 transition-colors" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
    );
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (key.includes('revenue') || key.includes('sales') || key.includes('amount') || key.includes('cost') || key.includes('price') || key.includes('value')) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(value);
      }
      return new Intl.NumberFormat('en-US').format(value);
    }
    // Simple date formatting
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <Activity className="h-8 w-8 text-zinc-400 mb-3" />
        <p className="text-base font-medium text-zinc-600 dark:text-zinc-300">No data found</p>
        <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters or running a different report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Summary Cards */}
      {data.summary && Object.keys(data.summary).length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.summary).map(([key, value]) => (
            <div key={key} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-blue-900/10"></div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 relative z-10">{key}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 relative z-10">
                {typeof value === 'number' && (key.toLowerCase().includes('total') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('impact') || key.toLowerCase().includes('value'))
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
                  : new Intl.NumberFormat('en-US').format(Number(value) || value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                {data.headers.map((key) => (
                  <th 
                    key={key}
                    onClick={() => requestSort(key)}
                    className="group cursor-pointer select-none px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <div className="flex items-center">
                      {key.replace(/_/g, ' ')}
                      {getSortIcon(key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-transparent">
              {paginatedRows.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-50/80 transition-colors dark:hover:bg-zinc-900/30">
                  {data.headers.map((header) => (
                    <td key={`${i}-${header}`} className="whitespace-nowrap px-6 py-3.5">
                      {formatValue(header, row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-transparent">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Showing <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{((currentPage - 1) * rowsPerPage) + 1}</span> to <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{Math.min(currentPage * rowsPerPage, sortedRows.length)}</span> of <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{sortedRows.length}</span> entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Page {currentPage}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">of {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
