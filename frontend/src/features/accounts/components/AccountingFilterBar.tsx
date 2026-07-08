"use client";
import React from 'react';
import { Filter, Search, Calendar, Landmark } from 'lucide-react';
import { useChartAccounts } from '@/features/accounts/services/accounts.api';

interface DateRange {
  start: string;
  end: string;
}

interface Props {
  dateRange: DateRange;
  setDateRange: (val: DateRange | ((prev: DateRange) => DateRange)) => void;
  searchRef: string;
  setSearchRef: (val: string) => void;
  showAccountFilter?: boolean;
  selectedAccountId?: string;
  setSelectedAccountId?: (val: string) => void;
  accounts?: any[];
}

export default function AccountingFilterBar({
  dateRange,
  setDateRange,
  searchRef,
  setSearchRef,
  showAccountFilter = false,
  selectedAccountId = '',
  setSelectedAccountId,
  accounts
}: Props) {
  const { data: fetchedAccounts } = useChartAccounts();
  const accountsList = accounts || fetchedAccounts;

  return (
    <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
        <Filter size={15} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Audit Filters</span>
      </div>
      
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showAccountFilter ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
        {/* Reference Search */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Search Reference</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" 
              placeholder="INV- / RET- / EXP- / PO-"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl text-[13px] outline-none transition-colors dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Account Filter */}
        {showAccountFilter && setSelectedAccountId && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Filter by Account</label>
            <div className="relative">
              <Landmark size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl text-[13px] outline-none transition-colors dark:text-zinc-100 appearance-none"
              >
                <option value="">All Accounts</option>
                {accountsList?.map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Start Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Start Date</label>
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl text-[13px] outline-none transition-colors dark:text-zinc-100"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">End Date</label>
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl text-[13px] outline-none transition-colors dark:text-zinc-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
