'use client';
// app/(dashboard)/branches/[id]/page.tsx — Branch Detail Page

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useBranch } from '@/features/branches/services/branch.api';
import { BranchDetailView } from '@/features/branches/components/BranchDetailView';

export default function BranchDetailPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get('tab') || 'overview';

  const { data: branch, isLoading, error } = useBranch(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <p className="text-sm text-zinc-500">Loading branch details…</p>
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-2xl">🏢</span>
          </div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Branch not found</p>
          <p className="text-xs text-zinc-500">This branch may have been deleted or you don&apos;t have access.</p>
          <button
            onClick={() => router.push('/branches')}
            className="mt-2 px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Back to Branches
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <button
        onClick={() => router.push('/branches')}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
      >
        <ChevronLeft size={16} />
        Back to Branches
      </button>

      <BranchDetailView branch={branch} defaultTab={defaultTab} />
    </motion.div>
  );
}
