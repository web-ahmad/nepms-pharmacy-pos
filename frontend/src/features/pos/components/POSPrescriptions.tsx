import { useState } from 'react';
import { useCustomerPrescriptions } from '@/features/prescriptions/services/prescription.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { usePOSStore } from '@/features/pos/store/pos-store';
import { FileText, AlertCircle, ShoppingCart, CheckCircle2 } from 'lucide-react';

export default function POSPrescriptions({ customerId }: { customerId: string }) {
  const { data: prescriptionsData, isLoading } = useCustomerPrescriptions(customerId);
  const { data: inventoryResponse } = useMedicines('', 1, 1000); // Fetch a large limit for importing
  const inventory = inventoryResponse?.items;
  const prescriptions = prescriptionsData?.items;
  const addItem = usePOSStore(state => state.addItem);
  const [importedRx, setImportedRx] = useState<Set<string>>(new Set());

  if (!customerId) return null;
  if (isLoading) return <div className="text-xs text-zinc-500 animate-pulse mt-2">Checking prescriptions...</div>;
  if (!prescriptions || prescriptions.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRx = prescriptions.filter(p => p.status === 'Active' && (!p.valid_until || new Date(p.valid_until) >= today));
  const expiredRx = prescriptions.filter(p => (p.status === 'Expired') || (p.status === 'Active' && p.valid_until && new Date(p.valid_until) < today));

  const handleImport = (rxId: string, items: any[]) => {
    if (!inventory) return;
    
    items.forEach(rxItem => {
      // Find matching medicine in inventory by exact name or ID if available
      const med = inventory.find((i: any) => 
        (rxItem.medicine_id && i.id === rxItem.medicine_id) || 
        i.name.toLowerCase() === rxItem.medicine_name.toLowerCase()
      );
      
      if (med) {
        // Assume default quantity of 1 or try to parse from string
        let qtyToImport = 1;
        if (rxItem.quantity) {
          const parsed = parseInt(rxItem.quantity);
          if (!isNaN(parsed)) qtyToImport = parsed;
        }
        
        addItem(med, qtyToImport);
      } else {
        alert(`Medicine "${rxItem.medicine_name}" from prescription not found in inventory.`);
      }
    });

    setImportedRx(prev => new Set(prev).add(rxId));
  };

  return (
    <div className="mt-3 space-y-2 border-t border-zinc-200 dark:border-zinc-700 pt-3">
      <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
        <FileText size={14} /> Prescriptions
      </div>
      
      {expiredRx.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Patient has {expiredRx.length} expired prescription(s). Verify valid Rx before dispensing restricted medicines.</span>
        </div>
      )}

      {activeRx.length > 0 ? (
        <div className="space-y-2">
          {activeRx.map(rx => (
            <div key={rx.id} className="bg-white dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Dr. {rx.doctor_name || 'Unknown'}</span>
                {importedRx.has(rx.id) ? (
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Imported</span>
                ) : (
                  <button 
                    onClick={() => handleImport(rx.id, rx.items)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ShoppingCart size={12} /> Import to Cart
                  </button>
                )}
              </div>
              <div className="text-zinc-500">
                {rx.items.length} items • Valid till {rx.valid_until || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 italic">No active prescriptions found.</div>
      )}
    </div>
  );
}
