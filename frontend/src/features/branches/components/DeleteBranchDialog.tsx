'use client';
// features/branches/components/DeleteBranchDialog.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';
import type { Branch } from '../types/branch';
import { useDeleteBranch } from '../services/branch.api';
import toast from 'react-hot-toast';

interface Props {
  branch: Branch | null;
  onClose: () => void;
}

export function DeleteBranchDialog({ branch, onClose }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const { mutate: deleteBranch, isPending } = useDeleteBranch();

  const isMatch = confirmText.trim() === branch?.name;

  function handleDelete() {
    if (!branch || !isMatch) return;
    deleteBranch(branch.id, {
      onSuccess: () => {
        toast.success(`Branch "${branch.name}" deleted successfully.`);
        onClose();
      },
      onError: () => {
        toast.error('Failed to delete branch. Please try again.');
      },
    });
  }

  return (
    <AnimatePresence>
      {branch && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        Delete Branch
                      </h2>
                      <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Branch info */}
                <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 mb-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">{branch.name}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Code: {branch.code} · {branch.city || 'Unknown city'}</p>
                </div>

                {/* Confirm input */}
                <div className="space-y-2 mb-6">
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                    Type <span className="font-semibold text-zinc-900 dark:text-zinc-100">{branch.name}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={branch.name}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!isMatch || isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {isPending ? 'Deleting…' : 'Delete Branch'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
