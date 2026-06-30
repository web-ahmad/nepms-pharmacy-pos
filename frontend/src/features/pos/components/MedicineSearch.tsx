'use client';

import { useState, useEffect } from 'react';
import { useSearchMedicines } from '../services/pos.api';
import { usePOSStore } from '../store/pos-store';
import { POSMedicine } from '../types/pos';
import { Search, Package, Plus, Loader2 } from 'lucide-react';

export default function MedicineSearch({ searchInputRef }: { searchInputRef: React.RefObject<HTMLInputElement | null> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeGenericFilter, setActiveGenericFilter] = useState<string | null>(null);
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<POSMedicine | null>(null);
  
  const { data: medicines, isLoading, isError } = useSearchMedicines(debouncedSearch);
  const addItem = usePOSStore((state) => state.addItem);

  // Clear filter if user typed something different from the active filter
  useEffect(() => {
    if (activeGenericFilter && searchTerm !== activeGenericFilter) {
      setActiveGenericFilter(null);
    }
  }, [searchTerm, activeGenericFilter]);

  // Simple debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Helper function to extract correct stock value
  const getStock = (med: any) => {
    return med.total_quantity ?? med.available_quantity ?? med.current_stock ?? med.stock ?? med.quantity ?? 0;
  };

  const handleAdd = (medicine: POSMedicine) => {
    console.log("Product from API:", medicine); 
    const stock = getStock(medicine);

    if (stock > 0) {
      if (medicine.batches && medicine.batches.length > 0) {
        if (medicine.batches.length === 1) {
          // Auto-select if only 1 batch
          addItem(medicine, 1, medicine.batches[0]);
          setSearchTerm(''); 
          setActiveGenericFilter(null);
          searchInputRef.current?.focus();
        } else {
          // Show batch selection modal
          setSelectedMedForBatch(medicine);
        }
      } else {
        addItem(medicine);
        setSearchTerm(''); 
        setActiveGenericFilter(null);
        searchInputRef.current?.focus();
      }
    } else {
      console.warn("Item out of stock or stock undefined!", medicine);
    }
  };

  const handleBatchSelect = (batch: any) => {
    if (selectedMedForBatch) {
      addItem(selectedMedForBatch, 1, batch);
      setSelectedMedForBatch(null);
      setSearchTerm('');
      setActiveGenericFilter(null);
      searchInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, medicine: POSMedicine) => {
    if (e.key === 'Enter') {
      handleAdd(medicine);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-outline-variant space-y-md shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input
            id="medicine-search"
            ref={searchInputRef}
            type="text"
            className="w-full pl-10 pr-12 py-2.5 bg-white border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md shadow-sm"
            placeholder="Search Medicine (F2)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-outline font-bold">F2</span>
        </div>
        
        {activeGenericFilter && (
          <div className="flex items-center justify-between rounded-md bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Alternates for: <strong>{activeGenericFilter}</strong>
            </span>
            <button 
              onClick={() => {
                setActiveGenericFilter(null);
                setSearchTerm('');
              }}
              className="text-blue-600 hover:text-blue-800 font-bold underline"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-sm hide-scrollbar">
        {isLoading && searchTerm.length >= 2 && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-sm text-error p-2">Failed to search inventory.</div>
        )}

        {!isLoading && medicines?.length === 0 && searchTerm.length >= 2 && (
          <div className="text-center text-sm text-outline p-4">
            No active items found.
          </div>
        )}

        {(activeGenericFilter 
          ? (medicines || []).filter((med: any) => med.generic_name?.toLowerCase() === activeGenericFilter.toLowerCase())
          : (medicines || [])
        ).map((med: any) => {
          const stock = getStock(med);
          
          return (
            <div 
              key={med.id}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, med)}
              className={`p-4 border rounded-lg cursor-pointer transition-all bg-white group active:scale-[0.98] ${
                stock > 0 
                  ? 'border-outline-variant hover:border-primary' 
                  : 'border-red-200 bg-red-50 opacity-60'
              }`}
              onClick={() => handleAdd(med)}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-title-md text-body-md font-bold text-on-surface line-clamp-1 flex-1 pr-2">{med.name}</h3>
                <span className="text-primary font-bold whitespace-nowrap">Rs {med.sale_price?.toFixed(2) || '0.00'}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <p className="text-body-sm text-on-surface-variant flex-1 line-clamp-1">
                  {med.generic_name || 'No generic'}
                </p>
                {med.generic_name && activeGenericFilter !== med.generic_name && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGenericFilter(med.generic_name);
                      setSearchTerm(med.generic_name);
                    }}
                    className="ml-2 rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant transition-colors whitespace-nowrap"
                  >
                    View Alternates
                  </button>
                )}
              </div>
              
              <div className="flex justify-between items-center text-label-md">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded border ${
                    stock > 10 ? 'bg-green-50 text-green-700 border-green-200' : 
                    stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    Stock: {stock} {stock > 0 && stock <= 10 ? '(Low)' : ''}
                  </span>
                  {med.shelf && (
                    <span className="px-2 py-0.5 rounded border bg-zinc-100 text-zinc-700 border-zinc-200 flex items-center">
                      Shelf: {med.shelf}
                    </span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  med.batches && med.batches.length > 0 ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {med.batches && med.batches.length > 0 ? (
                    med.batches.length === 1 ? `Batch: ${med.batches[0].batch_number}` : `${med.batches.length} Batches`
                  ) : 'No batch'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Selection Modal */}
      {selectedMedForBatch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-bold text-on-surface">Select Batch</h3>
              <p className="text-body-sm text-on-surface-variant line-clamp-1">{selectedMedForBatch.name}</p>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto space-y-2">
              {selectedMedForBatch.batches?.map(batch => (
                <button
                  key={batch.id}
                  onClick={() => handleBatchSelect(batch)}
                  className="w-full text-left p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container-lowest transition-colors flex justify-between items-center group"
                >
                  <div>
                    <div className="font-bold text-sm text-on-surface group-hover:text-primary">
                      Batch: {batch.batch_number}
                    </div>
                    <div className="text-xs text-on-surface-variant flex gap-3 mt-1">
                      <span>Exp: <span className={new Date(batch.expiry_date) < new Date() ? 'text-red-500 font-bold' : ''}>{batch.expiry_date}</span></span>
                      <span>Stock: {batch.available_quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-primary">Rs {batch.selling_price || selectedMedForBatch.sale_price}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-outline-variant">
              <button
                onClick={() => {
                  setSelectedMedForBatch(null);
                  searchInputRef.current?.focus();
                }}
                className="w-full py-2 bg-surface-container text-on-surface rounded-lg font-medium hover:bg-surface-container-high transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}