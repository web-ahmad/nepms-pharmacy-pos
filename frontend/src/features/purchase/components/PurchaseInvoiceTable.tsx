import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePurchaseInvoices } from '../services/purchase.api';
import { PurchaseInvoice } from '../types/purchase';
import SupplierPaymentModal from './SupplierPaymentModal';
import { CreditCard, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseInvoiceTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const router = useRouter();

  const { data: invoices, isLoading, isError } = usePurchaseInvoices();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load invoices</div>;

  const filtered = invoices?.filter(inv => 
    (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (inv.supplier_id && inv.supplier_id.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
      case 'Unpaid': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Partially Paid': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Cancelled': return 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search invoices..."
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Invoice Number</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium text-right">Total Amount</th>
              <th className="p-4 font-medium text-right">Paid Amount</th>
              <th className="p-4 font-medium text-right">Remaining</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">No invoices found.</td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const remaining = inv.total_amount - inv.amount_paid;
                return (
                  <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/purchase/invoices/${inv.id}`)}
                  >
                    <td className="p-4 font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number || 'N/A'}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">
                      {inv.invoice_date ? format(new Date(inv.invoice_date), 'yyyy-MM-dd') : '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono text-green-600 dark:text-green-400">
                      ${inv.amount_paid.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      ${remaining.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/purchase/invoices/${inv.id}`)}
                          className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="View Invoice"
                        >
                          <Eye size={16} />
                        </button>
                        {remaining > 0 && inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            <CreditCard size={14} /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <SupplierPaymentModal 
          invoice={selectedInvoice} 
          isOpen={true} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
}
