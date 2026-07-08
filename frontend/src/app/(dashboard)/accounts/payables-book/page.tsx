"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Receipt, Printer, X } from 'lucide-react';
import { DataExportMenu } from '@/components/ui/DataExportMenu';
import Link from 'next/link';
import ReturnDetailsModal from '@/features/sales/components/ReturnDetailsModal';

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

export default function PayablesBookPage() {
  const { data: accounts } = useChartAccounts();
  const [selectedReturnRef, setSelectedReturnRef] = useState<string | null>(null);
  const apAccount = useMemo(() => accounts?.find(a => a.name === 'Accounts Payable' || a.code === '2000'), [accounts]);
  
  const { data, isLoading } = useLedger({
    account_id: apAccount?.id
  });

  // Credit balances for liability accounts represent what is owed.
  // Standard ledger returns balance as Debit - Credit, so for liabilities we take the absolute value or negate it.
  const totalPayables = Math.abs(data?.closing_balance || 0);

  const getRefLink = (ref: string, desc: string) => {
    if (!ref) return '#';
    if (ref.startsWith('INV-') || ref.startsWith('POS-')) return `/sales?invoice=${ref}`;
    if (ref.startsWith('PO-')) return `/purchase/invoices/${ref}`;
    if (desc.includes('purchase') || desc.includes('supplier')) return `/purchase/invoices/${ref}`;
    return '#';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Payables Book</h2>
      </div>

      {!apAccount || isLoading ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Payables</h3>
              <p className="mt-2 text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {fmt(totalPayables)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">A/P Ledger</h3>
              </div>
              <DataExportMenu 
                data={data?.rows || []} 
                title="Payables Book"
                fileName="Payables_Book"
                columns={[
                  { header: 'Date', accessorKey: (row: any) => format(new Date(row.date), 'yyyy-MM-dd') },
                  { header: 'Reference', accessorKey: 'reference' },
                  { header: 'Supplier Name', accessorKey: (row: any) => row.line_desc || row.journal_desc },
                  { header: 'Credit (Amount Owed)', accessorKey: 'credit' },
                  { header: 'Debit (Amount Paid)', accessorKey: 'debit' },
                  { header: 'Running Balance', accessorKey: 'balance' }
                ]} 
              />
            </div>
            
            <div className="flex-1 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-900 z-10 outline outline-1 outline-gray-200 dark:outline-zinc-800">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Reference (PO/Bill ID)</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Supplier Name / Description</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Credit (Owed)</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Debit (Paid)</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {data?.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-zinc-400">
                        No payable entries found.
                      </td>
                    </tr>
                  ) : (
                    data?.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                          {format(new Date(row.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100 font-mono text-xs">
                          {row.reference ? (
                            row.reference.startsWith('RET-') ? (
                              <button 
                                onClick={() => setSelectedReturnRef(row.reference)} 
                                className="text-blue-600 hover:underline font-semibold cursor-pointer dark:text-blue-400 text-left"
                              >
                                {row.reference}
                              </button>
                            ) : (
                              <Link href={getRefLink(row.reference, (row.line_desc || row.journal_desc || '').toLowerCase())} className="text-blue-600 hover:underline font-semibold cursor-pointer dark:text-blue-400">
                                {row.reference}
                              </Link>
                            )
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-zinc-300 max-w-md truncate">
                          {row.line_desc || row.journal_desc || '—'}
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400 text-right font-medium">
                          {row.credit > 0 ? fmt(row.credit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 text-right font-medium">
                          {row.debit > 0 ? fmt(row.debit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100 text-right font-medium">
                          {fmt(Math.abs(row.balance))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <ReturnDetailsModal 
        returnNumber={selectedReturnRef}
        onClose={() => setSelectedReturnRef(null)}
      />
    </div>
  );
}
