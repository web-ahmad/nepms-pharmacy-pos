import { useState } from 'react';
import { useSuppliers } from '../services/purchase.api';
import { Edit, Book, Download, MoreVertical } from 'lucide-react';

interface SupplierTableProps {
  onEdit: (id: string) => void;
  onViewLedger: (id: string) => void;
  canEdit: boolean;
}

export default function SupplierTable({ onEdit, onViewLedger, canEdit }: SupplierTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: suppliers, isLoading, isError } = useSuppliers();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load suppliers</div>;

  const filtered = suppliers?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search suppliers..."
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Supplier</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium text-right">Current Balance</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">No suppliers found.</td>
              </tr>
            ) : (
              filtered.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.name}</div>
                    {supplier.email && <div className="text-xs text-zinc-500">{supplier.email}</div>}
                  </td>
                  <td className="p-4">
                    <div className="text-zinc-900 dark:text-zinc-300">{supplier.contact_person || '-'}</div>
                    <div className="text-xs text-zinc-500">{supplier.phone}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-mono font-bold ${supplier.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      ${supplier.current_balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      supplier.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewLedger(supplier.id)}
                        className="p-2 text-zinc-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                        title="View Ledger"
                      >
                        <Book size={16} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onEdit(supplier.id)}
                          className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
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
