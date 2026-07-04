"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, Download, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function BulkImportMedicines() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<{valid: number, invalid: number} | null>(null);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const simulateValidation = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setValidationResults({ valid: 145, invalid: 3 });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b dark:bg-zinc-900 dark:border-zinc-800 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/inventory/medicines" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bulk Import Medicines</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-900/30">
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
        <div className="w-full max-w-3xl space-y-6">
          
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border dark:border-zinc-800 shadow-sm text-center">
            <h2 className="text-xl font-bold mb-2">Upload Excel or CSV</h2>
            <p className="text-slate-500 text-sm mb-6">Make sure your file matches the template structure to avoid mapping errors.</p>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-12 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer flex flex-col items-center justify-center"
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Drag & drop your file here</p>
              <p className="text-sm text-slate-500 mt-1">or click to browse from computer</p>
              <input type="file" className="hidden" accept=".csv, .xlsx" />
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
                <Button onClick={simulateValidation} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isUploading ? 'Validating...' : 'Validate File'}
                </Button>
              </div>
            )}
          </div>

          {validationResults && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold mb-4">Validation Results</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{validationResults.valid}</p>
                    <p className="text-sm font-medium text-emerald-600">Valid Records</p>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30 flex items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{validationResults.invalid}</p>
                    <p className="text-sm font-medium text-red-600">Errors Found</p>
                  </div>
                </div>
              </div>

              {validationResults.invalid > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30 mb-6">
                   <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">Please fix the errors in your file and upload again. Download the error report to see specific rows.</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={validationResults.invalid > 0}>
                  Import {validationResults.valid} Records
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
