import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, CreditCard, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateAccount, useUpdateAccount } from '../services/accounts.api';
import { Account, AccountCategory } from '../types/accounts';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

interface AccountForm {
  name: string;
  code: string;
  category: AccountCategory;
}

export function AccountModal({ isOpen, onClose, accountToEdit }: AccountModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountForm>();
  
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  useEffect(() => {
    if (accountToEdit) {
      reset({
        name: accountToEdit.name,
        code: accountToEdit.code,
        category: accountToEdit.category
      });
    } else {
      reset({ name: '', code: '', category: 'Asset' });
    }
  }, [accountToEdit, reset, isOpen]);

  const onSubmit = async (data: AccountForm) => {
    try {
      if (accountToEdit) {
        await updateMutation.mutateAsync({
          id: accountToEdit.id,
          data: {
            name: data.name,
            code: data.code,
            category: data.category
          }
        });
        toast.success('Account updated successfully');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          code: data.code,
          category: data.category
        });
        toast.success('Account created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save account');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {accountToEdit ? 'Edit Account' : 'New Account'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Account Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CreditCard className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                      {...register('name', { required: 'Account name is required' })}
                      className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
                      placeholder="e.g. Petty Cash"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Account Code
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Hash className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                      {...register('code', { required: 'Account code is required' })}
                      className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
                      placeholder="e.g. 1005"
                    />
                  </div>
                  {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
