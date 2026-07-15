"use client";

import React, { useState } from 'react';
import { AccountsDashboard } from '@/features/accounts/components/AccountsDashboard';
import { useForceRebuildAccounting } from '@/features/accounts/services/accounts.api';
import { Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccountsDashboardPage() {
  const { mutate: forceRebuild, isPending: isRebuilding } = useForceRebuildAccounting();
  const [rebuildMsg, setRebuildMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleRebuild = () => {
    setRebuildMsg(null);
    forceRebuild(undefined, {
      onSuccess: (d) => {
        setRebuildMsg({ type: 'ok', text: `✅ Rebuilt: ${d.synced.sales} sales · ${d.synced.expenses} expenses · ${d.synced.payroll} payroll · ${d.accounts_recalculated} accounts recalculated.` });
      },
      onError: (e: any) => setRebuildMsg({ type: 'err', text: `❌ ${e?.response?.data?.detail || e.message}` }),
    });
  };

  return (
    <div className="relative min-h-screen space-y-6">
      {/* Utility Actions */}
      <div className="flex items-center justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRebuild}
          disabled={isRebuilding}
          className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 backdrop-blur-md transition-all hover:bg-amber-500 hover:text-white disabled:opacity-60 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white"
        >
          {isRebuilding ? (
            <><RefreshCw className="h-4 w-4 animate-spin" />Rebuilding…</>
          ) : (
            <><Zap className="h-4 w-4" />Force Rebuild Accounting</>
          )}
        </motion.button>
      </div>

      {rebuildMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm font-medium border backdrop-blur-xl shadow-lg ${
            rebuildMsg.type === 'ok' 
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300' 
              : 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300'
          }`}
        >
          {rebuildMsg.text}
        </motion.div>
      )}

      {/* Premium Dashboard Component */}
      <AccountsDashboard />
    </div>
  );
}
