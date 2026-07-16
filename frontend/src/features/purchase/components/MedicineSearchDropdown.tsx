'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Medicine } from '@/features/inventory/types/inventory';
import { Search, ChevronDown, PackageSearch, Loader2, AlertTriangle, Package, X } from 'lucide-react';

export interface MedicineSearchDropdownProps {
  value: Medicine | null;
  onChange: (med: Medicine | null) => void;
  disabledIds?: string[];
}

export function MedicineSearchDropdown({ value, onChange, disabledIds = [] }: MedicineSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data, isLoading } = useMedicines(query || undefined, 1, 50);
  const medicines = data?.items || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(med: Medicine) {
    onChange(med);
    setQuery('');
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery('');
  }

  const filtered: Medicine[] = medicines.filter((m: Medicine) => !disabledIds.includes(m.id));
  const isLow = value && value.total_quantity <= value.reorder_level;

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white shadow-sm text-sm transition-colors">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Package size={9} className="text-white" />
          </div>
          <span className="flex-1 truncate text-xs font-semibold text-slate-700">{value.name}</span>
          {isLow && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
              <AlertTriangle size={8} /> LOW
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-red-500 transition-colors shrink-0 hover:bg-red-50 rounded p-0.5"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center h-9 px-3 rounded-lg border transition-all duration-200 cursor-text"
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        >
          <Search size={12} className="text-slate-400 shrink-0 mr-2" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search medicine…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent text-xs outline-none placeholder-slate-400 text-slate-700"
          />
          <ChevronDown
            size={12}
            className="text-slate-400 shrink-0 ml-1 transition-transform duration-200"
          />
        </div>
      )}

      <AnimatePresence>
        {open && !value && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-xs">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                Searching inventory…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400 text-xs">
                <PackageSearch size={20} className="text-slate-300" />
                {query ? `No results for "${query}"` : 'Type to search medicines'}
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((med: Medicine) => {
                  const stockLow = med.total_quantity <= med.reorder_level;
                  const stockOut = med.total_quantity <= 0;
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelect(med)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between gap-3 group border-b border-slate-50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700">{med.name}</p>
                        {med.generic_name && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{med.generic_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-700">
                          {med.total_quantity} {med.base_unit}
                        </p>
                        {(stockOut || stockLow) && (
                          <span className={`text-[9px] font-semibold ${stockOut ? 'text-red-500' : 'text-amber-500'}`}>
                            {stockOut ? '✕ Out of stock' : '⚠ Low stock'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
