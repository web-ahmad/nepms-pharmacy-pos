'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

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
  const exportFileName = fileName || title.replace(/\s+/g, '_').toLowerCase();

  const handlePrint = () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      doc.setFontSize(18);
      doc.text(title, 40, 40);
      
      const head = [columns.map(col => col.header)];
      const body = data.map(row => 
        columns.map(col => typeof col.accessorKey === 'function' ? col.accessorKey(row) : row[col.accessorKey] ?? '-')
      );

      autoTable(doc, {
        startY: 60,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // emerald-600
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate print document');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      doc.setFontSize(18);
      doc.text(title, 40, 40);
      
      const head = [columns.map(col => col.header)];
      const body = data.map(row => 
        columns.map(col => typeof col.accessorKey === 'function' ? col.accessorKey(row) : row[col.accessorKey] ?? '-')
      );

      autoTable(doc, {
        startY: 60,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // emerald-600
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.save(`${exportFileName}.pdf`);
      toast.success('PDF Exported Successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF');
    }
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
    </Popover>
  );
}
