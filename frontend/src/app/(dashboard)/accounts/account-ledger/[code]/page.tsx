"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { DataExportMenu } from '@/components/ui/DataExportMenu';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { getReferenceLink } from '@/utils/auditUtils';

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');
  
  const { data: accounts, isLoading: accountsLoading } = useChartAccounts();
  const account = useMemo(() => accounts?.find(a => a.code === code), [accounts, code]);
  
  const { data, isLoading: ledgerLoading } = useLedger({
    account_id: account?.id,
    start_date: dateRange.start || undefined,
    end_date: dateRange.end || undefined,
  });

  const isLoading = accountsLoading || (account && ledgerLoading);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchRef) return data.rows;
    const q = searchRef.toLowerCase();
    return data.rows.filter(row => 
      (row.reference && row.reference.toLowerCase().includes(q)) || 
      (row.line_desc && row.line_desc.toLowerCase().includes(q)) ||
      (row.journal_desc && row.journal_desc.toLowerCase().includes(q))
    );
  }, [data, searchRef]);

  const isLiabilityOrEquity = account?.category?.toUpperCase() === 'LIABILITY' || account?.category?.toUpperCase() === 'EQUITY';
  const displayBalance = data?.closing_balance || 0;
  // Standard accounting: asset/expense = positive debit balance. liability/equity/revenue = positive credit balance.
  // We'll just Math.abs it for the header display, but keep the raw balance logic in the table or also Math.abs it if it's a credit-normal account.

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Account Ledger</h2>
      </div>

      {!account || isLoading ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <div className="space-y-6">
          <AccountingFilterBar
            dateRange={dateRange}
            setDateRange={setDateRange}
            searchRef={searchRef}
            setSearchRef={setSearchRef}
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md font-mono">
                  {account.code}
                </span>
                <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 rounded-full">
                  {account.category}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{account.name}</h3>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400">Current Balance</h3>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${isLiabilityOrEquity ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {fmt(Math.abs(displayBalance))}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">Transaction History</h3>
              </div>
              <DataExportMenu 
                data={filteredRows} 
                title={`${account.name} Ledger`}
                fileName={`${account.code}_ledger`}
                columns={[
                  { header: 'Date', accessorKey: (row: any) => format(new Date(row.date), 'yyyy-MM-dd') },
                  { header: 'Reference', accessorKey: 'reference' },
                  { header: 'Description', accessorKey: (row: any) => row.line_desc || row.journal_desc },
                  { header: 'Debit', accessorKey: 'debit' },
                  { header: 'Credit', accessorKey: 'credit' },
                  { header: 'Running Balance', accessorKey: 'balance' }
                ]} 
              />
            </div>
            
            <div className="flex-1 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-900 z-10 outline outline-1 outline-gray-200 dark:outline-zinc-800">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Reference</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Description</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Debit</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Credit</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-zinc-400">
                        No transactions found for this account.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row: any, idx: number) => {
                      const href = getReferenceLink(row.reference);
                      return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                            {format(new Date(row.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-zinc-100 font-mono text-xs">
                            {row.reference ? (
                              href ? (
                                <Link href={href} className="text-blue-600 hover:underline font-semibold cursor-pointer dark:text-blue-400">
                                  {row.reference}
                                </Link>
                              ) : (
                                <span>{row.reference}</span>
                              )
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-zinc-300 max-w-md truncate">
                            {row.line_desc || row.journal_desc || '—'}
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 text-right font-medium">
                            {row.debit > 0 ? fmt(row.debit) : '—'}
                          </td>
                          <td className="px-4 py-3 text-red-600 dark:text-red-400 text-right font-medium">
                            {row.credit > 0 ? fmt(row.credit) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-zinc-100 text-right font-medium">
                            {fmt(isLiabilityOrEquity ? Math.abs(row.balance) : row.balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
