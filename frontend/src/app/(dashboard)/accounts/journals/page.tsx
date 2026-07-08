"use client";
import React, { useState, useMemo } from 'react';
import { useJournalEntries, useChartAccounts } from '@/features/accounts/services/accounts.api';
import JournalTable from '@/features/accounts/components/JournalTable';
import CreateJournalDialog from '@/features/accounts/components/CreateJournalDialog';
import { Plus, FileSignature, Filter, Search, Calendar, Landmark } from 'lucide-react';

export default function JournalsPage() {
  const { data, isLoading, refetch } = useJournalEntries();
  const { data: accounts } = useChartAccounts();

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchRef, setSearchRef] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = data;

    // 1. Date Filter
    if (dateRange.start) {
      filtered = filtered.filter(j => j.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(j => j.date <= dateRange.end);
    }

    // 2. Account Filter
    if (selectedAccountId) {
      filtered = filtered.filter(j => 
        j.lines.some(line => line.account_id === selectedAccountId)
      );
    }

    // 3. Reference Search
    if (searchRef) {
      const q = searchRef.toLowerCase();
      filtered = filtered.filter(j => 
        (j.reference && j.reference.toLowerCase().includes(q)) || 
        (j.description && j.description.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [data, dateRange, selectedAccountId, searchRef]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <FileSignature className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Journal Entries</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">All double-entry accounting records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
          <CreateJournalDialog>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
          </CreateJournalDialog>
        </div>
      </div>

      {/* FILTER TOP BAR */}
      <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
          <Filter size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Advanced Filters</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Reference Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Search Reference</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text" 
                placeholder="INV- / RET- / EXP-"
                value={searchRef}
                onChange={e => setSearchRef(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl text-[13px] outline-none transition-colors dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Account Filter */}
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
                {accounts?.map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>

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

      <JournalTable data={filteredData} isLoading={isLoading} />
    </div>
  );
}
