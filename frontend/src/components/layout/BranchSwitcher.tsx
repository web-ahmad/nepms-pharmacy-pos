"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check } from 'lucide-react';

export function BranchSwitcher() {
  const { user, branchId, setBranch } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const branches = user?.assigned_branches || [];
  const currentBranch = branches.find(b => b.id === branchId) || branches[0];

  useEffect(() => {
    if (!branchId && branches.length > 0) {
      setBranch(branches[0].id);
    }
  }, [branchId, branches, setBranch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!branches.length) {
    return (
      <div className="hidden md:flex items-center mr-3 px-3 py-1.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
        <Building2 className="w-4 h-4 text-zinc-400 mr-2" />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {user?.pharmacy_name || "No Branch"}
        </span>
      </div>
    );
  }

  const isSingleBranch = branches.length === 1;

  return (
    <div className="relative mr-3 hidden md:block" ref={dropdownRef}>
      <button
        onClick={() => !isSingleBranch && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border transition-all duration-200 
          ${isOpen ? 'bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 shadow-inner' : 'bg-white border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900 shadow-sm'}
          ${isSingleBranch ? 'cursor-default' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {currentBranch?.name || "Select Branch"}
          </span>
        </div>
        {!isSingleBranch && (
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !isSingleBranch && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 w-64 p-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-black/5 z-50 overflow-hidden"
          >
            <div className="px-2 py-1.5 mb-1">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Switch Branch
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {branches.map((branch) => {
                const isActive = branch.id === branchId;
                return (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setBranch(branch.id);
                      setIsOpen(false);
                      // Trigger a soft reload or data refresh based on new branch ID
                      window.dispatchEvent(new CustomEvent('branch_switched', { detail: branch.id }));
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group
                      ${isActive 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}
                    `}
                  >
                    <span className="truncate pr-4">{branch.name}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
