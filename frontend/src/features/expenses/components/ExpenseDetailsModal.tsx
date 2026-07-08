import React from 'react';
import { X, Receipt, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useExpenseVouchers } from '@/features/accounts/services/expense.api';
import { format } from 'date-fns';

interface Props {
  reference: string;
  onClose: () => void;
}

export default function ExpenseDetailsModal({ reference, onClose }: Props) {
  // Simple fetch all and find, since we don't have a getByReference hook right now
  const { data: vouchers, isLoading } = useExpenseVouchers();
  const expense = vouchers?.find(v => v.reference === reference);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="h-full w-full max-w-md bg-white dark:bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Expense Details</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
            </div>
          ) : !expense ? (
            <div className="text-center text-gray-500 py-12">
              <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p>Expense not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total Amount</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                  Rs {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <div className="mt-3 flex justify-center">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                    expense.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    expense.status === 'Void' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {expense.status === 'Approved' && <CheckCircle size={12} />}
                    {expense.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Reference ID</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{expense.reference}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Date</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(expense.date), 'dd MMM, yyyy')}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Category</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{expense.category_name}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Payment Method</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{expense.payment_method}</span>
                </div>
                {expense.payee && (
                  <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-sm text-gray-500 dark:text-zinc-400">Payee</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{expense.payee}</span>
                  </div>
                )}
                <div className="pt-2">
                  <span className="text-sm text-gray-500 dark:text-zinc-400 block mb-1">Description</span>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{expense.description || '-'}</p>
                </div>
              </div>

              {expense.attachment_url && (
                <a 
                  href={expense.attachment_url.startsWith('http') ? expense.attachment_url : `http://localhost:8000${expense.attachment_url}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 font-medium rounded-xl transition-colors"
                >
                  <FileText size={18} />
                  View Original Receipt
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
