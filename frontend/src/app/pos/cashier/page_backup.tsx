'use client';

import { useTheme } from 'next-themes';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCashierSessionCheck,
  useCashierSession,
  useOpenSession,
  useCloseSession,
  useLogExpense,
  usePendingQueuePolling,
  useVerifyComplete,
  useWorkflowMode,
} from '@/features/pos/services/pos.api';
import CashierVerificationModal from '@/features/pos/components/CashierVerificationModal';
import {
  Banknote, CreditCard, Receipt, DollarSign, TrendingDown, Clock,
  LogOut, Plus, X, AlertTriangle, CheckCircle2, RefreshCw, Loader2,
  ShieldCheck, PackageSearch, ArrowUpRight, ArrowDownRight, ChevronRight,
  BarChart3, Wallet, LucideShieldAlert, Moon, Sun, ArrowLeft
} from 'lucide-react';

// ── Shift Guard Modal ──────────────────────────────────────────────────────
function ShiftGuardModal({ onOpen }: { onOpen: (balance: number) => void }) {
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const openSession = useOpenSession();

  const handleOpen = async () => {
    setLoading(true);
    try {
      await openSession.mutateAsync({ opening_balance: Number(balance) || 0 });
      onOpen(Number(balance) || 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-6 border-b border-zinc-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Open Cash Register</h2>
              <p className="text-xs text-zinc-400">Start your shift to unlock the Cashier Portal</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Opening Cash Float (Rs)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter opening balance e.g. 5000"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleOpen()}
              autoFocus
              className="w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-2xl font-mono font-bold text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="mt-2 text-xs text-zinc-500">Enter 0 if starting with an empty drawer.</p>
          </div>

          {openSession.isError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-400">
              <AlertTriangle size={14} />
              <span>{(openSession.error as any)?.response?.data?.detail || 'Failed to open session.'}</span>
            </div>
          )}

          <button
            onClick={handleOpen}
            disabled={loading || openSession.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            Open Register & Start Shift
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Close Shift Modal ──────────────────────────────────────────────────────
function CloseShiftModal({ session, onClose, onClosed }: { session: any; onClose: () => void; onClosed: (data: any) => void }) {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const closeSession = useCloseSession();

  const expected = session?.expected_drawer || 0;
  const actual = Number(actualCash) || 0;
  const discrepancy = actual - expected;

  const handleClose = async () => {
    const result = await closeSession.mutateAsync({
      closing_balance_actual: Number(actualCash) || 0,
      discrepancy_notes: notes || undefined
    });
    onClosed(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl animate-zoom-in overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <LogOut size={18} className="text-rose-500" />
            <h2 className="font-bold text-zinc-900 dark:text-white">Close Shift & Reconcile</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Expected summary */}
          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Opening Balance:</span>
              <span className="font-mono font-bold">Rs {(session?.opening_balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Cash Sales:</span>
              <span className="font-mono font-bold">+Rs {(session?.total_cash_in || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-500">
              <span>Expenses:</span>
              <span className="font-mono font-bold">-Rs {(session?.total_expenses || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 dark:border-zinc-700 pt-2 font-bold">
              <span>Expected in Drawer:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">Rs {expected.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Actual Cash Counted (Rs)
            </label>
            <input
              type="number" min="0" step="0.01" autoFocus
              value={actualCash} onChange={e => setActualCash(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xl font-mono font-bold text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {actualCash && (
            <div className={`rounded-lg p-3 text-sm font-bold flex items-center gap-2 ${
              discrepancy === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              discrepancy > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              {discrepancy === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {discrepancy === 0 ? 'Balanced — No discrepancy!' :
               discrepancy > 0 ? `OVER by Rs ${discrepancy.toFixed(2)}` :
               `SHORT by Rs ${Math.abs(discrepancy).toFixed(2)}`}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any discrepancy explanation..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {closeSession.isError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-600 dark:text-red-400">
              {(closeSession.error as any)?.response?.data?.detail || 'Failed to close session.'}
            </div>
          )}

          <button
            onClick={handleClose}
            disabled={!actualCash || closeSession.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
          >
            {closeSession.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Confirm & Close Shift
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Log Expense Modal ──────────────────────────────────────────────────────
function LogExpenseModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState('Cash');
  const logExpense = useLogExpense();

  const handleSubmit = async () => {
    if (!amount || !notes) return;
    await logExpense.mutateAsync({ amount: parseFloat(amount), notes, payment_mode: mode });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl animate-zoom-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-orange-500" />
            <h3 className="font-bold text-zinc-900 dark:text-white">Log Counter Expense</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Amount (Rs)</label>
            <input autoFocus type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-lg font-mono font-bold text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reason / Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Stationery, Courier, Packaging"
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['Cash', 'Card', 'Bank Transfer'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                  mode === m ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}>{m}</button>
            ))}
          </div>
          {logExpense.isError && (
            <p className="text-xs text-red-500">{(logExpense.error as any)?.response?.data?.detail || 'Failed'}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!amount || !notes || logExpense.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 font-bold text-white hover:bg-orange-500 disabled:opacity-40 transition-all active:scale-95"
          >
            {logExpense.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Log Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({ label, amount, icon: Icon, color, subtitle }: {
  label: string; amount: number; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <Icon size={18} className="opacity-60" />
      </div>
      <p className="text-2xl font-bold font-mono">Rs {amount.toFixed(2)}</p>
      {subtitle && <p className="text-[10px] mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}

// ── Main Cashier Portal Page ─────────────────────────────────────────────────
export default function CashierPortalPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'queue' | 'ledger'>('queue');
  const [verifyingSale, setVerifyingSale] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedSessionData, setClosedSessionData] = useState<any>(null);

  const { data: sessionCheck, isLoading: checkLoading } = useCashierSessionCheck();
  const hasSession = sessionCheck?.has_open_session ?? false;
  const { data: session, refetch: refetchSession } = useCashierSession(hasSession);
  const { data: pendingQueue, isLoading: queueLoading, refetch: refetchQueue } = usePendingQueuePolling();
  const { data: workflowData, isLoading: workflowLoading } = useWorkflowMode();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (workflowData && workflowData.mode === 'SINGLE_COUNTER') {
      router.push('/pos');
    }
  }, [isAuthenticated, workflowData, router]);

  // ── SINGLE_COUNTER mode guard ─────────────────────────────────────────────
  // (This page shows a helpful message; actual routing guard is done in middleware/layout)

  if (!isAuthenticated) return null;

  if (checkLoading || workflowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Shift Guard ───────────────────────────────────────────────────────────
  if (!hasSession) {
    return <ShiftGuardModal onOpen={() => qc.invalidateQueries({ queryKey: ['cashier'] })} />;
  }

  // ── Session closed screen ─────────────────────────────────────────────────
  if (closedSessionData) {
    const disc = closedSessionData.discrepancy || 0;
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl p-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            disc === 0 ? 'bg-emerald-500/20' : disc < 0 ? 'bg-rose-500/20' : 'bg-blue-500/20'
          }`}>
            {disc === 0
              ? <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              : disc < 0
              ? <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              : <ArrowUpRight className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            }
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Shift Closed</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Your shift has ended. Summary below.</p>

          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 space-y-2 text-sm text-left mb-6">
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Opening Balance:</span><span className="font-mono font-bold text-zinc-900 dark:text-white">Rs {(closedSessionData.opening_balance || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Expected:</span><span className="font-mono font-bold text-zinc-900 dark:text-white">Rs {(closedSessionData.closing_balance_expected || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Actual Counted:</span><span className="font-mono font-bold text-zinc-900 dark:text-white">Rs {(closedSessionData.closing_balance_actual || 0).toFixed(2)}</span></div>
            <div className={`flex justify-between border-t border-zinc-300 dark:border-zinc-700 pt-2 font-bold ${disc === 0 ? 'text-emerald-600 dark:text-emerald-400' : disc < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
              <span>Discrepancy:</span>
              <span className="font-mono">{closedSessionData.discrepancy_label}</span>
            </div>
          </div>

          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 py-3 font-bold text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4">
        {/* Brand */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30">
              <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">Cashier Portal</h1>
          </div>
          <p className="text-[10px] text-zinc-500 ml-8">{user?.username || 'Cashier'}</p>
        </div>

        {/* Session status pill */}
        <div className="mb-4 rounded-xl bg-emerald-900/20 border border-emerald-700/30 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Shift Active</span>
          </div>
          <p className="text-xs text-zinc-300">Opened: {session?.opened_at ? new Date(session.opened_at).toLocaleTimeString() : '—'}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Float: Rs {(session?.opening_balance || 0).toFixed(2)}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <PackageSearch size={16} />
            Pending Queue
            {pendingQueue && pendingQueue.length > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {pendingQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <BarChart3 size={16} />
            Ledger & Summary
          </button>
        </nav>

        {/* Footer actions */}
        <div className="space-y-2 mt-4">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-orange-700/40 bg-orange-900/20 px-3 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-900/40 transition-all"
          >
            <TrendingDown size={14} /> Log Expense
          </button>
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-rose-700/40 bg-rose-900/20 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-900/40 transition-all"
          >
            <LogOut size={14} /> Close Shift / End Day
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-6">
          <div className="flex items-center gap-3">
            {user?.role !== 'Cashier' && (
              <button onClick={() => router.push('/')} className="mr-2 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {activeTab === 'queue' ? 'Pending Verification Queue' : 'Cash Ledger & Shift Summary'}
            </h2>
            {activeTab === 'queue' && (
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                Auto-refresh every 10s
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => { refetchQueue(); refetchSession(); }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </header>

        {/* ── TAB 1: Pending Queue ─────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-6">
            {queueLoading && (
              <div className="flex items-center justify-center py-20 text-zinc-600">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading queue...
              </div>
            )}

            {!queueLoading && (!pendingQueue || pendingQueue.length === 0) && (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
                <PackageSearch size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium text-zinc-500">No pending orders in queue</p>
                <p className="text-xs text-zinc-600 mt-1">Orders from the Order Taker will appear here automatically</p>
              </div>
            )}

            {pendingQueue && pendingQueue.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingQueue.map((sale: any) => (
                  <div key={sale.id} className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden hover:border-blue-500/50 transition-all group">
                    {/* Card header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">{sale.invoice_number}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(sale.sale_date).toLocaleTimeString()} • {sale.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-zinc-900 dark:text-white">Rs {sale.total_amount?.toFixed(2)}</p>
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase">Pending</span>
                      </div>
                    </div>
                    {/* Items preview */}
                    <div className="p-4 space-y-1.5 max-h-32 overflow-y-auto">
                      {sale.items?.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs text-zinc-400">
                          <span className="truncate max-w-[160px]">{item.medicine_name}</span>
                          <span className="font-mono shrink-0 ml-2">x{item.quantity}</span>
                        </div>
                      ))}
                      {sale.items?.length > 4 && (
                        <p className="text-[10px] text-zinc-600">+{sale.items.length - 4} more items</p>
                      )}
                    </div>
                    {/* Action */}
                    <div className="p-3 border-t border-zinc-800">
                      <button
                        onClick={() => setVerifyingSale(sale)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all active:scale-95 shadow-sm shadow-blue-500/20 group-hover:shadow-blue-500/40"
                      >
                        <ShieldCheck size={14} />
                        Verify & Collect Payment
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Ledger & Summary ──────────────────────────────────── */}
        {activeTab === 'ledger' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary cards */}
            {session && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  <SummaryCard
                    label="Opening Float"
                    amount={session.opening_balance}
                    icon={Wallet}
                    color="border-zinc-700 bg-zinc-800/50 text-zinc-200"
                    subtitle="Cash at shift start"
                  />
                  <SummaryCard
                    label="Cash Collected"
                    amount={session.total_cash_in}
                    icon={Banknote}
                    color="border-emerald-700/40 bg-emerald-900/20 text-emerald-300"
                    subtitle="From cash sales"
                  />
                  <SummaryCard
                    label="Card / Bank"
                    amount={session.total_card_in}
                    icon={CreditCard}
                    color="border-blue-700/40 bg-blue-900/20 text-blue-300"
                    subtitle="Non-cash payment"
                  />
                  <SummaryCard
                    label="Expenses"
                    amount={session.total_expenses}
                    icon={TrendingDown}
                    color="border-orange-700/40 bg-orange-900/20 text-orange-300"
                    subtitle="Counter outflows"
                  />
                  <SummaryCard
                    label="Expected in Drawer"
                    amount={session.expected_drawer}
                    icon={DollarSign}
                    color="border-indigo-700/40 bg-indigo-900/20 text-indigo-300"
                    subtitle="Opening + Cash − Expenses"
                  />
                </div>

                {/* Ledger table */}
                <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Receipt size={15} className="text-zinc-500" />
                      Transaction Ledger
                    </h3>
                    <span className="text-[10px] text-zinc-500">{session.ledger_entries?.length || 0} entries</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-800/30">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase">Mode</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase">Notes</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase">Time</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {session.ledger_entries?.map((entry: any, i: number) => (
                          <tr key={entry.id || i} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                entry.entry_type === 'SALE' ? 'bg-emerald-900/40 text-emerald-400' :
                                entry.entry_type === 'OPENING' ? 'bg-blue-900/40 text-blue-400' :
                                entry.entry_type === 'EXPENSE' ? 'bg-orange-900/40 text-orange-400' :
                                'bg-rose-900/40 text-rose-400'
                              }`}>
                                {entry.entry_type === 'SALE' && <ArrowUpRight size={10} />}
                                {entry.entry_type === 'EXPENSE' && <ArrowDownRight size={10} />}
                                {entry.entry_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-400">{entry.payment_mode}</td>
                            <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">{entry.notes || '—'}</td>
                            <td className="px-4 py-3 text-zinc-500">
                              {entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : '—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${
                              entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {entry.amount >= 0 ? '+' : ''}Rs {Math.abs(entry.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {(!session.ledger_entries || session.ledger_entries.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">
                              No entries yet. Sales and expenses will appear here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!session && (
              <div className="flex items-center justify-center py-20 text-zinc-600">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading session data...
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {verifyingSale && (
        <CashierVerificationModal
          sale={verifyingSale}
          onClose={() => setVerifyingSale(null)}
          onSuccess={() => {
            setVerifyingSale(null);
            qc.invalidateQueries({ queryKey: ['cashier', 'pending-queue'] });
            qc.invalidateQueries({ queryKey: ['cashier', 'session', 'current'] });
            // skipPrint is implicit — no InvoicePreview shown in Cashier Portal
          }}
        />
      )}

      {showExpenseModal && (
        <LogExpenseModal onClose={() => setShowExpenseModal(false)} />
      )}

      {showCloseModal && session && (
        <CloseShiftModal
          session={session}
          onClose={() => setShowCloseModal(false)}
          onClosed={(data) => {
            setShowCloseModal(false);
            setClosedSessionData(data);
          }}
        />
      )}

      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in { animation: zoomIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
