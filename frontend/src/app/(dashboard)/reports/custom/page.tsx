"use client";

import { useState, useEffect } from 'react';
import UniversalDataTable from '@/features/reports/components/UniversalDataTable';
import { useBuildCustomReport, useSaveReportTemplate, useGetReportTemplates } from '@/features/reports/api/dynamic-reports.api';
import { Save, Wand2, Database, Columns, GroupIcon, FileBarChart, BookMarked, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const ENTITY_COLUMNS: Record<string, { key: string; label: string; type: string }[]> = {
  sales: [
    { key: 'invoice_number', label: 'Invoice Number', type: 'string' },
    { key: 'total_amount', label: 'Total Amount', type: 'currency' },
    { key: 'subtotal', label: 'Subtotal', type: 'currency' },
    { key: 'discount_amount', label: 'Discount Amount', type: 'currency' },
    { key: 'tax_amount', label: 'Tax Amount', type: 'currency' },
    { key: 'payment_method', label: 'Payment Method', type: 'string' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'cashier_name', label: 'Cashier Name', type: 'string' },
    { key: 'created_at', label: 'Sale Date', type: 'date' },
  ],
  inventory: [
    { key: 'name', label: 'Medicine Name', type: 'string' },
    { key: 'cost_per_base_unit', label: 'Unit Cost', type: 'currency' },
    { key: 'selling_price', label: 'Selling Price', type: 'currency' },
    { key: 'current_stock', label: 'Current Stock', type: 'number' },
    { key: 'min_stock_level', label: 'Reorder Level', type: 'number' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Added On', type: 'date' },
  ],
  purchases: [
    { key: 'invoice_number', label: 'Invoice Number', type: 'string' },
    { key: 'supplier_name', label: 'Supplier Name', type: 'string' },
    { key: 'total_amount', label: 'Total Amount', type: 'currency' },
    { key: 'amount_paid', label: 'Amount Paid', type: 'currency' },
    { key: 'tax_amount', label: 'Tax Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
  ],
};

const ENTITIES = [
  { key: 'sales', label: 'Sales & POS', desc: 'Revenue, discounts, payment methods' },
  { key: 'inventory', label: 'Inventory', desc: 'Stock levels, costs, medicine details' },
  { key: 'purchases', label: 'Purchases', desc: 'Invoices, supplier payments' },
];

const STEP_LABELS = ['Data Source', 'Columns', 'Grouping', 'Preview'];

export default function CustomReportBuilderPage() {
  const [step, setStep] = useState(0);
  const [baseEntity, setBaseEntity] = useState('sales');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { mutate: buildReport, data, isPending, error } = useBuildCustomReport();
  const { mutateAsync: saveTemplate } = useSaveReportTemplate();
  const { data: templates, refetch: refetchTemplates } = useGetReportTemplates();

  useEffect(() => { setSelectedColumns([]); setGroupBy(''); }, [baseEntity]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleColumnToggle = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleSelectAll = () => {
    const allKeys = ENTITY_COLUMNS[baseEntity].map(c => c.key);
    setSelectedColumns(selectedColumns.length === allKeys.length ? [] : allKeys);
  };

  const handleGenerate = () => {
    if (selectedColumns.length === 0) return;
    buildReport({ base_entity: baseEntity, selected_columns: selectedColumns, group_by: groupBy || null, filters: [] });
    setStep(3);
  };

  const handleSaveTemplate = async () => {
    if (!templateName || selectedColumns.length === 0) return;
    setIsSaving(true);
    try {
      await saveTemplate({ name: templateName, report_type: baseEntity, columns: selectedColumns, grouping: groupBy || null, filters: {}, sorting: {} });
      setTemplateName('');
      refetchTemplates();
      showToast('success', 'Template saved successfully!');
    } catch {
      showToast('error', 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (t: any) => {
    setBaseEntity(t.report_type);
    setSelectedColumns(t.columns || []);
    setGroupBy(t.grouping || '');
    buildReport({ base_entity: t.report_type, selected_columns: t.columns || [], group_by: t.grouping || null, filters: [] });
    setStep(3);
  };

  return (
    <div className="flex h-full min-h-0 gap-0 animate-in fade-in duration-300">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── LEFT PANEL: BUILDER ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Custom Report Builder</h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Design your own reports with any fields and groupings.</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => i < 3 && setStep(i)}
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === i ? 'bg-blue-600 text-white' : i < step ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </button>
              {i < STEP_LABELS.length - 1 && <div className={`h-px flex-1 transition-colors ${i < step ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 p-5 space-y-6 overflow-y-auto">

          {/* STEP 0: Data Source */}
          <div className={step === 0 ? 'block' : 'hidden'}>
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Choose Data Source</span>
            </div>
            <div className="space-y-2">
              {ENTITIES.map(e => (
                <button
                  key={e.key}
                  onClick={() => setBaseEntity(e.key)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    baseEntity === e.key
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600'
                  }`}
                >
                  <p className={`text-sm font-semibold ${baseEntity === e.key ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-900 dark:text-zinc-100'}`}>{e.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{e.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition-colors">
              Next: Select Columns →
            </button>
          </div>

          {/* STEP 1: Columns */}
          <div className={step === 1 ? 'block' : 'hidden'}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Select Columns</span>
              </div>
              <button onClick={handleSelectAll} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {selectedColumns.length === ENTITY_COLUMNS[baseEntity].length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              {ENTITY_COLUMNS[baseEntity].map(col => (
                <label key={col.key} className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => handleColumnToggle(col.key)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{col.label}</span>
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">{col.type}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(0)} className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">← Back</button>
              <button onClick={() => setStep(2)} disabled={selectedColumns.length === 0} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 transition-colors">
                Next: Grouping →
              </button>
            </div>
          </div>

          {/* STEP 2: Group By */}
          <div className={step === 2 ? 'block' : 'hidden'}>
            <div className="flex items-center gap-2 mb-3">
              <GroupIcon className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Group By (Optional)</span>
            </div>
            <div className="space-y-1.5">
              {['', ...selectedColumns].map(col => (
                <button
                  key={col}
                  onClick={() => setGroupBy(col)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-all ${
                    groupBy === col
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300'
                  }`}
                >
                  {col === '' ? '— No Grouping (show all rows) —' : ENTITY_COLUMNS[baseEntity].find(c => c.key === col)?.label || col}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">← Back</button>
              <button onClick={handleGenerate} disabled={isPending} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {isPending ? 'Building...' : '⚡ Generate'}
              </button>
            </div>
          </div>

          {/* STEP 3: Actions (after preview) */}
          <div className={step === 3 ? 'block' : 'hidden'}>
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Report Actions</span>
            </div>
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Save as Named Template</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Monthly Cash Sales"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSaving || !templateName}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
                    title="Save Template"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(0)}
              className="mt-3 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 transition-colors"
            >
              ← Build Another Report
            </button>
          </div>

          {/* Saved Templates (always visible) */}
          {templates && templates.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <BookMarked className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Saved Templates</span>
              </div>
              <div className="space-y-1.5">
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left rounded-lg border border-zinc-200 bg-white px-3 py-2.5 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50 transition-all group"
                  >
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-0.5">{t.report_type} • {t.columns?.length || 0} columns</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: PREVIEW ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Summary bar */}
        {data && (
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                ✓ {data.rows.length} rows returned
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Source: <strong className="text-zinc-700 dark:text-zinc-300 capitalize">{baseEntity}</strong>
                {groupBy && <> · Grouped by <strong className="text-zinc-700 dark:text-zinc-300">{ENTITY_COLUMNS[baseEntity].find(c => c.key === groupBy)?.label || groupBy}</strong></>}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {!data && !isPending && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                  <Wand2 className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Start Building</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Use the panel on the left to select a data source, choose your columns, optionally group results, then hit <strong>Generate</strong>.
                </p>
              </div>
            </div>
          )}

          {(data || isPending) && (
            <UniversalDataTable data={data || null} isLoading={isPending} rowsPerPage={25} />
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Report generation failed: {(error as any)?.message || 'Unknown error'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
