"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2, XCircle, Info } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useBulkImportMedicines } from '@/features/inventory/services/medicine.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { useRouter } from 'next/navigation';

// ── Column specification (single source of truth) ──────────────────────────
const TEMPLATE_COLUMNS = [
  'Name', 'Generic Name', 'Manufacturer', 'Category',
  'Packaging Type', 'Base Unit', 'Strips per Box', 'Units per Strip',
  'Strength', 'Rack Location', 'Low Stock Alert Level',
  'Barcode', 'Stock', 'Batch', 'Expiry',
  'Full Pack Sale Price', 'Unit Retail Price',
];

const PACKAGING_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Gel', 'Powder', 'Suspension'];

interface ValidationError { row: number; field: string; reason: string; severity: 'error' | 'warning'; }

// ── Row validator ───────────────────────────────────────────────────────────
function validateRow(row: any, index: number): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const rowNum = index + 2; // Excel row number (header = 1)

  const packagingType = row['Packaging Type'] || row['packaging_type'] || '';
  const unitsPerStrip = row['Units per Strip'] || row['units_per_strip'];
  const stripsPerBox = row['Strips per Box'] || row['strips_per_box'];

  // Required fields
  if (!row['Name'] && !row['name']) {
    errors.push({ row: rowNum, field: 'Name', reason: 'Name is required', severity: 'error' });
  }

  // Packaging type validation
  if (packagingType && !PACKAGING_TYPES.includes(packagingType)) {
    warnings.push({ row: rowNum, field: 'Packaging Type', reason: `Unknown type "${packagingType}". Expected: ${PACKAGING_TYPES.join(', ')}`, severity: 'warning' });
  }

  // Tablet/Capsule MUST have Units per Strip
  if (['Tablet', 'Capsule'].includes(packagingType) && !unitsPerStrip) {
    errors.push({ row: rowNum, field: 'Units per Strip', reason: `"Units per Strip" is required when Packaging Type is "${packagingType}"`, severity: 'error' });
  }

  // Strips per Box required for Tablet/Capsule
  if (['Tablet', 'Capsule'].includes(packagingType) && !stripsPerBox) {
    warnings.push({ row: rowNum, field: 'Strips per Box', reason: `"Strips per Box" recommended for Tablets/Capsules`, severity: 'warning' });
  }

  // Stock should be a number
  const stock = row['Stock'] || row['stock'] || row['Quantity'];
  if (stock && isNaN(Number(stock))) {
    errors.push({ row: rowNum, field: 'Stock', reason: `Stock must be a number, got "${stock}"`, severity: 'error' });
  }

  // Price should be a number
  const price = row['Full Pack Sale Price'] || row['Price'] || row['price'];
  if (price && isNaN(Number(price))) {
    errors.push({ row: rowNum, field: 'Full Pack Sale Price', reason: `Price must be a number, got "${price}"`, severity: 'error' });
  }

  // Expiry date basic check
  const expiry = row['Expiry'] || row['expiry'];
  if (expiry) {
    const d = new Date(expiry);
    if (isNaN(d.getTime())) {
      errors.push({ row: rowNum, field: 'Expiry', reason: `Invalid expiry date "${expiry}". Use YYYY-MM-DD format`, severity: 'error' });
    } else if (d < new Date()) {
      warnings.push({ row: rowNum, field: 'Expiry', reason: `Expiry date "${expiry}" is in the past`, severity: 'warning' });
    }
  }

  // Strength suggested for Tablet/Capsule
  if (['Tablet', 'Capsule'].includes(packagingType) && !row['Strength']) {
    warnings.push({ row: rowNum, field: 'Strength', reason: 'Strength (e.g. 500mg) is recommended for Tablets/Capsules', severity: 'warning' });
  }

  return { errors, warnings };
}

