"use client";

import { useState, useEffect } from 'react';
import UniversalDataTable from '@/features/reports/components/UniversalDataTable';
import { useBuildCustomReport } from '@/features/reports/api/dynamic-reports.api';

const ENTITY_COLUMNS: Record<string, string[]> = {
  sales: ['invoice_number', 'total_amount', 'tax_amount', 'discount_amount', 'cashier_name', 'status', 'created_at'],
  inventory: ['name', 'category_id', 'current_stock', 'reorder_level', 'cost_price', 'selling_price', 'status'],
  purchases: ['invoice_number', 'supplier_name', 'total_amount', 'tax_amount', 'status', 'created_at']
};

export default function CustomReportBuilderPage() {
  const [baseEntity, setBaseEntity] = useState('sales');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>('');
  
  const { mutate: buildReport, data, isPending, error } = useBuildCustomReport();

  // Reset columns when entity changes
  useEffect(() => {
    setSelectedColumns([]);
    setGroupBy('');
  }, [baseEntity]);

  const handleColumnToggle = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleGenerate = () => {
    if (selectedColumns.length === 0) return;
    
    buildReport({
      base_entity: baseEntity,
      selected_columns: selectedColumns,
      group_by: groupBy || null,
      filters: [] // Filters UI omitted for brevity, but payload is ready
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-500">
      
      {/* LEFT SIDEBAR: BUILDER */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6 overflow-y-auto border-r border-zinc-200 pr-6 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Custom Builder</h1>
          <p className="text-xs text-zinc-500 mt-1 dark:text-zinc-400">Design your own report dynamically.</p>
        </div>

        {/* Base Entity Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">1. Select Data Source</label>
          <select 
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            value={baseEntity}
            onChange={(e) => setBaseEntity(e.target.value)}
          >
            <option value="sales">Sales (Revenue & POS)</option>
            <option value="inventory">Inventory (Stock & Valuation)</option>
            <option value="purchases">Purchases (Costs & Invoices)</option>
          </select>
        </div>

        {/* Columns Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">2. Select Columns</label>
          <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
            {ENTITY_COLUMNS[baseEntity].map(col => (
              <label key={col} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedColumns.includes(col)}
                  onChange={() => handleColumnToggle(col)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
                />
                <span className="text-sm text-zinc-700 capitalize dark:text-zinc-300">{col.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Group By Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">3. Group By (Optional)</label>
          <select 
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="">-- No Grouping --</option>
            {selectedColumns.map(col => (
              <option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isPending || selectedColumns.length === 0}
          className="mt-4 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          {isPending ? 'Generating...' : 'Generate Report'}
        </button>
        
        {error && (
          <p className="text-xs text-red-500 mt-2">{error.message}</p>
        )}
      </div>

      {/* RIGHT MAIN AREA: PREVIEW */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
          {!data && !isPending && (
            <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
              <div className="text-center">
                <p className="text-sm">No report generated yet.</p>
                <p className="text-xs mt-1">Select your columns and click Generate to see the preview.</p>
              </div>
            </div>
          )}
          
          {(data || isPending) && (
            <div className="p-4 h-full overflow-auto">
              <UniversalDataTable 
                data={data || null} 
                isLoading={isPending} 
                rowsPerPage={10} 
              />
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
