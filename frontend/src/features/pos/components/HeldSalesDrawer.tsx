import { useHeldSales, useDeleteSale } from '../services/pos.api';
import { usePOSStore } from '../store/pos-store';
import { format } from 'date-fns'; // I will just use native date formatting to avoid deps
import { Clock, RefreshCw, X } from 'lucide-react';

export default function HeldSalesDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { data: heldSales, isLoading, refetch, isFetching } = useHeldSales();
  const deleteSaleMutation = useDeleteSale();
  const loadCart = usePOSStore(state => state.loadCart);

  const handleResumeSale = (sale: any) => {
    loadCart(sale.items, sale.customer_id);
    deleteSaleMutation.mutate(sale.id, {
      onSuccess: () => onClose()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all">
      <div className="flex h-full w-96 flex-col bg-white shadow-2xl dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <Clock size={20} className="text-blue-500" />
            Held Sales
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => refetch()} 
              disabled={isFetching}
              className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-blue-500 disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>}
          
          {!isLoading && (!heldSales || heldSales.length === 0) && (
            <div className="text-center py-12 text-zinc-400">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p>No parked sales found.</p>
            </div>
          )}

          {heldSales?.map(sale => (
            <div key={sale.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{sale.invoice_number}</p>
                  <p className="text-xs text-zinc-500">{new Date(sale.sale_date.endsWith('Z') ? sale.sale_date : sale.sale_date + 'Z').toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <span className="font-mono font-bold text-blue-600">Rs {sale.total_amount.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => handleResumeSale(sale)}
                disabled={deleteSaleMutation.isPending}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={deleteSaleMutation.isPending && deleteSaleMutation.variables === sale.id ? "animate-spin" : ""} />
                {deleteSaleMutation.isPending && deleteSaleMutation.variables === sale.id ? "Resuming..." : "Resume Sale"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
