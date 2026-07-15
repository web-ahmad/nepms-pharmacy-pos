import { useState } from 'react';
import { usePurchaseRequests } from '../services/purchase.api';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseRequestTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: requests, isLoading, isError } = usePurchaseRequests();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load purchase requests</div>;

  const filtered = requests?.filter(req => 
    req.request_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Approved': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between">
        <input
          type="text"
          placeholder="Search by request number..."
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium">
          New Request
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Request Number</th>
              <th className="p-4 font-medium">Requested By</th>
              <th className="p-4 font-medium text-center">Items Count</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">No purchase requests found.</td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">{req.request_number}</td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">{req.requested_by_id.substring(0,8)}...</td>
                  <td className="p-4 text-center">{req.items.length}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors" title="View Details">
                      <Eye size={16} />
                    </button>
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
