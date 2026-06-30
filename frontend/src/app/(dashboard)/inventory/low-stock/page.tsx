'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { useLowStockAlerts, LowStockAlert } from '@/features/inventory/services/alerts.api';
import { useSuppliers } from '@/features/purchase/services/purchase.api';
import { useBulkDraftPOs } from '@/features/purchase/services/purchase.api';
import { AlertTriangle, Download, Search, FileText, Loader2, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LowStockPage() {
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');
  const [supplierId, setSupplierId] = useState('All');
  const [rowSelection, setRowSelection] = useState({});

  const { data: alertsData, isLoading } = useLowStockAlerts({
    skip,
    limit,
    search: search || undefined,
    severity: severity === 'All' ? undefined : severity,
    supplier_id: supplierId === 'All' ? undefined : supplierId
  });

  const { data: suppliers } = useSuppliers();
  const { mutateAsync: generatePOs, isPending: isGenerating } = useBulkDraftPOs();

  const columns = useMemo<ColumnDef<LowStockAlert>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
      },
      {
        accessorKey: 'medicine_name',
        header: 'Product Name',
        cell: info => <div className="font-medium text-slate-900">{info.getValue() as string}</div>
      },
      {
        accessorKey: 'generic_name',
        header: 'Generic',
        cell: info => <div className="text-slate-500">{info.getValue() as string || '-'}</div>
      },
      {
        accessorKey: 'batch_info',
        header: 'Batch Info',
        cell: info => <div className="text-slate-500">{info.getValue() as string || '-'}</div>
      },
      {
        accessorKey: 'current_stock',
        header: 'Current Stock',
        cell: info => <div className="text-right font-medium">{info.getValue() as number}</div>
      },
      {
        accessorKey: 'min_stock_level',
        header: 'Min Stock',
        cell: info => <div className="text-right">{info.getValue() as number}</div>
      },
      {
        accessorKey: 'safety_threshold',
        header: 'Safety Threshold',
        cell: info => <div className="text-right text-slate-500">{info.getValue() as number}</div>
      },
      {
        accessorKey: 'suggested_reorder',
        header: 'Suggested Reorder',
        cell: info => <div className="text-right font-semibold text-indigo-600">{info.getValue() as number}</div>
      },
      {
        accessorKey: 'supplier_name',
        header: 'Supplier',
        cell: info => <div className="text-slate-600">{info.getValue() as string || '-'}</div>
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: info => {
          const val = info.getValue() as string;
          if (val === 'Critical') {
            return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-none"><AlertTriangle className="w-3 h-3 mr-1"/> Critical</Badge>;
          }
          return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-none hover:bg-amber-100">Warning</Badge>;
        }
      }
    ],
    []
  );

  const table = useReactTable({
    data: alertsData?.items || [],
    columns,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: alertsData ? Math.ceil(alertsData.total / limit) : -1,
  });

  const handleGeneratePOs = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;
    const medicineIds = selectedRows.map(row => row.original.medicine_id);

    try {
      await generatePOs(medicineIds);
      toast.success('Draft Purchase Orders generated successfully!');
      setRowSelection({});
    } catch (error) {
      toast.error('Failed to generate Purchase Orders.');
      console.error(error);
    }
  };

  const exportExcel = () => {
    if (!alertsData?.items.length) return;
    const ws = XLSX.utils.json_to_sheet(alertsData.items.map(i => ({
      'Product Name': i.medicine_name,
      'Generic Name': i.generic_name || '',
      'Batch Info': i.batch_info || '',
      'Current Stock': i.current_stock,
      'Min Stock Level': i.min_stock_level,
      'Suggested Reorder': i.suggested_reorder,
      'Supplier': i.supplier_name || '',
      'Severity': i.severity
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Low Stock Alerts");
    XLSX.writeFile(wb, "LowStock_Report.xlsx");
  };

  const exportPDF = () => {
    if (!alertsData?.items.length) return;
    const doc = new jsPDF();
    doc.text("Low Stock Alerts Report", 14, 15);
    
    const tableColumn = ["Product", "Generic", "Stock", "Min Stock", "Reorder", "Supplier", "Severity"];
    const tableRows: any[][] = [];

    alertsData.items.forEach(item => {
      tableRows.push([
        item.medicine_name,
        item.generic_name || '-',
        item.current_stock,
        item.min_stock_level,
        item.suggested_reorder,
        item.supplier_name || '-',
        item.severity
      ]);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });
    doc.save("LowStock_Report.pdf");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Low Stock Alerts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage inventory replenishments and generate purchase orders.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={exportExcel} className="flex items-center text-slate-700 bg-white border-slate-300 shadow-sm hover:bg-slate-50">
            <FileText className="w-4 h-4 mr-2 text-emerald-600" /> Export Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="flex items-center text-slate-700 bg-white border-slate-300 shadow-sm hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2 text-rose-600" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search products or generic names..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <select 
            value={severity} 
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="Warning">Warning Only</option>
          </select>
        </div>
        <div className="w-64">
          <select 
            value={supplierId} 
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            <option value="All">All Suppliers</option>
            {suppliers?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-indigo-900 text-sm font-medium">
            <span className="bg-indigo-200 text-indigo-800 py-0.5 px-2 rounded-full mr-2">{Object.keys(rowSelection).length}</span>
            medicines selected
          </span>
          <Button onClick={handleGeneratePOs} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all">
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Draft Purchase Orders
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading low stock data...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
                      <CheckSquare className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">Inventory Levels Optimal</h3>
                    <p className="text-slate-500">No medicines are currently running low on stock. Great job!</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.getIsSelected() ? 'bg-indigo-50/40' : ''}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900 mx-1">{alertsData?.total === 0 ? 0 : skip + 1}</span> to <span className="font-medium text-slate-900 mx-1">{Math.min(skip + limit, alertsData?.total || 0)}</span> of <span className="font-medium text-slate-900 mx-1">{alertsData?.total || 0}</span> results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSkip(prev => Math.max(0, prev - limit))}
              disabled={skip === 0}
              className="text-slate-600 border-slate-300"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSkip(prev => prev + limit)}
              disabled={!alertsData || skip + limit >= alertsData.total}
              className="text-slate-600 border-slate-300"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
