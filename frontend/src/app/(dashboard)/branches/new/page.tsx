'use client';
// app/(dashboard)/branches/new/page.tsx — Create Branch Page

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { BranchFormWizard } from '@/features/branches/components/BranchFormWizard';

export default function NewBranchPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Create New Branch</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Complete all 7 steps to set up your branch
          </p>
        </div>
      </motion.div>

      {/* Wizard card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 sm:p-8"
      >
        <BranchFormWizard />
      </motion.div>
    </div>
  );
}
