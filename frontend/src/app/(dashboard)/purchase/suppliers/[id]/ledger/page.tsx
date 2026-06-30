'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ArrowLeft, Printer, FileDown, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useSupplierDetails, useSupplierLedger, usePurchaseInvoiceDetails } from '@/features/purchase/services/purchase.api';

import Link from 'next/link';

// Expanded row component
const InvoiceExpandedRow = ({ referenceId }: { referenceId: string }) => {
  const { data: invoice, isLoading, error } = usePurchaseInvoiceDetails(referenceId);

  if (isLoading) return <div className="p-4 text-center animate-pulse text-zinc-500">Loading invoice items...</div>;
  if (error || !invoice) return <div className="p-4 text-center text-red-500">Failed to load items.</div>;
  if (!invoice.items || invoice.items.length === 0) return <div className="p-4 text-center text-zinc-500">No items found for this invoice.</div>;

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase text-zinc-500">Invoice Details: {invoice.invoice_number || invoice.id}</h4>
        <Link 
          href={`/purchase/invoices/${invoice.id}`}
          className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
        >
          View Full Invoice <ChevronRight size={14} />
        </Link>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="pb-2 font-medium">Medicine</th>
            <th className="pb-2 font-medium">Batch No</th>
            <th className="pb-2 font-medium text-right">Qty</th>
            <th className="pb-2 font-medium text-right">Unit Rate</th>
            <th className="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-2 text-zinc-800 dark:text-zinc-200">{item.medicine_name}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{item.batch_number}</td>
              <td className="py-2 text-zinc-800 dark:text-zinc-200 text-right">{item.quantity}</td>
              <td className="py-2 text-zinc-800 dark:text-zinc-200 text-right font-mono">Rs {item.unit_price.toFixed(2)}</td>
              <td className="py-2 font-semibold text-zinc-900 dark:text-zinc-100 text-right font-mono">Rs {item.total_price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function FullSupplierLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const { data: supplier, isLoading: isSupplierLoading } = useSupplierDetails(supplierId);
  const { data: ledger, isLoading: isLedgerLoading } = useSupplierLedger(supplierId);

  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filterType, setFilterType] = useState('All');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handlePrint = () => {
    window.print();
  };

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  // Derived statistics
  const { totalPayable, totalPaid, totalDebit } = useMemo(() => {
    if (!ledger) return { totalPayable: 0, totalPaid: 0, totalDebit: 0 };
    let paid = 0;
    let debit = 0;
    ledger.forEach(l => {
      if (l.credit > 0) paid += l.credit;
      if (l.debit > 0) debit += l.debit;
    });
    // totalPayable usually is current_balance or sum of debit - credit + opening
    // but we can trust supplier.current_balance
    return { 
      totalPayable: supplier?.current_balance || 0,
      totalPaid: paid,
      totalDebit: debit
    };
  }, [ledger, supplier]);

  const creditUtilization = supplier && supplier.credit_limit > 0 
    ? Math.min(100, Math.max(0, (totalPayable / supplier.credit_limit) * 100))
    : 0;

  // Filtered ledger
  const filteredLedger = useMemo(() => {
    if (!ledger) return [];
    return ledger.filter(l => {
      if (filterType !== 'All') {
        if (filterType === 'Invoices' && !l.transaction_type.toLowerCase().includes('invoice')) return false;
        if (filterType === 'Payments' && !l.transaction_type.toLowerCase().includes('payment')) return false;
        if (filterType === 'Returns' && !l.transaction_type.toLowerCase().includes('return')) return false;
      }
      
      if (dateRange.from || dateRange.to) {
        const transDate = parseISO(l.transaction_date);
        const fromDate = dateRange.from ? parseISO(dateRange.from) : new Date(0);
        const toDate = dateRange.to ? parseISO(dateRange.to) : new Date(8640000000000000);
        
        // Simple manual check if isWithinInterval has timezone issues
        if (transDate < fromDate || transDate > toDate) return false;
      }

      return true;
    });
  }, [ledger, filterType, dateRange]);

  if (isSupplierLoading || isLedgerLoading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500 animate-pulse">Loading financial data...</div>;
  }

  if (!supplier) {
    return <div className="text-center text-red-500 mt-10">Supplier not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Financial Ledger
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {supplier.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Printer size={16} />
            Print Ledger
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            <FileDown size={16} />
            Export to PDF
          </button>
        </div>
      </div>

      {/* Analytics Header / Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Supplier Info</h3>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{supplier.name}</p>
          <p className="text-sm text-zinc-500 mt-1">{supplier.contact_person || 'N/A'}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{supplier.phone || 'No phone'}</p>
        </div>
        
        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Total Payable Balance</h3>
          <p className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-50">Rs {totalPayable.toFixed(2)}</p>
          <p className="text-sm text-zinc-500 mt-1">Current outstanding debt</p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Lifetime Amount Paid</h3>
          <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-500">Rs {totalPaid.toFixed(2)}</p>
          <p className="text-sm text-zinc-500 mt-1">Total payments made</p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Credit Limit</h3>
          <p className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-50">Rs {supplier.credit_limit.toFixed(2)}</p>
          <div className="mt-3 w-full bg-zinc-200 rounded-full h-1.5 dark:bg-zinc-800">
            <div 
              className={`h-1.5 rounded-full ${creditUtilization > 90 ? 'bg-red-500' : creditUtilization > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${creditUtilization}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">{creditUtilization.toFixed(1)}% Utilized</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 print:hidden">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Transaction Type</label>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="All">All Transactions</option>
            <option value="Invoices">Invoices Only</option>
            <option value="Payments">Payments Only</option>
            <option value="Returns">Returns Only</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Date Range</label>
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-zinc-400">to</span>
            <input 
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* Advanced Ledger Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4 font-medium w-10"></th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Voucher/Ref No</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium text-right text-red-600 dark:text-red-400">Debit (Rs)</th>
                <th className="p-4 font-medium text-right text-green-600 dark:text-green-400">Credit (Rs)</th>
                <th className="p-4 font-medium text-right text-zinc-900 dark:text-zinc-100">Running Balance (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => {
                  const isInvoice = entry.transaction_type.toLowerCase().includes('invoice');
                  const isExpanded = expandedRows.has(entry.id);

                  return (
                    <React.Fragment key={entry.id}>
                      <tr 
                        onClick={() => isInvoice && toggleRow(entry.id)}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${isInvoice ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''}`}
                      >
                        <td className="p-4 pl-4 text-zinc-400">
                          {isInvoice ? (
                            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                          ) : (
                            <FileText size={16} className="ml-1 opacity-40" />
                          )}
                        </td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">
                          {format(new Date(entry.transaction_date), 'yyyy-MM-dd')}
                        </td>
                        <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                          {entry.reference_id}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            isInvoice ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            entry.transaction_type.toLowerCase().includes('payment') ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-red-600 dark:text-red-400">
                          {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-green-600 dark:text-green-400">
                          {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {entry.balance_after.toFixed(2)}
                        </td>
                      </tr>
                      
                      {isExpanded && isInvoice && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                            <InvoiceExpandedRow referenceId={entry.reference_id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
