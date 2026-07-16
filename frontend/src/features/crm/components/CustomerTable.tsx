import { useState, useEffect } from 'react';
import { useCustomers, useUpdateCustomer, useUpdateCustomerStatus } from '../services/crm.api';
import { notify } from '@/utils/toast';
import { Edit, Eye, ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Customer } from '../types/crm';
import CustomerForm from './CustomerForm';

const CustomerTableRow = ({ customer, onEdit }: { customer: Customer; onEdit: (c: Customer) => void }) => {
  const updateStatusMutation = useUpdateCustomerStatus(customer.id);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(customer.is_active !== false);

  useEffect(() => {
    setOptimisticStatus(customer.is_active !== false);
  }, [customer.is_active]);

  const toggleStatus = async () => {
    const newStatus = !optimisticStatus;
    console.log("Toggle clicked for:", customer.id, "New Status:", newStatus);
    
    // Optimistic Update
    setOptimisticStatus(newStatus);
    setIsUpdating(true);
    
    try {
      await updateStatusMutation.mutateAsync(newStatus ? 'active' : 'inactive');
    } catch (error) {
      console.error(error);
      // Revert on failure
      setOptimisticStatus(!newStatus);
      notify.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const isActive = customer.is_active !== false;

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
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
          {customer.loyalty_tier || 'Bronze'} - {customer.loyalty_points} pts
        </span>
      </td>
      <td className="p-4 text-right font-mono font-bold">
        <div className={customer.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
          CR: Rs {customer.current_balance.toFixed(2)}
        </div>
        {/* Mock wallet balance if not returned in API yet, ideally should be fetched or included in list response */}
        <div className="text-blue-600 dark:text-blue-400 text-xs font-normal">
          WB: Rs {0.00.toFixed(2)}
        </div>
      </td>
      <td className="p-4 text-right text-xs text-zinc-500">
        <div>LTV: Rs {(customer.lifetime_value || 0).toFixed(2)}</div>
        <div className={customer.risk_score && customer.risk_score > 70 ? 'text-red-500' : ''}>
          Risk: {customer.risk_score || 0}
        </div>
      </td>
      <td className="p-4 text-xs text-zinc-500">
        <div>{customer.last_visit ? format(new Date(customer.last_visit), 'dd MMM yyyy') : '-'}</div>
      </td>
      <td className="p-4 text-center">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={isUpdating}
          title={optimisticStatus ? 'Deactivate Customer' : 'Activate Customer'}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 ${
            optimisticStatus ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              optimisticStatus ? 'translate-x-2' : '-translate-x-2'
            }`}
          />
        </button>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/customers/${customer.id}`}
            className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
            title="View Profile"
          >
            <Eye size={16} />
          </Link>
          <button
            onClick={() => onEdit(customer)}
            className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
            title="Edit Profile"
          >
            <Edit size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function CustomerTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: customers, isLoading, isError } = useCustomers(searchTerm);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
              <th className="p-4 font-medium text-right">Loyalty Tier</th>
              <th className="p-4 font-medium text-right">Balances (CR/WB)</th>
              <th className="p-4 font-medium text-right">Insights</th>
              <th className="p-4 font-medium">Last Visit</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!customers || customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">No customers found.</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <CustomerTableRow key={customer.id} customer={customer as Customer} onEdit={setEditingCustomer} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Edit Customer</h2>
              <button 
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-white shadow-sm transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <CustomerForm 
                initialData={editingCustomer} 
                initialMode="edit"
                onSuccess={() => setEditingCustomer(null)}
                onCancel={() => setEditingCustomer(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
