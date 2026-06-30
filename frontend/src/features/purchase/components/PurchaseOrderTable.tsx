import { useState } from 'react';
import Link from 'next/link';
import { usePurchaseOrders } from '../services/purchase.api';
import { Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseOrderTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: pos, isLoading, isError } = usePurchaseOrders();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load purchase orders</div>;

  const filtered = pos?.filter(po => 
    po.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (po.supplier_name && po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
      case 'Approved': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Partially Received': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search by PO number or supplier..."
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Order Number</th>
              <th className="p-4 font-medium">Supplier</th>
              <th className="p-4 font-medium">Expected Delivery</th>
              <th className="p-4 font-medium text-right">Total Amount</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No purchase orders found.</td>
              </tr>
            ) : (
              filtered.map((po) => (
                <tr key={po.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">{po.order_number}</td>
                  <td className="p-4 text-zinc-900 dark:text-zinc-300">{po.supplier_name || po.supplier_id}</td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'yyyy-MM-dd') : '-'}
                  </td>
                  <td className="p-4 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    ${po.total_amount.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/purchase/orders/${po.id}`}
                      className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
