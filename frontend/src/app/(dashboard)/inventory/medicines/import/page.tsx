"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2, XCircle, Info, FileUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useBulkImportMedicines } from '@/features/inventory/services/medicine.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Column specification (single source of truth) ──────────────────────────
const TEMPLATE_COLUMNS = [
  'Name', 'Generic Name', 'Manufacturer', 'Category',
  'Packaging Type', 'Base Unit', 'Strips per Box', 'Units per Strip',
  'Strength', 'Rack Location', 'Low Stock Alert Level',
  'Barcode', 'Stock', 'Batch', 'Expiry',
  'Full Pack Purchase Price', 'Unit Purchase Price',
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
  const stock = parseFloat(String(row['Stock'] || row['stock'] || row['Quantity'] || '0'));
  if (isNaN(stock)) {
    errors.push({ row: rowNum, field: 'Stock', reason: `Stock must be a valid number`, severity: 'error' });
  }

  // Prices should be numbers
  const salePrice = row['Full Pack Sale Price'] || row['Price'] || row['price'];
  if (salePrice && isNaN(Number(salePrice))) {
    errors.push({ row: rowNum, field: 'Full Pack Sale Price', reason: `Price must be a number`, severity: 'error' });
  }

  const fullPackPurchase = row['Full Pack Purchase Price'];
  const unitPurchase = row['Unit Purchase Price'];

  if (fullPackPurchase && isNaN(Number(fullPackPurchase))) {
    errors.push({ row: rowNum, field: 'Full Pack Purchase Price', reason: `Must be a valid number`, severity: 'error' });
  }
  if (unitPurchase && isNaN(Number(unitPurchase))) {
    errors.push({ row: rowNum, field: 'Unit Purchase Price', reason: `Must be a valid number`, severity: 'error' });
  }

  // Purchase Price is required if Stock > 0 (Accounting rule)
  if (stock > 0 && !fullPackPurchase && !unitPurchase) {
    errors.push({ row: rowNum, field: 'Purchase Price', reason: `Opening stock detected (${stock}). Purchase price is REQUIRED for accounting valuation. Provide either Full Pack or Unit Purchase Price.`, severity: 'error' });
  }

  // Expiry date basic check
  const expiry = row['Expiry'] || row['expiry'];
  if (expiry) {
    const d = new Date(expiry);
    if (isNaN(d.getTime())) {
      errors.push({ row: rowNum, field: 'Expiry', reason: `Invalid expiry date. Use YYYY-MM-DD`, severity: 'error' });
    } else if (d < new Date()) {
      warnings.push({ row: rowNum, field: 'Expiry', reason: `Expiry date is in the past`, severity: 'warning' });
    }
  }

  // Strength suggested for Tablet/Capsule
  if (['Tablet', 'Capsule'].includes(packagingType) && !row['Strength']) {
    warnings.push({ row: rowNum, field: 'Strength', reason: 'Strength is recommended for Tablets/Capsules', severity: 'warning' });
  }

  return { errors, warnings };
}

