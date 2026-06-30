import { useState } from 'react';
import { useCustomers } from '../services/crm.api';
import { Edit, Eye, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CustomerTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: customers, isLoading, isError } = useCustomers(searchTerm);

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load customers</div>;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">CNIC</th>
              <th className="p-4 font-medium text-right">Loyalty Points</th>
              <th className="p-4 font-medium text-right">Credit Balance</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!customers || customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No customers found.</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {customer.full_name}
                      {customer.medical_history && (
                        <span title="Has medical history/allergies"><ShieldAlert size={14} className="text-amber-500" /></span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">Tier: {customer.loyalty_tier}</div>
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    <div>{customer.phone || '-'}</div>
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                    <div>{customer.cnic || '-'}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {customer.loyalty_points} pts
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold">
                    <span className={customer.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      Rs {customer.current_balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                      title="View Profile"
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
