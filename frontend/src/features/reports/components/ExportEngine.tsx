import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { exportReport } from '../services/reports.api';
import { DateRangeParams } from '../types';
import { useAuthStore } from '@/stores/auth-store';

interface ExportEngineProps {
  endpoint: string;
  params: DateRangeParams;
  filename: string;
}

export default function ExportEngine({ endpoint, params, filename }: ExportEngineProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { user } = useAuthStore();
  
  // Check RBAC
  const canExport = user?.role === 'Super Admin' || user?.permissions?.includes('reports.export');

  if (!canExport) {
    return null;
  }

  const handleExport = async (format: string) => {
    try {
      setIsExporting(format);
      await exportReport(endpoint, { ...params, export: format });
    } catch (error) {
      alert(`Failed to export ${format}. Please try again.`);
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <button
        onClick={() => handleExport('csv')}
        disabled={isExporting !== null}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        {isExporting === 'csv' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="text-blue-500" />}
        CSV
      </button>

      <button
        onClick={() => handleExport('excel')}
        disabled={isExporting !== null}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        {isExporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} className="text-green-500" />}
        Excel
      </button>

      <button
        onClick={() => handleExport('pdf')}
        disabled={isExporting !== null}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        {isExporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-red-500" />}
        PDF
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <Printer size={16} className="text-zinc-500" />
        Print
      </button>
    </div>
  );
}
