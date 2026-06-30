import { usePendingVerificationSales } from '../services/pos.api';
import { Clock, RefreshCw, X, Receipt } from 'lucide-react';

interface VerificationQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSale: (sale: any) => void;
}

export default function VerificationQueueDrawer({ isOpen, onClose, onSelectSale }: VerificationQueueDrawerProps) {
  const { data: pendingSales, isLoading, refetch } = usePendingVerificationSales();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="flex h-full w-96 flex-col bg-white shadow-2xl dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 animate-slide-left">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <Receipt size={20} className="text-blue-500" />
            Verification Queue
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => refetch()} 
              className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && <p className="text-sm text-zinc-500 text-center py-8">Loading queue...</p>}

          {!isLoading && (!pendingSales || pendingSales.length === 0) && (
            <div className="text-center py-12 text-zinc-400">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">No pending verification orders.</p>
              <p className="text-xs text-zinc-500 mt-1">Order taker sales will appear here.</p>
            </div>
          )}

          {pendingSales?.map((sale) => (
            <div 
              key={sale.id} 
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 hover:border-blue-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900 transition-all duration-150"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-zinc-950 dark:text-zinc-100">{sale.invoice_number}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Taker: {sale.cashier_name || 'Till-Man'}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(sale.sale_date).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">Rs {sale.total_amount.toFixed(2)}</span>
                  <span className="block text-[9px] text-zinc-400 mt-0.5">{sale.items.length} items</span>
                </div>
              </div>
              <button 
                onClick={() => onSelectSale(sale)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm shadow-blue-500/20 active:scale-[0.98]"
              >
                Verify & Collect Pay
              </button>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-left {
          animation: slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
