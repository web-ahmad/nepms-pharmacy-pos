import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateAccount, useUpdateAccount, BankAccount } from '../services/accounts.api';
import { Account } from '../types/accounts';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankToEdit?: Account | BankAccount | null;
}

interface BankForm {
  name: string;
  code: string;
}

export function BankModal({ isOpen, onClose, bankToEdit }: BankModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BankForm>();
  
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  useEffect(() => {
    if (bankToEdit) {
      reset({
        name: 'bank_name' in bankToEdit ? bankToEdit.bank_name : bankToEdit.name,
        code: 'account_number' in bankToEdit ? bankToEdit.account_number : bankToEdit.code
      });
    } else {
      reset({ name: '', code: '' });
    }
  }, [bankToEdit, reset, isOpen]);

  const onSubmit = async (data: BankForm) => {
    try {
      if (bankToEdit) {
        await updateMutation.mutateAsync({
          id: bankToEdit.id,
          data: {
            name: data.name,
            code: data.code,
            category: 'Asset'
          }
        });
        toast.success('Bank account updated successfully');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          code: data.code,
          category: 'Asset'
        });
        toast.success('Bank account created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save bank account');
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
                {bankToEdit ? 'Edit Bank Account' : 'New Bank Account'}
              </h2>
              <button
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
                    Bank Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building2 className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                      {...register('name', { required: 'Bank name is required' })}
                      className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
                      placeholder="e.g. Chase Bank, HBL"
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
                      <CreditCard className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                      {...register('code', { required: 'Account code is required' })}
                      className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
                      placeholder="e.g. 1010-Chase"
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Should start with 1010 or similar asset code.</p>
                  {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
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
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Bank'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