// ── Map Excel row → API payload ─────────────────────────────────────────────
function mapRowToPayload(row: any, index: number) {
  const name = row['Name'] || row['name'];
  const packagingType = row['Packaging Type'] || row['packaging_type'] || null;
  const baseUnit = row['Base Unit'] || row['base_unit'] || null;
  const stockStr = row['Stock'] || row['stock'] || row['Quantity'] || '0';
  const price = parseFloat(String(row['Full Pack Sale Price'] || row['Price'] || row['price'] || '0')) || 0;
  const unitRetailPrice = parseFloat(String(row['Unit Retail Price'] || '0')) || 0;
  const stripsPerBox = parseInt(String(row['Strips per Box'] || '0'), 10) || null;
  const unitsPerStrip = parseInt(String(row['Units per Strip'] || '0'), 10) || null;

  const packagingLevels: any[] = [];

  if (packagingType && ['Tablet', 'Capsule'].includes(packagingType) && stripsPerBox && unitsPerStrip) {
    const totalUnitsPerBox = stripsPerBox * unitsPerStrip;
    packagingLevels.push(
      { level_name: 'Box', conversion_qty: totalUnitsPerBox, is_purchase_unit: true, is_sale_unit: false, is_smallest_unit: false, sale_price: price },
      { level_name: 'Strip', conversion_qty: unitsPerStrip, is_purchase_unit: false, is_sale_unit: true, is_smallest_unit: false, sale_price: parseFloat((price / stripsPerBox).toFixed(2)) },
      { level_name: 'Tablet', conversion_qty: 1, is_purchase_unit: false, is_sale_unit: true, is_smallest_unit: true, sale_price: unitRetailPrice || parseFloat((price / totalUnitsPerBox).toFixed(2)) },
    );
  } else {
    packagingLevels.push({
      level_name: baseUnit || 'Pack',
      conversion_qty: 1,
      is_purchase_unit: true,
      is_sale_unit: true,
      is_smallest_unit: true,
      sale_price: price,
    });
  }

  return {
    name: String(name),
    generic_name: row['Generic Name'] || row['generic_name'] || null,
    manufacturer: row['Manufacturer'] || row['manufacturer'] || null,
    category: row['Category'] || row['category'] || 'Medicine',
    dosage_form: packagingType,
    base_unit: baseUnit,
    strips_per_box: stripsPerBox,
    units_per_strip: unitsPerStrip,
    strength: row['Strength'] || row['strength'] || null,
    shelf: row['Rack Location'] || row['rack_location'] || null,
    min_stock_level: parseInt(String(row['Low Stock Alert Level'] || '10'), 10) || 10,
    barcode: row['Barcode'] || row['barcode'] ? String(row['Barcode'] || row['barcode']) : null,
    unit_retail_price: unitRetailPrice,
    initial_batch: {
      batch_number: row['Batch'] || row['batch'] || `BATCH-${Date.now()}-${index}`,
      current_stock: parseInt(String(stockStr), 10) || 0,
      expiry_date: row['Expiry'] || row['expiry'] || '2030-12-31',
    },
    packaging_levels: packagingLevels,
  };
}

