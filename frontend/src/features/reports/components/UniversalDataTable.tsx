import { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Activity, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

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
  showSummary?: boolean;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const BADGE_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  voided: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  slow: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  dead: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  fast: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
};

export default function UniversalDataTable({ data, isLoading, rowsPerPage = 10, showSummary = true }: UniversalDataTableProps) {
  const { user, branchId } = useAuthStore();
  const pharmacyName = user?.pharmacy_name || 'NEPMS Pharmacy';

  // Match BranchSwitcher logic exactly:
  // - Find currently selected branch (by branchId), else fallback to main branch
  // - Show "MAIN BRANCH" for main, or "Branch - CODE" for others
  const currentBranch = branchId
    ? user?.assigned_branches?.find(b => b.id === branchId)
    : user?.assigned_branches?.find(b => b.is_main) || user?.assigned_branches?.[0];
  const branchLabel = currentBranch
    ? (currentBranch.is_main
        ? 'MAIN BRANCH'
        : `Branch${currentBranch.code ? ` - ${currentBranch.code}` : ''}`)
    : 'MAIN BRANCH';

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(rowsPerPage);

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

  const totalPages = Math.ceil((sortedRows.length || 0) / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

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
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    );
  };

  const formatCurrencyValue = (num: number) => `Rs ${Math.round(num).toLocaleString('en-PK')}`;

  const formatValue = (col: DynamicColumn, value: any) => {
    if (value === null || value === undefined) return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
    switch (col.type) {
      case 'currency':
        return typeof value === 'number'
          ? <span className="font-mono font-medium">{formatCurrencyValue(value)}</span>
          : value;
      case 'number':
        return typeof value === 'number'
          ? <span className="font-mono">{value.toLocaleString()}</span>
          : value;
      case 'date':
        return typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)
          ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : value;
      case 'badge': {
        const statusKey = String(value).toLowerCase();
        const color = BADGE_COLORS[statusKey] || 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </span>
        );
      }
      case 'boolean':
        return value ? (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Yes</span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">No</span>
        );
      default:
        return String(value);
    }
  };

  // Summary totals for numeric/currency cols
  const summaryRow = useMemo(() => {
    if (!showSummary || !data?.rows?.length) return null;
    const sums: Record<string, number> = {};
    let hasAny = false;
    data.metadata.columns.forEach((col) => {
      if (col.type === 'currency' || col.type === 'number') {
        const total = sortedRows.reduce((acc, row) => acc + (typeof row[col.key] === 'number' ? row[col.key] : 0), 0);
        sums[col.key] = total;
        if (total !== 0) hasAny = true;
      }
    });
    return hasAny ? sums : null;
  }, [data, sortedRows, showSummary]);

  const exportToCSV = () => {
    if (!data) return;
    const headers = data.metadata.columns.map(c => c.label).join(',');
    const csvRows = sortedRows.map(row =>
      data.metadata.columns.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvRows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.metadata.title.replace(/\s+/g, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    if (!data) return;
    const cols = data.metadata.columns;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Build column totals for numeric/currency cols
    const totals: Record<string, number | null> = {};
    let hasTotals = false;
    cols.forEach(c => {
      if (c.type === 'currency' || c.type === 'number') {
        const sum = sortedRows.reduce((acc, row) => acc + (typeof row[c.key] === 'number' ? row[c.key] : 0), 0);
        totals[c.key] = sum;
        if (sum !== 0) hasTotals = true;
      } else {
        totals[c.key] = null;
      }
    });

    const formatVal = (val: any, type: string) => {
      if (val === null || val === undefined || val === '') return '';
      if (type === 'currency' && typeof val === 'number')
        return 'Rs\u00a0' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (type === 'boolean') return val ? 'Yes' : 'No';
      return String(val);
    };

    const theadHTML = `<th class="sr">#</th>` + cols.map(c =>
      `<th class="${c.type === 'currency' || c.type === 'number' ? 'num' : ''}">${c.label}</th>`
    ).join('');

    const tbodyHTML = sortedRows.map((row, i) => {
      const cells = cols.map(c => {
        const display = formatVal(row[c.key], c.type);
        const numClass = (c.type === 'currency' || c.type === 'number') ? ' class="num"' : '';
        return `<td${numClass}>${display}</td>`;
      }).join('');
      return `<tr class="${i % 2 === 1 ? 'alt' : ''}"><td class="sr">${i + 1}</td>${cells}</tr>`;
    }).join('');

    const tfootHTML = hasTotals ? (() => {
      const cells = cols.map(c => {
        const tot = totals[c.key];
        if (tot !== null) {
          const display = c.type === 'currency'
            ? 'Rs\u00a0' + tot.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : tot.toLocaleString('en-PK');
          return `<td class="num tot">${display}</td>`;
        }
        return `<td class="tot"></td>`;
      }).join('');
      return `<tfoot><tr><td class="sr tot">Total</td>${cells}</tr></tfoot>`;
    })() : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${data.metadata.title} — ${pharmacyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px 24px; }

    /* ── Letterhead ── */
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 3px solid #1e293b; margin-bottom: 4px; }
    .pharmacy-name { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.1; }
    .branch-name { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 500; }
    .print-meta { text-align: right; font-size: 10px; color: #64748b; line-height: 1.7; }
    .print-meta strong { color: #1e293b; font-size: 11px; }

    /* ── Report Title Bar ── */
    .report-title-bar { background: #1e293b; color: #fff; padding: 8px 12px; margin: 12px 0 0 0; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .report-title-bar h1 { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
    .report-title-bar span { font-size: 10px; opacity: 0.75; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #334155; color: #fff; }
    thead th { padding: 7px 10px; text-align: left; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; border-right: 1px solid #475569; }
    thead th.num { text-align: right; }
    thead th.sr { width: 32px; text-align: center; color: #94a3b8; }
    tbody tr { border-bottom: 1px solid #e2e8f0; }
    tbody tr.alt { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    tbody td { padding: 5.5px 10px; color: #1e293b; vertical-align: middle; border-right: 1px solid #f1f5f9; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.sr { text-align: center; color: #94a3b8; font-size: 9px; }

    /* ── Totals footer ── */
    tfoot tr { background: #0f172a; color: #fff; border-top: 2px solid #0f172a; }
    tfoot td { padding: 7px 10px; font-weight: 700; font-size: 11px; border-right: 1px solid #1e293b; }
    tfoot td.num { text-align: right; }
    tfoot td.sr { text-align: center; font-size: 9px; color: #94a3b8; font-weight: 500; }
    tfoot td.tot { }

    /* ── Footer ── */
    .page-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }

    /* ── Print ── */
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      body { padding: 6px 10px; font-size: 10px; }
      @page { margin: 10mm 8mm; size: A4 portrait; }
      tbody tr:hover { background: inherit !important; }
      .report-title-bar { background: #1e293b !important; color: #fff !important; }
      thead tr { background: #334155 !important; color: #fff !important; }
      tfoot tr { background: #0f172a !important; color: #fff !important; }
      tbody tr.alt { background: #f8fafc !important; }
      table { font-size: 9px; }
      thead th { font-size: 8px; padding: 5px 7px; }
      tbody td { padding: 4px 7px; font-size: 9px; }
      tfoot td { padding: 5px 7px; font-size: 9.5px; }
    }
  </style>
</head>
<body>

  <!-- Letterhead -->
  <div class="letterhead">
    <div>
      <div class="pharmacy-name">${pharmacyName}</div>
      <div class="branch-name">&#x1F3E5;&ensp;${branchLabel}</div>
    </div>
    <div class="print-meta">
      <div><strong>Date</strong>&ensp;${dateStr}</div>
      <div><strong>Time</strong>&ensp;${timeStr}</div>
      <div><strong>Printed by</strong>&ensp;${user?.full_name || user?.username || 'Staff'}</div>
      <div><strong>Records</strong>&ensp;${sortedRows.length.toLocaleString()}</div>
    </div>
  </div>

  <!-- Report Title Bar -->
  <div class="report-title-bar">
    <h1>${data.metadata.title}</h1>
    <span>${sortedRows.length.toLocaleString()} records</span>
  </div>

  <!-- Data Table -->
  <table>
    <thead><tr>${theadHTML}</tr></thead>
    <tbody>${tbodyHTML}</tbody>
    ${tfootHTML}
  </table>

  <!-- Footer -->
  <div class="page-footer">
    <span>NEPMS Pharmacy Management System &mdash; ${pharmacyName} &mdash; ${branchLabel}</span>
    <span>${data.metadata.title} &mdash; Generated on ${dateStr} at ${timeStr}</span>
  </div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 700);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-zinc-50 dark:bg-zinc-900/50" />
        ))}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <Activity className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
        <p className="text-base font-semibold text-zinc-600 dark:text-zinc-300">No data available</p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Try adjusting the date range or filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/50 print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800 print:hidden">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{data.metadata.title}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{sortedRows.length.toLocaleString()} record{sortedRows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>Show {n}</option>)}
          </select>
          <button onClick={exportToCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </button>
          <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
            <Printer className="h-3.5 w-3.5 text-zinc-500" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block p-4 border-b border-zinc-300">
        <h2 className="text-lg font-bold">{data.metadata.title}</h2>
        <p className="text-xs text-zinc-500">Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-left text-sm whitespace-nowrap print:text-xs">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 w-10">#</th>
              {data.metadata.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => requestSort(col.key)}
                  className="group cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100/80 dark:divide-zinc-800/40 bg-white dark:bg-transparent">
            {paginatedRows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/60 transition-colors dark:hover:bg-zinc-900/20 group">
                <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-600">
                  {(currentPage - 1) * pageSize + i + 1}
                </td>
                {data.metadata.columns.map((col) => (
                  <td key={`${i}-${col.key}`} className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {formatValue(col, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Summary Footer */}
          {summaryRow && (
            <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">Σ</td>
                {data.metadata.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-50">
                    {summaryRow[col.key] !== undefined
                      ? col.type === 'currency'
                        ? formatCurrencyValue(summaryRow[col.key])
                        : summaryRow[col.key].toLocaleString()
                      : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-transparent print:hidden">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{((currentPage - 1) * pageSize) + 1}</span>–
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * pageSize, sortedRows.length)}</span> of{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{sortedRows.length}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                const start = Math.max(1, currentPage - 2);
                page = start + i;
                if (page > totalPages) return null;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