// ── Map Excel row → API payload ─────────────────────────────────────────────
function mapRowToPayload(row: any, index: number) {
  const name = row['Name'] || row['name'];
  const packagingType = row['Packaging Type'] || row['packaging_type'] || null;
  const baseUnit = row['Base Unit'] || row['base_unit'] || null;
  const stockQty = parseInt(String(row['Stock'] || row['stock'] || row['Quantity'] || '0'), 10) || 0;
  
  const salePrice = parseFloat(String(row['Full Pack Sale Price'] || row['Price'] || row['price'] || '0')) || 0;
  const unitRetailPrice = parseFloat(String(row['Unit Retail Price'] || '0')) || 0;
  
  const fullPackPurchase = parseFloat(String(row['Full Pack Purchase Price'] || '0')) || 0;
  let unitPurchase = parseFloat(String(row['Unit Purchase Price'] || '0')) || 0;

  const stripsPerBox = parseInt(String(row['Strips per Box'] || '0'), 10) || null;
  const unitsPerStrip = parseInt(String(row['Units per Strip'] || '0'), 10) || null;

  let totalUnitsPerBox = 1;
  if (packagingType && ['Tablet', 'Capsule'].includes(packagingType) && stripsPerBox && unitsPerStrip) {
    totalUnitsPerBox = stripsPerBox * unitsPerStrip;
  }

  // Auto-calculate missing purchase prices
  if (fullPackPurchase > 0 && unitPurchase === 0) {
    unitPurchase = parseFloat((fullPackPurchase / totalUnitsPerBox).toFixed(4));
  } else if (unitPurchase > 0 && fullPackPurchase === 0) {
    // optional: backward calculation if needed, but unitPurchase is what matters to backend
  }

  const packagingLevels: any[] = [];

  if (packagingType && ['Tablet', 'Capsule'].includes(packagingType) && stripsPerBox && unitsPerStrip) {
    packagingLevels.push(
      { level_name: 'Box', conversion_qty: totalUnitsPerBox, is_purchase_unit: true, is_sale_unit: false, is_smallest_unit: false, sale_price: salePrice },
      { level_name: 'Strip', conversion_qty: unitsPerStrip, is_purchase_unit: false, is_sale_unit: true, is_smallest_unit: false, sale_price: parseFloat((salePrice / stripsPerBox).toFixed(2)) },
      { level_name: 'Tablet', conversion_qty: 1, is_purchase_unit: false, is_sale_unit: true, is_smallest_unit: true, sale_price: unitRetailPrice || parseFloat((salePrice / totalUnitsPerBox).toFixed(2)) },
    );
  } else {
    packagingLevels.push({
      level_name: baseUnit || 'Pack',
      conversion_qty: 1,
      is_purchase_unit: true,
      is_sale_unit: true,
      is_smallest_unit: true,
      sale_price: salePrice,
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
    cost_per_base_unit: unitPurchase, // Maps base unit cost
    initial_batch: {
      batch_number: row['Batch'] || row['batch'] || `BATCH-${Date.now()}-${index}`,
      current_stock: stockQty,
      expiry_date: row['Expiry'] || row['expiry'] || '2030-12-31',
      purchase_price: unitPurchase, // Crucial for accounting auto-post
    },
    packaging_levels: packagingLevels,
  };
}

// ── Animations ──────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function BulkImportMedicines() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) { 
      setFile(e.dataTransfer.files[0]); 
      setValidationResults(null); 
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }

  const handleDragLeave = () => {
    setIsDragging(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) { 
      setFile(e.target.files[0]); 
      setValidationResults(null); 
    }
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
        'Full Pack Purchase Price': 100, 'Unit Purchase Price': 1.00,
        'Full Pack Sale Price': 250, 'Unit Retail Price': 2.50,
      },
      {
        'Name': 'Amoxil Syrup', 'Generic Name': 'Amoxicillin', 'Manufacturer': 'Pfizer',
        'Category': 'Antibiotic', 'Packaging Type': 'Syrup', 'Base Unit': 'Bottle',
        'Strips per Box': '', 'Units per Strip': '', 'Strength': '125mg/5ml',
        'Rack Location': 'B-03', 'Low Stock Alert Level': 20,
        'Barcode': '987654321', 'Stock': 50, 'Batch': 'S002', 'Expiry': '2026-06-30',
        'Full Pack Purchase Price': 120, 'Unit Purchase Price': 120,
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
      { Column: 'Full Pack Purchase Price', Required: 'YES if Stock > 0', Notes: 'Purchase cost for the full pack/box' },
      { Column: 'Unit Purchase Price', Required: 'YES if Stock > 0', Notes: 'Per-tablet/per-unit purchase cost' },
      { Column: 'Full Pack Sale Price', Required: 'No', Notes: 'Sale price for the full pack/box' },
      { Column: 'Unit Retail Price', Required: 'No', Notes: 'Per-tablet/per-unit price; auto-calculated if omitted' },
      { Column: 'Stock', Required: 'No', Notes: 'Opening stock quantity' },
      { Column: 'Expiry', Required: 'No', Notes: 'Format: YYYY-MM-DD' },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');
    XLSX.writeFile(wb, 'Medicine_Import_Template.xlsx');
  };

  const tabCounts = validationResults ? {
    errors: validationResults.invalid.length,
    warnings: validationResults.warnings.length,
    valid: validationResults.valid.length,
  } : { errors: 0, warnings: 0, valid: 0 };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50 dark:bg-zinc-950">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between p-5 bg-white/80 backdrop-blur-xl border-b dark:bg-zinc-900/80 dark:border-zinc-800 shrink-0 shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href="/inventory/medicines" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Bulk Data Importer <Sparkles className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Initialize stock, valuations, and packaging configurations seamlessly.</p>
          </div>
        </div>
        <Button onClick={downloadTemplate} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30 gap-2 font-semibold shadow-sm transition-all hover:scale-[1.02]">
          <Download className="w-4 h-4" /> Download Excel Template
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex justify-center items-start">
        <motion.div 
          className="w-full max-w-5xl space-y-8"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >

          {/* ── Column Map Info ── */}
          <motion.div variants={itemVariants} className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="text-base font-bold text-slate-800 dark:text-slate-200">Supported Schema Fields ({TEMPLATE_COLUMNS.length})</span>
              <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                New: Accounting Valuation
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_COLUMNS.map((col) => {
                const isRequired = col === 'Name';
                const isNew = ['Full Pack Purchase Price', 'Unit Purchase Price', 'Packaging Type', 'Base Unit', 'Strips per Box', 'Units per Strip', 'Strength', 'Rack Location', 'Low Stock Alert Level', 'Full Pack Sale Price', 'Unit Retail Price'].includes(col);
                const isFinance = ['Full Pack Purchase Price', 'Unit Purchase Price'].includes(col);
                return (
                  <span key={col} className={`text-[12px] font-semibold px-2.5 py-1 rounded-md border shadow-sm transition-all ${
                    isRequired
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                      : isFinance
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50'
                      : isNew
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700'
                  }`}>
                    {col}
                    {isRequired && <span className="ml-1 text-red-500">*</span>}
                    {isFinance && <span className="ml-1 text-amber-500">💰</span>}
                  </span>
                );
              })}
            </div>
          </motion.div>

          {/* ── Drop Zone ── */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-200/20 dark:shadow-none text-center relative overflow-hidden group">
            
            {/* Background glowing effects */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">Upload Dataset</h2>
            <p className="text-slate-500 font-medium text-sm mb-8">Files are parsed and validated entirely in your browser.</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-14 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center relative z-10 
                ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-400 scale-[1.02]' : 'border-slate-300 dark:border-zinc-700 bg-slate-50/30 dark:bg-zinc-950/30 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-900'}
              `}
            >
              <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-700 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all">
                <FileUp className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="font-bold text-lg text-slate-700 dark:text-slate-300">Drag & drop your template here</p>
              <p className="text-sm font-medium text-slate-500 mt-2 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full border dark:border-zinc-700 shadow-sm">Select .xlsx or .csv</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} />
            </div>

            <AnimatePresence>
              {file && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/30 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                      <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button onClick={processFile} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-600/20">
                    {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Validate Engine'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Validation Summary ── */}
          <AnimatePresence>
            {validationResults && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden"
              >
                {/* Summary Stats */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-zinc-800">
                  <button
                    onClick={() => setActiveTab('errors')}
                    className={`p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${activeTab === 'errors' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    {activeTab === 'errors' && <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-1 bg-red-500" />}
                    <div className={`p-3 rounded-xl ${tabCounts.errors > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className={`text-3xl font-black ${tabCounts.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-zinc-500'}`}>{tabCounts.errors}</p>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">Blockers</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('warnings')}
                    className={`p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${activeTab === 'warnings' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    {activeTab === 'warnings' && <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-1 bg-amber-500" />}
                    <div className={`p-3 rounded-xl ${tabCounts.warnings > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className={`text-3xl font-black ${tabCounts.warnings > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-500'}`}>{tabCounts.warnings}</p>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">Warnings</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('valid')}
                    className={`p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${activeTab === 'valid' ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    {activeTab === 'valid' && <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />}
                    <div className={`p-3 rounded-xl ${tabCounts.valid > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className={`text-3xl font-black ${tabCounts.valid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`}>{tabCounts.valid}</p>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">Ready</p>
                    </div>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="border-t border-slate-100 dark:border-zinc-800 p-6 bg-slate-50/30 dark:bg-zinc-900/30 min-h-[300px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {activeTab === 'errors' && (
                        tabCounts.errors === 0
                          ? <div className="h-64 flex flex-col items-center justify-center text-slate-400"><CheckCircle className="w-12 h-12 mb-3 text-slate-200 dark:text-zinc-800" /><p className="font-medium">Zero errors detected. Great job!</p></div>
                          : <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                              {validationResults.invalid.map((err, i) => (
                                <div key={i} className="flex items-start gap-3 bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-black px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-md">Row {err.row}</span>
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{err.field}</span>
                                    </div>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">{err.reason}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                      )}

                      {activeTab === 'warnings' && (
                        tabCounts.warnings === 0
                          ? <div className="h-64 flex flex-col items-center justify-center text-slate-400"><CheckCircle className="w-12 h-12 mb-3 text-slate-200 dark:text-zinc-800" /><p className="font-medium">No warnings found.</p></div>
                          : <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                              {validationResults.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-3 bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-black px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-md">Row {w.row}</span>
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{w.field}</span>
                                    </div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{w.reason}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                      )}

                      {activeTab === 'valid' && (
                        tabCounts.valid === 0
                          ? <div className="h-64 flex flex-col items-center justify-center text-slate-400"><FileSpreadsheet className="w-12 h-12 mb-3 text-slate-200 dark:text-zinc-800" /><p className="font-medium">No valid records available yet.</p></div>
                          : <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                              {validationResults.valid.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {item.dosage_form && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded uppercase tracking-wider">{item.dosage_form}</span>}
                                      {item.strength && <span className="text-[11px] font-medium text-slate-500">{item.strength}</span>}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right shrink-0 px-4 border-l dark:border-zinc-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Qty</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">{item.initial_batch?.current_stock ?? 0}</p>
                                  </div>
                                  <div className="text-right shrink-0 px-2 min-w-[80px]">
                                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-0.5">Valuation</p>
                                    <p className="text-sm font-black text-amber-600 dark:text-amber-500">
                                      ${((item.initial_batch?.current_stock || 0) * (item.initial_batch?.purchase_price || 0)).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-200 dark:border-zinc-800 p-5 flex justify-between items-center bg-white dark:bg-zinc-900">
                  <div className="text-sm font-medium">
                    {tabCounts.errors > 0 ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-2"><XCircle className="w-4 h-4"/> Fix errors to import full batch</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Ready for secure upload</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {progress && (
                      <div className="flex items-center gap-3 mr-4">
                        <div className="w-48 bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden shadow-inner">
                          <motion.div 
                            className="bg-emerald-500 h-3 rounded-full" 
                            initial={{ width: 0 }}
                            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                            transition={{ ease: "easeInOut" }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-500">{Math.round((progress.current / progress.total) * 100)}%</span>
                      </div>
                    )}
                    <Button variant="ghost" onClick={() => setValidationResults(null)} disabled={importMutation.isPending || !!progress} className="font-bold hover:bg-slate-100 dark:hover:bg-zinc-800">
                      Cancel
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold px-8 py-6 h-auto text-base transition-all hover:scale-[1.02]"
                      disabled={tabCounts.valid === 0 || importMutation.isPending || !!progress}
                      onClick={handleImport}
                    >
                      {progress
                        ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Synchronizing...</>
                        : `Import ${tabCounts.valid} Records`}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
