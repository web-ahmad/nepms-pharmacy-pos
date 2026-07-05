'use client';

import { useState, useMemo } from 'react';
import { useCashierSessionCheck, useCashierSession } from '@/features/pos/services/pos.api';
import { 
  ArrowLeft, Search, Filter, Printer, Download, Banknote, 
  Wallet, TrendingDown, DollarSign, Activity, ExternalLink, Calendar, X, FileText
} from 'lucide-react';
import Link from 'next/link';
import PrintableReceipt from '@/components/invoice/PrintableReceipt';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { useSaleDetail } from '@/features/sales/services/sales.api';

// ── Utilities ───────────────────────────────────────────────────────────────
const formatToLocalTime = (utcDateString: string | null | undefined) => {
  if (!utcDateString) return '—';
  const safeDateString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  const date = new Date(safeDateString);
  return date.toLocaleString([], { 
    month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const getShiftName = (dateString: string) => {
  const hours = new Date(dateString).getHours();
  if (hours >= 6 && hours < 14) return 'Morning Shift';
  if (hours >= 14 && hours < 22) return 'Evening Shift';
  return 'Night Shift';
};

function SummaryCard({ label, amount, icon: Icon, active, className }: any) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${active ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-lowest border-outline-variant text-on-surface'} ${className || ''}`}>
      <div className="flex items-start justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${active ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>{label}</p>
        <Icon size={18} className={active ? 'text-on-primary opacity-80' : 'text-primary'} />
      </div>
      <p className="text-[26px] font-bold tracking-tight">Rs {amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</p>
    </div>
  );
}

function ReceiptModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const { data: saleDetail, isLoading } = useSaleDetail(saleId);
  const { data: invoiceSettings } = useInvoiceSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col w-[100mm] max-h-[90vh]">
        <div className="flex justify-between p-4 border-b shrink-0">
          <h2 className="font-bold">Transaction Details</h2>
          <button onClick={onClose} className="hover:text-error"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-4 bg-slate-100 flex-1">
          {isLoading ? (
            <div className="text-center p-8">Loading receipt...</div>
          ) : saleDetail && invoiceSettings ? (
            <div className="bg-white shadow-md border w-full h-auto origin-top" style={{ transform: 'scale(0.95)' }}>
              <PrintableReceipt invoice={saleDetail} settings={invoiceSettings} />
            </div>
          ) : (
            <div className="text-center p-8 text-error">Failed to load receipt.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CashierLedgerPage() {
  const { data: sessionCheck } = useCashierSessionCheck();
  const hasSession = sessionCheck?.has_open_session ?? false;
  const { data: session, isLoading } = useCashierSession(hasSession);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-8">Loading ledger...</div>;
  }

  if (!session) {
    return <div className="p-8">No active session found. Please open a shift first.</div>;
  }

  // Calculate Running Balance
  let currentBalance = 0;
  const entriesWithBalance = [...(session.ledger_entries || [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(entry => {
      // Only Cash affects drawer balance for some logic, but let's just do a naive running total for the UI
      // If payment_mode is not Cash, it might not be in drawer. But usually "Expected Drawer" only tracks cash.
      // Let's mirror backend expected_drawer logic.
      if (entry.entry_type === 'OPENING_BALANCE') {
        currentBalance += entry.amount;
      } else if (entry.entry_type === 'SALE' && entry.payment_mode === 'Cash') {
        currentBalance += entry.amount;
      } else if (entry.entry_type === 'EXPENSE') {
        currentBalance -= entry.amount;
      } else if (entry.entry_type === 'RETURN' && entry.payment_mode === 'Cash') {
        currentBalance -= entry.amount;
      }
      
      return {
        ...entry,
        running_balance: currentBalance
      };
    });

  // Re-apply filters on the sorted array with balances
  const displayEntries = entriesWithBalance.filter((e: any) => {
    if (typeFilter !== 'All') {
      if (typeFilter === 'Sales' && e.entry_type !== 'SALE') return false;
      if (typeFilter === 'Expenses' && e.entry_type !== 'EXPENSE') return false;
      if (typeFilter === 'Returns' && e.entry_type !== 'RETURN') return false;
      if (typeFilter === 'Opening' && e.entry_type !== 'OPENING_BALANCE') return false;
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      if (!e.id?.toLowerCase().includes(lowerQ) && 
          !e.notes?.toLowerCase().includes(lowerQ) &&
          !e.sale_id?.toLowerCase().includes(lowerQ)) {
        return false;
      }
    }
    return true;
  }).reverse(); // Latest first

  const exportToCSV = () => {
    if (!session || !displayEntries.length) return;
    const headers = ['Date & Time', 'Transaction ID', 'Type', 'Mode', 'Amount', 'Running Balance', 'Notes'];
    const rows = displayEntries.map((e: any) => [
      `"${formatToLocalTime(e.created_at)}"`,
      `"${e.id}"`,
      `"${e.entry_type}"`,
      `"${e.payment_mode}"`,
      e.amount,
      e.running_balance,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_Report_${session.session_id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-on-surface">
      {/* Header */}
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-8 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/pos/cashier" className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Full Ledger History</h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {getShiftName(session.opened_at)} • Cashier: {session.cashier_name} • Opened: {formatToLocalTime(session.opened_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20">
            <Printer size={16} /> Print
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-on-primary bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm">
            <FileText size={16} /> Z-Report
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 print:hidden">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Opening Float" amount={session.opening_balance} icon={Wallet} />
          <SummaryCard label="Cash In (Sales)" amount={session.total_cash_in - session.opening_balance} icon={Banknote} />
          <SummaryCard label="Cash Out (Expenses/Refunds)" amount={session.total_expenses + session.total_returns} icon={TrendingDown} />
          <SummaryCard label="Net Expected Drawer" amount={session.expected_drawer} icon={DollarSign} active />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm print:hidden">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
            <input 
              type="text" 
              placeholder="Search by Transaction ID or Notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-9 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-outline-variant">
              <Calendar size={16} className="text-on-surface-variant" />
              <span className="text-sm font-medium">Current Session</span>
            </div>
            
            <div className="relative flex-1 md:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 w-full md:w-40 appearance-none rounded-lg border border-outline-variant bg-surface pl-9 pr-4 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Types</option>
                <option value="Opening">Opening</option>
                <option value="Sales">Sales</option>
                <option value="Expenses">Expenses</option>
                <option value="Returns">Returns</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Date & Time</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Type</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Mode</th>
                  <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Running Balance</th>
                  <th className="px-6 py-4 font-semibold w-full">Notes / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {displayEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity size={32} className="opacity-20" />
                        <p className="font-medium">No ledger entries found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayEntries.map((entry: any) => {
                    const isIncome = entry.entry_type === 'SALE' || entry.entry_type === 'OPENING_BALANCE' || entry.entry_type === 'OPENING';
                    const isExpense = entry.entry_type === 'EXPENSE' || entry.entry_type === 'RETURN';
                    const isVoid = entry.status === 'Voided' || entry.status === 'VOID' || entry.entry_type === 'VOID';
                    const entryTypeDisplay = isVoid ? 'VOID' : (entry.entry_type || '').replace('_', ' ');

                    const getDisplayId = (e: any) => {
                      if (e.entry_type === 'OPENING_BALANCE' || e.entry_type === 'OPENING') return 'OPENING-FLOAT';
                      if (e.entry_type === 'EXPENSE') return `EXP-${(e.id || '').substring(0, 6).toUpperCase()}`;
                      if (e.entry_type === 'RETURN') return `RET-${(e.id || '').substring(0, 6).toUpperCase()}`;
                      return e.invoice_number || (e.id || '').substring(0, 8).toUpperCase();
                    };

                    const displayId = getDisplayId(entry);
                    
                    return (
                      <tr key={entry.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">
                          {formatToLocalTime(entry.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                          {entry.sale_id ? (
                            <button onClick={() => setSelectedSaleId(entry.sale_id)} className="text-primary hover:underline flex items-center gap-1">
                              {displayId} <ExternalLink size={12} />
                            </button>
                          ) : (
                            displayId
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                            ${isVoid ? 'bg-red-600 text-white shadow-sm' :
                              entry.entry_type === 'OPENING_BALANCE' ? 'bg-blue-100 text-blue-700' :
                              entry.entry_type === 'SALE' ? 'bg-green-100 text-green-700' :
                              entry.entry_type === 'EXPENSE' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }
                          `}>
                            {entryTypeDisplay}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.payment_mode || 'Cash'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-mono font-bold
                          ${isExpense ? 'text-error' : isIncome ? 'text-[#16a34a]' : ''}
                        `}>
                          {entry.amount < 0 ? '- Rs ' : '+ Rs '}{Math.abs(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-medium text-on-surface-variant">
                          {entry.running_balance < 0 ? '-' : ''}{Math.abs(entry.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant truncate max-w-xs" title={entry.notes}>
                          {isVoid && entry.entry_type !== 'VOID' ? <span className="text-error font-bold mr-1">VOIDED:</span> : null}
                          {entry.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedSaleId && (
        <ReceiptModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
      )}

      {/* Print Layout */}
      <div className="hidden print:block w-full bg-white text-black text-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">END OF DAY REPORT</h1>
          <p className="text-gray-600">
            Date: {new Date().toLocaleDateString()} | {getShiftName(session.opened_at)}
          </p>
          <p className="text-gray-600">
            Cashier: {session.cashier_name} | Opened: {formatToLocalTime(session.opened_at)}
          </p>
        </div>

        <table className="w-full border-collapse border border-gray-300 mb-8 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left">Date & Time</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Transaction ID</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Mode</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Amount</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Balance</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {displayEntries.map((entry: any) => {
              const isIncome = entry.entry_type === 'SALE' || entry.entry_type === 'OPENING_BALANCE';
              const isExpense = entry.entry_type === 'EXPENSE' || entry.entry_type === 'RETURN';
              return (
                <tr key={`print-${entry.id}`}>
                  <td className="border border-gray-300 px-3 py-2">{formatToLocalTime(entry.created_at)}</td>
                  <td className="border border-gray-300 px-3 py-2">{entry.id.split('-')[0].toUpperCase()}</td>
                  <td className="border border-gray-300 px-3 py-2">{entry.entry_type.replace('_', ' ')}</td>
                  <td className="border border-gray-300 px-3 py-2">{entry.payment_mode}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {entry.amount < 0 ? '-Rs ' : '+Rs '}{Math.abs(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {entry.running_balance < 0 ? '-' : ''}{Math.abs(entry.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">{entry.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-col items-end gap-2 mb-16 text-sm font-semibold">
          <p>Total Sales (Cash In): Rs {(session.total_cash_in - session.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p>Total Expenses/Refunds: Rs {(session.total_expenses + session.total_returns).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-lg mt-2 border-t border-gray-400 pt-2">
            Net Expected Drawer: Rs {session.expected_drawer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex justify-between mt-24 pt-8 border-t border-gray-400 font-semibold">
          <p>Cashier Signature: _______________________</p>
          <p>Manager Signature: _______________________</p>
        </div>
      </div>
    </div>
  );
}
