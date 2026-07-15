import { useState } from 'react';
import { usePurchaseQuotations } from '../services/purchase.api';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseQuotationTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: quotations, isLoading, isError } = usePurchaseQuotations();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load purchase quotations</div>;

  const filtered = quotations?.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.supplier_name && q.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
      case 'Submitted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Accepted': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between">
        <input
          type="text"
          placeholder="Search by quotation number or supplier..."
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium">
          New Quotation
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Quotation Number</th>
              <th className="p-4 font-medium">Supplier</th>
              <th className="p-4 font-medium text-center">Items Count</th>
              <th className="p-4 font-medium">Valid Until</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No quotations found.</td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">{q.quotation_number}</td>
                  <td className="p-4 text-zinc-900 dark:text-zinc-300">{q.supplier_name || q.supplier_id.substring(0,8)}</td>
                  <td className="p-4 text-center">{q.items.length}</td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {q.valid_until ? format(new Date(q.valid_until), 'yyyy-MM-dd') : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors" title="View Details">
                      <Eye size={16} />
                    </button>
                    {q.status === 'Submitted' && (
                      <>
                        <button className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-green-600 transition-colors" title="Accept">
                          <CheckCircle size={16} />
                        </button>
                        <button className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-red-600 transition-colors" title="Reject">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
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
