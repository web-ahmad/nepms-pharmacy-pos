"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import { useExpenseVouchers } from '@/features/accounts/services/expense.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import Link from 'next/link';

export default function ExpensesPage() {
  const { data: accounts } = useChartAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewExpenseRef = searchParams.get('view_expense');

  const { data: vouchers } = useExpenseVouchers();

  const selectedVoucher = useMemo(() => {
    if (!viewExpenseRef || !vouchers) return null;
    return vouchers.find(v => v.reference === viewExpenseRef);
  }, [viewExpenseRef, vouchers]);

  const expenseAccounts = useMemo(() => {
    return accounts?.filter(a => a.category === 'Expense') || [];
  }, [accounts]);

  const { data, isLoading } = useLedger({
    account_id: selectedAccountId || expenseAccounts[0]?.id
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Expense Management</h2>
        
        <div className="flex gap-2">
          <select 
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {expenseAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {expenseAccounts.length === 0 ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <GeneralLedgerTable data={data!} isLoading={isLoading} />
      )}

      {/* Transaction Details Slide-over */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => router.push('/accounts/expenses')}>
          <div 
            className="bg-white dark:bg-zinc-950 w-full max-w-md h-full border-l border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Transaction Details</h2>
              <button onClick={() => router.push('/accounts/expenses')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="text-center space-y-2 mt-4">
                <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Receipt size={28} />
                </div>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Rs {selectedVoucher.amount.toLocaleString()}</h3>
                <span className={`inline-flex px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg ${
                  selectedVoucher.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                  selectedVoucher.status === 'Void' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                  'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {selectedVoucher.status}
                </span>
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(selectedVoucher.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoucher.reference}</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedVoucher.category_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoucher.description || '-'}</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Created By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{(selectedVoucher as any).created_by_name || selectedVoucher.created_by || 'Unknown'}</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Journal Entry</p>
                    <p className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                      <Link href={`/accounts/journals?search=${selectedVoucher.reference}`}>
                        View Auto-Posted Ledger
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
              <button 
                onClick={() => router.push('/accounts/expenses')}
                className="w-full py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
