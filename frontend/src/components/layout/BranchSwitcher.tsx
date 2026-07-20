"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Building2 } from 'lucide-react';

export function BranchSwitcher() {
  const { user, branchId, setBranch } = useAuthStore();

  const branches = user?.assigned_branches || [];
  const isOwnerOrAdmin = (user?.hierarchy_level ?? 4) <= 2;

  useEffect(() => {
    // Only auto-select branch for L3/L4. L1/L2 can view Main Pharmacy (no branch selected)
    if (!branchId && branches.length > 0 && !isOwnerOrAdmin) {
      setBranch(branches[0].id);
    }
  }, [branchId, branches, setBranch, isOwnerOrAdmin]);



  if (!branches.length) {
    return (
      <div className="flex items-center mr-3 px-3 py-1.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
        <Building2 className="w-4 h-4 text-zinc-400 mr-2" />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {user?.pharmacy_name || "No Branch"}
        </span>
      </div>
    );
  }

  const currentBranch = branchId ? branches.find(b => b.id === branchId) : undefined;

  return (
    <div className="relative mr-3">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border transition-all duration-200 bg-white border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm cursor-default">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start justify-center text-left">
            {!currentBranch ? (
               <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                 {user?.pharmacy_name || "All Branches"} (Combined Data)
               </span>
            ) : (
               <>
                 <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-none truncate max-w-[300px] mb-1">
                   {currentBranch.is_main ? (user?.pharmacy_name || currentBranch.name) : currentBranch.name}
                 </span>
                 <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 leading-none">
                   {currentBranch.is_main 
                     ? 'Main Branch' 
                     : `Branch - ${currentBranch.code || 'N/A'}`}
                 </span>
               </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