export default function BulkImportMedicines() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    valid: any[];
    invalid: any[];
    warnings: ValidationError[];
  } | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'errors' | 'warnings' | 'valid'>('errors');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useBulkImportMedicines();
  const router = useRouter();

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) { setFile(e.dataTransfer.files[0]); setValidationResults(null); }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) { setFile(e.target.files[0]); setValidationResults(null); }
  };

  const processFile = () => {
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' });
        const jsonData = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);

        const valid: any[] = [];
        const invalid: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        jsonData.forEach((row, index) => {
          const { errors, warnings: rowWarnings } = validateRow(row, index);
          if (errors.length > 0) {
            invalid.push(...errors);
          } else {
            valid.push(mapRowToPayload(row, index));
          }
          warnings.push(...rowWarnings);
        });

        setValidationResults({ valid, invalid, warnings });
        setActiveTab(invalid.length > 0 ? 'errors' : warnings.length > 0 ? 'warnings' : 'valid');
      } catch {
        toast.error('Failed to parse file. Please ensure it is a valid Excel or CSV.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => { toast.error('Error reading file'); setIsProcessing(false); };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!validationResults || validationResults.valid.length === 0) return;
    const items = validationResults.valid;
    const CHUNK_SIZE = 200;
    let totalSuccess = 0;
    let allFailed: any[] = [];
    setProgress({ current: 0, total: items.length });
    try {
      for (let i = 0; i < Math.ceil(items.length / CHUNK_SIZE); i++) {
        const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const res = await importMutation.mutateAsync(chunk);
        totalSuccess += res.success_count || 0;
        if (res.failed?.length > 0) allFailed = [...allFailed, ...res.failed];
        setProgress({ current: Math.min((i + 1) * CHUNK_SIZE, items.length), total: items.length });
      }
      if (allFailed.length > 0) {
        toast.error(`${allFailed.length} duplicates skipped. Imported ${totalSuccess}.`, { duration: 6000 });
      } else {
        toast.success(`Successfully imported ${totalSuccess} medicines!`);
      }
      router.push('/inventory/medicines');
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setProgress(null);
    }
  };

  const downloadTemplate = () => {
    const sample = [
      {
        'Name': 'Paracetamol 500mg', 'Generic Name': 'Paracetamol', 'Manufacturer': 'GSK',
        'Category': 'Painkiller', 'Packaging Type': 'Tablet', 'Base Unit': 'Box',
        'Strips per Box': 10, 'Units per Strip': 10, 'Strength': '500mg',
        'Rack Location': 'A-01', 'Low Stock Alert Level': 50,
        'Barcode': '123456789', 'Stock': 200, 'Batch': 'B001', 'Expiry': '2027-12-31',
        'Full Pack Sale Price': 250, 'Unit Retail Price': 2.50,
      },
      {
        'Name': 'Amoxil Syrup', 'Generic Name': 'Amoxicillin', 'Manufacturer': 'Pfizer',
        'Category': 'Antibiotic', 'Packaging Type': 'Syrup', 'Base Unit': 'Bottle',
        'Strips per Box': '', 'Units per Strip': '', 'Strength': '125mg/5ml',
        'Rack Location': 'B-03', 'Low Stock Alert Level': 20,
        'Barcode': '987654321', 'Stock': 50, 'Batch': 'S002', 'Expiry': '2026-06-30',
        'Full Pack Sale Price': 180, 'Unit Retail Price': 180,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: TEMPLATE_COLUMNS });
    // Style the header row bold (column widths)
    ws['!cols'] = TEMPLATE_COLUMNS.map((col) => ({ wch: Math.max(col.length + 4, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
    // Instructions sheet
    const instrData = [
      { Column: 'Name', Required: 'YES', Notes: 'Product display name' },
      { Column: 'Generic Name', Required: 'No', Notes: 'INN / generic molecule name' },
      { Column: 'Packaging Type', Required: 'Recommended', Notes: 'Tablet / Capsule / Syrup / Injection / Drops / Cream / Gel / Powder' },
      { Column: 'Units per Strip', Required: 'YES if Tablet/Capsule', Notes: 'e.g. 10' },
      { Column: 'Strips per Box', Required: 'Recommended', Notes: 'e.g. 10' },
      { Column: 'Strength', Required: 'Recommended', Notes: 'e.g. 500mg, 250ml' },
      { Column: 'Rack Location', Required: 'No', Notes: 'Physical shelf code, e.g. A-01' },
      { Column: 'Low Stock Alert Level', Required: 'No', Notes: 'Defaults to 10 if omitted' },
      { Column: 'Full Pack Sale Price', Required: 'No', Notes: 'Sale price for the full pack/box' },
      { Column: 'Unit Retail Price', Required: 'No', Notes: 'Per-tablet/per-unit price; auto-calculated if omitted' },
      { Column: 'Stock', Required: 'No', Notes: 'Opening stock quantity' },
      { Column: 'Expiry', Required: 'No', Notes: 'Format: YYYY-MM-DD' },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');
    XLSX.writeFile(wb, 'Medicine_Import_Template.xlsx');
  };

  const tabCounts = validationResults ? {
    errors: validationResults.invalid.length,
    warnings: validationResults.warnings.length,
    valid: validationResults.valid.length,
  } : { errors: 0, warnings: 0, valid: 0 };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between p-4 bg-white border-b dark:bg-zinc-900 dark:border-zinc-800 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/inventory/medicines" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bulk Import Medicines</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{TEMPLATE_COLUMNS.length} fields supported · Tablet/Capsule auto-packaging</p>
          </div>
        </div>
        <Button onClick={downloadTemplate} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30 gap-2">
          <Download className="w-4 h-4" /> Download Template
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
        <div className="w-full max-w-4xl space-y-6">

          {/* ── Column Map Info ── */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Supported Columns ({TEMPLATE_COLUMNS.length})</span>
              <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-medium">Download template for exact column names</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => {
                const isRequired = col === 'Name';
                const isNew = ['Packaging Type', 'Base Unit', 'Strips per Box', 'Units per Strip', 'Strength', 'Rack Location', 'Low Stock Alert Level', 'Full Pack Sale Price', 'Unit Retail Price'].includes(col);
                return (
                  <span key={col} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    isRequired
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      : isNew
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-white text-indigo-700 border-indigo-200 dark:bg-zinc-900 dark:text-indigo-400 dark:border-indigo-900'
                  }`}>
                    {col}
                    {isRequired && ' *'}
                    {isNew && !isRequired && ' ✦'}
                  </span>
                );
              })}
            </div>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-500 mt-2">
              <span className="font-bold text-red-600">*</span> Required &nbsp;|&nbsp;
              <span className="font-bold text-emerald-600">✦</span> New fields (upgrade)
            </p>
          </div>

          {/* ── Drop Zone ── */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border dark:border-zinc-800 shadow-sm text-center">
            <h2 className="text-xl font-bold mb-2">Upload Excel or CSV</h2>
            <p className="text-slate-500 text-sm mb-6">File will be validated locally before sending to server.</p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-12 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer flex flex-col items-center justify-center"
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Drag & drop your file here</p>
              <p className="text-sm text-slate-500 mt-1">or click to browse · .xlsx, .csv accepted</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} />
            </div>

            {file && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-left">
                    <p className="font-semibold text-indigo-900 dark:text-indigo-300">{file.name}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button onClick={processFile} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Validate File'}
                </Button>
              </div>
            )}
          </div>

          {/* ── Validation Summary ── */}
          {validationResults && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 divide-x dark:divide-zinc-800">
                <button
                  onClick={() => setActiveTab('errors')}
                  className={`p-5 flex items-center gap-3 transition-colors ${activeTab === 'errors' ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                >
                  <XCircle className={`w-8 h-8 ${tabCounts.errors > 0 ? 'text-red-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
                  <div className="text-left">
                    <p className={`text-2xl font-bold ${tabCounts.errors > 0 ? 'text-red-700 dark:text-red-400' : 'text-zinc-400'}`}>{tabCounts.errors}</p>
                    <p className="text-xs font-medium text-slate-500">Row Errors</p>
                  </div>
                  {activeTab === 'errors' && <div className="ml-auto w-1 h-8 bg-red-500 rounded-full" />}
                </button>

                <button
                  onClick={() => setActiveTab('warnings')}
                  className={`p-5 flex items-center gap-3 transition-colors ${activeTab === 'warnings' ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                >
                  <AlertTriangle className={`w-8 h-8 ${tabCounts.warnings > 0 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
                  <div className="text-left">
                    <p className={`text-2xl font-bold ${tabCounts.warnings > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-400'}`}>{tabCounts.warnings}</p>
                    <p className="text-xs font-medium text-slate-500">Warnings</p>
                  </div>
                  {activeTab === 'warnings' && <div className="ml-auto w-1 h-8 bg-amber-400 rounded-full" />}
                </button>

                <button
                  onClick={() => setActiveTab('valid')}
                  className={`p-5 flex items-center gap-3 transition-colors ${activeTab === 'valid' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                >
                  <CheckCircle className={`w-8 h-8 ${tabCounts.valid > 0 ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
                  <div className="text-left">
                    <p className={`text-2xl font-bold ${tabCounts.valid > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-400'}`}>{tabCounts.valid}</p>
                    <p className="text-xs font-medium text-slate-500">Ready to Import</p>
                  </div>
                  {activeTab === 'valid' && <div className="ml-auto w-1 h-8 bg-emerald-500 rounded-full" />}
                </button>
              </div>

              {/* Tab Content */}
              <div className="border-t dark:border-zinc-800 p-5">
                {activeTab === 'errors' && (
                  tabCounts.errors === 0
                    ? <p className="text-center text-sm text-slate-500 py-4">No errors found.</p>
                    : <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {validationResults.invalid.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <span className="font-bold text-red-700 dark:text-red-400">Row {err.row}</span>
                              <span className="mx-1 text-red-400">·</span>
                              <span className="font-semibold text-red-600">{err.field}</span>
                              <span className="mx-1 text-red-400">—</span>
                              <span className="text-red-700 dark:text-red-300">{err.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                )}

                {activeTab === 'warnings' && (
                  tabCounts.warnings === 0
                    ? <p className="text-center text-sm text-slate-500 py-4">No warnings.</p>
                    : <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {validationResults.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <span className="font-bold text-amber-700 dark:text-amber-400">Row {w.row}</span>
                              <span className="mx-1 text-amber-400">·</span>
                              <span className="font-semibold text-amber-600">{w.field}</span>
                              <span className="mx-1 text-amber-400">—</span>
                              <span className="text-amber-800 dark:text-amber-300">{w.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                )}

                {activeTab === 'valid' && (
                  tabCounts.valid === 0
                    ? <p className="text-center text-sm text-slate-500 py-4">No valid records to show.</p>
                    : <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {validationResults.valid.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-3 py-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{item.name}</span>
                            {item.dosage_form && <span className="text-[10px] text-emerald-600 dark:text-emerald-500 ml-1">[{item.dosage_form}]</span>}
                            {item.strength && <span className="text-[10px] text-emerald-600 dark:text-emerald-500">{item.strength}</span>}
                            <span className="ml-auto text-[10px] text-emerald-600">{item.initial_batch?.current_stock ?? 0} units</span>
                          </div>
                        ))}
                      </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t dark:border-zinc-800 p-4 flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50">
                <p className="text-xs text-slate-500">
                  {tabCounts.errors > 0 && (
                    <span className="text-red-600 font-semibold">{tabCounts.errors} row{tabCounts.errors !== 1 ? 's' : ''} will be skipped. </span>
                  )}
                  {tabCounts.valid > 0 && <span className="text-emerald-600 font-semibold">{tabCounts.valid} records ready.</span>}
                </p>
                <div className="flex gap-2">
                  {progress && (
                    <div className="flex items-center gap-2 mr-2">
                      <div className="w-32 bg-slate-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{progress.current}/{progress.total}</span>
                    </div>
                  )}
                  <Button variant="outline" onClick={() => setValidationResults(null)} disabled={importMutation.isPending || !!progress}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={tabCounts.valid === 0 || importMutation.isPending || !!progress}
                    onClick={handleImport}
                  >
                    {progress
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                      : `Import ${tabCounts.valid} Records`}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
