import { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

export interface DynamicColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'badge' | 'boolean';
}

export interface DynamicReportSchema {
  metadata: {
    report_id: string;
    title: string;
    columns: DynamicColumn[];
  };
  rows: any[];
}

interface UniversalDataTableProps {
  data: DynamicReportSchema | null;
  isLoading: boolean;
  rowsPerPage?: number;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export default function UniversalDataTable({ data, isLoading, rowsPerPage = 10 }: UniversalDataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting logic
  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];
    let sortableRows = [...data.rows];
    
    if (sortConfig !== null) {
      sortableRows.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && !isNaN(Number(aValue.replace(/,/g, '').replace(/Rs /g, '')))) {
            aValue = Number(aValue.replace(/,/g, '').replace(/Rs /g, ''));
        }
        if (typeof bValue === 'string' && !isNaN(Number(bValue.replace(/,/g, '').replace(/Rs /g, '')))) {
            bValue = Number(bValue.replace(/,/g, '').replace(/Rs /g, ''));
        }

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
    setCurrentPage(1);
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

  const formatValue = (col: DynamicColumn, value: any) => {
    if (value === null || value === undefined) return '-';
    
    switch (col.type) {
      case 'currency':
        return typeof value === 'number' 
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(value)
            : value;
      case 'date':
        return typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : value;
      case 'badge':
        const status = String(value).toLowerCase();
        const color = status === 'critical' || status === 'expired' 
            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' 
            : status === 'warning' || status === 'low'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}>
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </span>
        );
      case 'boolean':
        return value ? (
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Yes</span>
        ) : (
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">No</span>
        );
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <Activity className="h-8 w-8 text-zinc-400 mb-3" />
        <p className="text-base font-medium text-zinc-600 dark:text-zinc-300">No data found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{data.metadata.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              {data.metadata.columns.map((col) => (
                <th 
                  key={col.key}
                  onClick={() => requestSort(col.key)}
                  className="group cursor-pointer select-none px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <div className="flex items-center">
                    {col.label}
                    {getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-transparent">
            {paginatedRows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/80 transition-colors dark:hover:bg-zinc-900/30">
                {data.metadata.columns.map((col) => (
                  <td key={`${i}-${col.key}`} className="whitespace-nowrap px-6 py-3.5">
                    {formatValue(col, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
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
  );
}
