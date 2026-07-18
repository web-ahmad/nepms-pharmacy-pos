"use client";

import { useBankAccounts } from '@/features/accounts/services/accounts.api';
import { useDeleteAccount } from '@/features/accounts/services/accounts.api'; // Keeping delete for now or use delete bank
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ExternalLink, Search, Landmark, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { BankModal } from '@/features/accounts/components/BankModal';
import { BankAccount } from '@/features/accounts/services/accounts.api';
import { toast } from 'sonner';

export default function BankBookPage() {
  const { data: bankAccountsData, isLoading } = useBankAccounts();
  const deleteMutation = useDeleteAccount();
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bankToEdit, setBankToEdit] = useState<BankAccount | null>(null);

  const bankAccounts = useMemo(() => {
    if (!bankAccountsData) return [];
    return bankAccountsData.filter(a => {
      const searchStr = search.toLowerCase();
      return a.bank_name.toLowerCase().includes(searchStr) || 
             a.account_name.toLowerCase().includes(searchStr) ||
             a.account_number.includes(searchStr);
    });
  }, [bankAccountsData, search]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank account? This action cannot be undone if there are no transactions.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Bank account deleted successfully');
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to delete bank account');
      }
    }
  };

  const handleEdit = (bank: BankAccount) => {
    setBankToEdit(bank);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setBankToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Bank Accounts</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage and view ledgers for all your registered bank accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full max-w-xs sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            New Bank
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-64 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900/50" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/50 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400">Account Name</th>
                  <th className="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400">Account Code</th>
                  <th className="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400 text-right">Current Balance</th>
                  <th className="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {bankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                      No bank accounts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  bankAccounts.map((account, idx) => (
                    <motion.tr 
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:shadow-sm dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{account.bank_name}</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{account.account_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {account.account_number}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${(account.current_balance || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(account.current_balance || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(account)}
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-blue-400"
                            title="Edit Bank"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800"
                            title="Delete Bank"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link href={`/accounts/ledger?account_id=${account.id}`}>
                            <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-blue-400">
                              <ExternalLink className="h-4 w-4" />
                              View Ledger
                            </button>
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BankModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        bankToEdit={bankToEdit} 
      />
    </div>
  );
}
