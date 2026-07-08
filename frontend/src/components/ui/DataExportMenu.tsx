'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { GlobalPrintTemplate } from '@/components/shared/GlobalPrintTemplate';

export interface ExportColumn {
  header: string;
  accessorKey: string | ((row: any) => string | number);
}

interface DataExportMenuProps {
  title: string;
  data: any[];
  columns: ExportColumn[];
  fileName?: string;
}

export function DataExportMenu({ title, data, columns, fileName }: DataExportMenuProps) {
  const safeTitle = title || 'export';
  const exportFileName = fileName || safeTitle.replace(/\s+/g, '_').toLowerCase();

  const handlePrint = () => {
    // The print template is already rendered in the DOM but hidden.
    // window.print() will trigger the @media print CSS which shows the template and hides the app.
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportPDF = () => {
    toast.success('Please select "Save as PDF" in the print dialog.');
    handlePrint();
  };

  const handleExportCSV = () => {
    try {
      const sheetData = data.map(row => {
        const mappedRow: any = {};
        columns.forEach(col => {
          mappedRow[col.header] = typeof col.accessorKey === 'function' ? col.accessorKey(row) : row[col.accessorKey] ?? '-';
        });
        return mappedRow;
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${exportFileName}.csv`);
      toast.success('CSV Exported Successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <PopoverContent align="end" className="w-48 p-1 flex flex-col gap-1">
        <button onClick={handlePrint} className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer gap-2 transition-colors">
          <Printer className="h-4 w-4 text-slate-500" /> Print (A4)
        </button>
        <button onClick={handleExportPDF} className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer gap-2 transition-colors">
          <FileText className="h-4 w-4 text-red-500" /> Export PDF
        </button>
        <button onClick={handleExportCSV} className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer gap-2 transition-colors">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
        </button>
      </PopoverContent>

      {/* Hidden print template */}
      <GlobalPrintTemplate 
        title={title}
        metadata={[
          { label: 'Date Exported', value: new Date().toLocaleDateString() },
          { label: 'Records', value: data.length }
        ]}
      >
        <table>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rIdx) => (
              <tr key={rIdx}>
                {columns.map((col, cIdx) => (
                  <td key={cIdx}>
                    {typeof col.accessorKey === 'function' ? col.accessorKey(row) : row[col.accessorKey] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GlobalPrintTemplate>

    </Popover>
  );
}
