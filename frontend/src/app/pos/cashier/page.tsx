'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useModules } from '@/lib/modules';
import { useLowStockAlerts } from '@/features/inventory/services/alerts.api';
import { parseApiError } from '@/utils/errorParser';

import {
  useCashierSessionCheck,
  useCashierSession,
  useOpenSession,
  useCloseSession,
  useLogExpense,
  usePendingQueuePolling,
  useWorkflowMode,
} from '@/features/pos/services/pos.api';
import CashierVerificationModal from '@/features/pos/components/CashierVerificationModal';

import {
  Banknote, CreditCard, Receipt, DollarSign, TrendingDown,
  LogOut, Plus, X, AlertTriangle, CheckCircle2, RefreshCw, Loader2,
  ShieldCheck, PackageSearch, ArrowUpRight, ArrowDownRight, ChevronRight,
  BarChart3, Wallet, Moon, Sun, Search, Bell, Monitor, ClipboardList,
  Stethoscope, ShoppingBag, PackagePlus, Package, Users, FileText,
  Activity, PieChart, ShieldAlert, UserCog, LayoutDashboard, ShoppingCart, Settings, Trash2, Clock, Printer
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVoidSale } from '@/features/sales/services/sales.api';
import toast from 'react-hot-toast';
import { NAV_ITEMS } from '@/components/layout/Sidebar';

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
      <div className="w-full max-w-md rounded-2xl bg-surface border border-outline shadow-2xl overflow-hidden animate-scaleIn">
        <div className="bg-primary p-6 border-b border-outline">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-white/20">
              <ShieldCheck className="h-6 w-6 text-on-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-primary">Open Cash Register</h2>
              <p className="text-xs text-primary-fixed-dim">Start your shift to unlock the Cashier Portal</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
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
              className="w-full rounded-xl border border-outline bg-surface px-4 py-3 text-2xl font-mono font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-2 text-xs text-on-surface-variant">Enter 0 if starting with an empty drawer.</p>
          </div>
          {openSession.isError && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container p-3 text-sm text-error">
              <AlertTriangle size={14} />
              <span>{(openSession.error as any)?.response?.data?.detail || 'Failed to open session.'}</span>
            </div>
          )}
          <button
            onClick={handleOpen}
            disabled={loading || openSession.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-on-primary hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
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

  useEffect(() => {
    if (session) {
      if (session.expected_drawer === undefined || session.expected_drawer === null) {
        setActualCash('');
      } else if (!actualCash) {
        setActualCash(session.expected_drawer.toString());
      }
    }
  }, [session]);


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
      <div className="w-full max-w-md rounded-2xl bg-surface border border-outline shadow-2xl animate-scaleIn overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-outline bg-surface-container-low">
          <div className="flex items-center gap-2">
            <LogOut size={18} className="text-error" />
            <h2 className="font-bold text-on-surface">Close Shift & Reconcile</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-variant text-outline"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-surface-container-low p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-on-surface-variant">Opening Balance:</span><span className="font-mono font-bold">Rs {(session?.opening_balance || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-[#16a34a]"><span>Cash Sales:</span><span className="font-mono font-bold">+Rs {(session?.total_cash_in || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-error"><span>Expenses:</span><span className="font-mono font-bold">-Rs {(session?.total_expenses || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-outline pt-2 font-bold"><span>Expected in Drawer:</span><span className="font-mono text-primary">Rs {expected.toFixed(2)}</span></div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Actual Cash Counted (Rs)</label>
            <input type="number" min="0" step="0.01" autoFocus value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-xl font-mono font-bold text-on-surface focus:border-primary focus:outline-none" />
          </div>
          {actualCash && (
            <div className={`rounded-lg p-3 text-sm font-bold flex items-center gap-2 ${discrepancy === 0 ? 'bg-[#dcfce7] text-[#166534]' : discrepancy > 0 ? 'bg-primary-fixed text-primary' : 'bg-error-container text-error'
              }`}>
              {discrepancy === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {discrepancy === 0 ? 'Balanced — No discrepancy!' : discrepancy > 0 ? `OVER by Rs ${discrepancy.toFixed(2)}` : `SHORT by Rs ${Math.abs(discrepancy).toFixed(2)}`}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any discrepancy explanation..." className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none" />
          </div>
          <button onClick={handleClose} disabled={!actualCash || closeSession.isPending} className="w-full flex items-center justify-center gap-2 rounded-xl bg-error py-3 font-bold text-on-error hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-lg">
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
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-outline shadow-2xl animate-scaleIn overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-outline">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-[#ea580c]" />
            <h3 className="font-bold text-on-surface">Log Counter Expense</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-variant text-outline"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Amount (Rs)</label>
            <input autoFocus type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full rounded-lg border border-outline bg-surface px-3 py-2 text-lg font-mono font-bold text-on-surface focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Reason / Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Stationery, Courier, Packaging" className="mt-1 w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            {['Cash', 'Card', 'Bank Transfer'].map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${mode === m ? 'border-primary bg-primary-fixed text-primary' : 'border-outline text-on-surface-variant hover:border-on-surface-variant'}`}>{m}</button>
            ))}
          </div>
          {logExpense.isError && <p className="text-xs text-error">{(logExpense.error as any)?.response?.data?.detail || 'Failed'}</p>}
          <button onClick={handleSubmit} disabled={!amount || !notes || logExpense.isPending} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-bold text-on-primary hover:opacity-90 disabled:opacity-40 transition-all active:scale-95">
            {logExpense.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Log Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utilities ───────────────────────────────────────────────────────────────
const formatToLocalTime = (utcDateString: string | null | undefined) => {
  if (!utcDateString) return '—';
  const safeDateString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  const date = new Date(safeDateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Live Clock Component ────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant">
      <Clock size={16} className="text-primary" />
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({ label, amount, icon: Icon, active }: { label: string; amount: number; icon: any; active?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${active ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-lowest border-outline-variant text-on-surface'}`}>
      <div className="flex items-start justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${active ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>{label}</p>
        <Icon size={18} className={active ? 'text-on-primary opacity-80' : 'text-primary'} />
      </div>
      <p className="text-[26px] font-bold tracking-tight">Rs {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

// ── Main Cashier Portal Page ─────────────────────────────────────────────────
export default function CashierPortalPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [verifyingSale, setVerifyingSale] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedSessionData, setClosedSessionData] = useState<any>(null);
  const [voidSaleId, setVoidSaleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Global 'Alt + S' Key sequential navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt + S
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // Prevent default browser behavior (e.g., save page)
        
        // Find all cards
        const cards = Array.from(document.querySelectorAll('[data-pending-card="true"]')) as HTMLElement[];
        if (cards.length === 0) return;

        // Calculate next focus
        const currentIndex = cards.indexOf(document.activeElement as HTMLElement);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cards.length;
        
        // Apply focus
        cards[nextIndex].focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const voidSaleMutation = useVoidSale();

  const handleVoidSale = async () => {
    if (!voidSaleId) return;
    try {
      await voidSaleMutation.mutateAsync({
        saleId: voidSaleId,
        payload: {
          voided_by: user?.username || 'Cashier',
          void_reason: 'Voided from Cashier Portal'
        }
      });
      toast.success('Sale Voided & Stock Reverted');
      setVoidSaleId(null);
      qc.invalidateQueries({ queryKey: ['cashier', 'pending-queue'] });
    } catch (error: any) {
      toast.error(parseApiError(error));
    }
  };

  const { data: sessionCheck, isLoading: checkLoading } = useCashierSessionCheck();
  const hasSession = sessionCheck?.has_open_session ?? false;
  const { data: session, refetch: refetchSession } = useCashierSession(hasSession);
  const { data: pendingQueue, isLoading: queueLoading, refetch: refetchQueue } = usePendingQueuePolling();
  
  const filteredPendingInvoices = useMemo(() => {
    if (!pendingQueue) return [];
    if (!searchQuery) return pendingQueue;
    return pendingQueue.filter((invoice: any) => 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pendingQueue, searchQuery]);

  const { data: workflowData, isLoading: workflowLoading } = useWorkflowMode();

  const { isModuleEnabled } = useModules();
  const { data: lowStockData } = useLowStockAlerts({ skip: 0, limit: 1 });
  const lowStockCount = lowStockData?.total || 0;

  const isSuperAdmin = user?.role === 'Super Admin';
  const userPermissions: string[] = user?.permissions || [];

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      // Exclude Dashboard and POS from Cashier Portal explicitly
      if (item.label === 'Dashboard' || item.label === 'POS Terminal') {
        return false;
      }

      const hasWildcard = userPermissions.includes('*');
      if (item.permission && !isSuperAdmin && !hasWildcard && !userPermissions.includes(item.permission)) {
        return false;
      }
      if (item.moduleKey && !isSuperAdmin) {
        if (!isModuleEnabled(item.moduleKey)) return false;
      }
      return true;
    });
  }, [userPermissions, isSuperAdmin, isModuleEnabled]);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
    else if (workflowData && workflowData.mode === 'SINGLE_COUNTER') router.push('/pos');
  }, [isAuthenticated, workflowData, router]);

  if (!isAuthenticated) return null;

  if (checkLoading || workflowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (closedSessionData) {
    const disc = closedSessionData.discrepancy || 0;
    
    let varianceColor = '';
    let varianceLabel = '';
    if (disc === 0) {
      varianceColor = 'text-[#16a34a] bg-[#dcfce7] border-[#bbf7d0]';
      varianceLabel = 'Perfect Balance';
    } else if (disc > 0) {
      varianceColor = 'text-blue-700 bg-blue-50 border-blue-200';
      varianceLabel = 'Over';
    } else {
      varianceColor = 'text-red-700 bg-red-50 border-red-200';
      varianceLabel = 'Short';
    }

    return (
      <>
        <div className="min-h-screen w-screen bg-surface flex flex-col items-center justify-center p-6 print:hidden">
          <div className="w-full max-w-3xl rounded-3xl bg-surface-container-lowest border border-outline shadow-2xl p-8 lg:p-12 text-center animate-scaleIn">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#dcfce7] shadow-inner border border-[#bbf7d0]">
              <CheckCircle2 className="h-10 w-10 text-[#16a34a]" />
            </div>
            <h1 className="text-3xl font-extrabold text-on-surface mb-2 tracking-tight">Shift Closed Successfully</h1>
            <p className="text-on-surface-variant text-base mb-8">Thank you for your hard work! Here is the summary of your shift.</p>
            
            {/* Shift Details */}
            <div className="flex justify-center gap-4 mb-8 text-sm font-medium text-on-surface-variant bg-surface-container-low py-3 px-6 rounded-full inline-flex border border-outline-variant">
              <span className="flex items-center gap-2"><Clock size={16} /> Duration: {formatToLocalTime(closedSessionData.opened_at)} - {formatToLocalTime(closedSessionData.closed_at)}</span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
              <div className="rounded-2xl border border-outline bg-surface p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Expected Cash</p>
                <p className="text-2xl font-mono font-extrabold text-on-surface">Rs {(closedSessionData.closing_balance_expected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-outline bg-surface p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Actual Counted</p>
                <p className="text-2xl font-mono font-extrabold text-on-surface">Rs {(closedSessionData.closing_balance_actual || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={`rounded-2xl border p-5 shadow-sm ${varianceColor}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Variance</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/50">{varianceLabel}</span>
                </div>
                <p className="text-2xl font-mono font-extrabold">Rs {Math.abs(disc).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <button onClick={() => setClosedSessionData(null)} className="w-full sm:w-auto px-8 flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-on-primary hover:bg-primary/90 transition-all shadow-lg active:scale-95 text-lg">
                Start New Shift
              </button>
              <button onClick={() => window.print()} className="w-full sm:w-auto px-8 flex items-center justify-center gap-2 rounded-xl border-2 border-outline py-4 font-bold text-on-surface hover:bg-surface-container transition-all active:scale-95 text-lg">
                <Printer size={20} /> Print Summary
              </button>
            </div>
          </div>
        </div>

        {/* ── Print-Only Z-Report ────────────────────────────────────────── */}
        <div className="hidden print:block w-full bg-white text-black text-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold uppercase">SHIFT Z-REPORT (END OF SHIFT)</h1>
            <p className="text-gray-600 mt-2">Shift Duration: {formatToLocalTime(closedSessionData.opened_at)} - {formatToLocalTime(closedSessionData.closed_at)}</p>
            <p className="text-gray-600">Printed At: {new Date().toLocaleTimeString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8 border-gray-300">
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-base border-b pb-1">
                <span>Opening Float:</span>
                <span>Rs {(closedSessionData.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-b pb-1 pt-1">
                <span>Expected Cash:</span>
                <span>Rs {(closedSessionData.closing_balance_expected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-base border-b pb-1">
                <span>Actual Counted:</span>
                <span>Rs {(closedSessionData.closing_balance_actual || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-b pb-1 pt-1">
                <span>Variance:</span>
                <span>Rs {Math.abs(disc).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({varianceLabel.toUpperCase()})</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4">Detailed Transactions</h3>
            <table className="w-full text-left border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 font-bold whitespace-nowrap">Date/Time</th>
                  <th className="border border-gray-300 p-2 font-bold whitespace-nowrap">Transaction ID</th>
                  <th className="border border-gray-300 p-2 font-bold whitespace-nowrap">Type</th>
                  <th className="border border-gray-300 p-2 font-bold whitespace-nowrap">Mode</th>
                  <th className="border border-gray-300 p-2 font-bold text-right whitespace-nowrap">Amount</th>
                  <th className="border border-gray-300 p-2 font-bold text-right whitespace-nowrap">Running Balance</th>
                  <th className="border border-gray-300 p-2 font-bold w-full">Notes/Reference</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (!closedSessionData.transactions || closedSessionData.transactions.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">
                          No transactions recorded during this shift.
                        </td>
                      </tr>
                    );
                  }

                  let currentBalance = 0;
                  const txWithBalance = [...closedSessionData.transactions]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map(tx => {
                      if (tx.type === 'OPENING_BALANCE' || tx.type === 'OPENING') currentBalance += tx.amount;
                      else if (tx.type === 'SALE' && (tx.payment_mode === 'Cash' || tx.payment_mode == null)) currentBalance += tx.amount;
                      else if (tx.type === 'EXPENSE') currentBalance -= Math.abs(tx.amount);
                      else if (tx.type === 'RETURN' && (tx.payment_mode === 'Cash' || tx.payment_mode == null)) currentBalance -= Math.abs(tx.amount);
                      return { ...tx, running_balance: currentBalance };
                    });

                  return txWithBalance.map((tx: any, index: number) => {
                    const isIncome = tx.type === 'SALE' || tx.type === 'OPENING_BALANCE' || tx.type === 'OPENING';
                    const isExpense = tx.type === 'EXPENSE' || tx.type === 'RETURN';
                    const isVoid = tx.status === 'Voided' || tx.status === 'VOID' || tx.type === 'VOID';
                    const entryTypeDisplay = isVoid ? 'VOID' : (tx.type || '').replace('_', ' ');

                    const getDisplayId = (e: any) => {
                      if (e.type === 'OPENING_BALANCE' || e.type === 'OPENING') return 'OPENING-FLOAT';
                      if (e.type === 'EXPENSE') return `EXP-${(e.id || '').substring(0, 6).toUpperCase()}`;
                      if (e.type === 'RETURN') return `RET-${(e.id || '').substring(0, 6).toUpperCase()}`;
                      return e.invoice_number || (e.id || '').substring(0, 8).toUpperCase();
                    };
                    const displayId = getDisplayId(tx);

                    return (
                      <tr key={tx.id || index}>
                        <td className="border border-gray-300 p-2 whitespace-nowrap">{formatToLocalTime(tx.created_at)}</td>
                        <td className="border border-gray-300 p-2 font-mono whitespace-nowrap">{displayId}</td>
                        <td className="border border-gray-300 p-2 uppercase whitespace-nowrap">
                          <span className={isVoid ? 'font-bold text-red-600' : ''}>{entryTypeDisplay}</span>
                        </td>
                        <td className="border border-gray-300 p-2 whitespace-nowrap">{tx.payment_mode || 'Cash'}</td>
                        <td className={`border border-gray-300 p-2 text-right font-mono whitespace-nowrap ${isExpense ? 'text-red-700 font-bold' : isIncome ? 'text-green-700 font-bold' : ''}`}>
                          {tx.amount < 0 ? '- Rs ' : '+ Rs '}{Math.abs(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono text-gray-700 whitespace-nowrap">
                          {tx.running_balance < 0 ? '-' : ''}{Math.abs(tx.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 p-2 max-w-xs truncate">
                          {isVoid && tx.type !== 'VOID' ? <span className="text-red-600 font-bold mr-1">VOIDED:</span> : null}
                          {tx.notes || '—'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-16 pt-8 text-base">
            <div className="w-64 text-center">
              <div className="border-t-2 border-black pt-2 font-bold">Cashier Signature</div>
            </div>
            <div className="w-64 text-center">
              <div className="border-t-2 border-black pt-2 font-bold">Manager Signature</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!hasSession) {
    return <ShiftGuardModal onOpen={() => qc.invalidateQueries({ queryKey: ['cashier'] })} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-on-surface font-sans">
      {/* ── Sidebar (Integrated Global + Cashier Controls) ──────────────── */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
        <div className="p-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">N</div>
          <h1 className="font-bold text-on-surface tracking-tight text-lg">NEPMS</h1>
        </div>

        {/* Shift Widget */}
        <div className="px-4 mb-4">
          <div className="rounded-xl bg-primary-fixed p-3 border border-primary-fixed-dim shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                SHIFT ACTIVE
              </span>
              <span className="text-xs text-primary/70 font-medium">Float: Rs {(session?.opening_balance || 0).toFixed(2)}</span>
            </div>
            <p className="text-sm font-semibold text-primary/90">Started: {formatToLocalTime(session?.opened_at)}</p>
          </div>
        </div>

        {/* Global Navigation */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${isActive
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
              >
                <div className="flex items-center">
                  <item.icon className={`flex-shrink-0 mr-3 h-[18px] w-[18px] ${isActive ? 'text-on-primary' : 'text-on-surface-variant group-hover:text-primary'}`} />
                  <span>{item.label}</span>
                </div>
                {item.href === '/inventory/low-stock' && lowStockCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
                    {lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Info & Actions */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
          <button onClick={() => setShowCloseModal(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-low py-2.5 text-sm font-semibold text-error hover:bg-error-container transition-all mb-3 border border-outline-variant hover:border-error/30">
            <LogOut size={16} /> Close Shift
          </button>
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-bold text-on-surface truncate">{user?.username}</p>
              <p className="text-xs text-on-surface-variant truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-surface relative">
        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-8">
          <div>
            <h2 className="text-xl font-bold text-on-surface tracking-tight">Cashier Portal</h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Manage queue, process payments, and track ledger</p>
          </div>
          <div className="flex items-center gap-4">
            <LiveClock />
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input 
                type="text" 
                placeholder="Search orders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 rounded-full border border-outline-variant bg-surface px-9 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
              />
            </div>
            <button className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Summary Row */}
          {session && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Opening Float" amount={session.opening_balance} icon={Wallet} />
              <SummaryCard label="Cash Collected" amount={session.total_cash_in} icon={Banknote} />
              <SummaryCard label="Card / Bank" amount={session.total_card_in} icon={CreditCard} />
              <SummaryCard label="Expected Drawer" amount={session.expected_drawer} icon={DollarSign} active />
            </div>
          )}

          {/* 2 Columns: Queue & Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Col: Pending Verification Queue */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  Pending Verification
                  {pendingQueue && pendingQueue.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
                      {pendingQueue.length}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="hidden md:inline-block text-[10px] text-on-surface-variant font-medium bg-surface-container-low px-2 py-1 rounded border border-outline-variant">
                    Shortcuts: [Alt+S] Navigate • [Enter] Open • [Del] Void
                  </span>
                  <button onClick={() => refetchQueue()} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80">
                    <RefreshCw size={12} className={queueLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>

              {!queueLoading && (!filteredPendingInvoices || filteredPendingInvoices.length === 0) && (
                <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center flex flex-col items-center bg-surface-container-lowest">
                  <div className="h-16 w-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} className="text-on-surface-variant" />
                  </div>
                  <p className="text-sm font-bold text-on-surface">
                    {searchQuery ? 'No orders match your search' : 'Queue is clear'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {searchQuery ? 'Try adjusting your search filters.' : 'Orders sent from the Order Taker will appear here automatically.'}
                  </p>
                </div>
              )}

              {filteredPendingInvoices && filteredPendingInvoices.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPendingInvoices.map((sale: any) => (
                    <div 
                      key={sale.id} 
                      tabIndex={0}
                      data-pending-card="true"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setVerifyingSale(sale);
                        } else if (e.key === 'Delete') {
                          e.preventDefault();
                          setVoidSaleId(sale.id);
                        }
                      }}
                      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-600 focus:scale-[1.02] transition-all cursor-pointer"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-on-surface text-sm tracking-tight">{sale.invoice_number}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{formatToLocalTime(sale.sale_date)} • {sale.items?.length || 0} items</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-primary text-base">Rs {sale.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <span className="inline-block mt-1 rounded text-[9px] font-bold uppercase tracking-wider text-error bg-error-container px-1.5 py-0.5 animate-pulse shadow-sm">Pending</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 mb-4 max-h-24 overflow-y-auto">
                          {sale.items?.slice(0, 3).map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs text-on-surface-variant">
                              <span className="truncate max-w-[180px] font-medium">{item.medicine_name}</span>
                              <span className="font-mono font-medium ml-2">x{item.quantity}</span>
                            </div>
                          ))}
                          {sale.items?.length > 3 && (
                            <p className="text-[10px] text-on-surface-variant font-medium pt-1">+{sale.items.length - 3} more items...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVoidSaleId(sale.id)}
                          className="flex items-center justify-center p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                          title="Void Sale & Revert Stock"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => setVerifyingSale(sale)}
                          className="w-full flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-[#15803d] transition-colors animate-heartbeat shadow-md shadow-green-500/20 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]"
                        >
                          <ShieldCheck size={16} strokeWidth={2.5} className="drop-shadow-md" /> Verify & Collect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Recent Ledger */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-on-surface">Recent Ledger</h3>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col h-[calc(100vh-280px)]">
                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                  {session?.ledger_entries?.slice(0, 15).map((entry: any, i: number) => {
                    const isPositive = entry.amount >= 0;
                    return (
                      <div key={entry.id || i} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPositive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-error-container text-error'}`}>
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">{entry.entry_type === 'SALE' ? 'Sale Payment' : entry.entry_type === 'EXPENSE' ? 'Expense' : entry.entry_type}</p>
                            <p className="text-[10px] text-on-surface-variant">{entry.payment_mode} • {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <span className={`font-mono text-xs font-bold ${isPositive ? 'text-[#16a34a]' : 'text-error'}`}>
                          {isPositive ? '+' : '-'}Rs {Math.abs(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                  {(!session?.ledger_entries || session.ledger_entries.length === 0) && (
                    <div className="py-8 text-center text-on-surface-variant text-xs">
                      No transactions yet today.
                    </div>
                  )}
                </div>

                {/* Ledger Actions */}
                <div className="pt-4 mt-2 border-t border-outline-variant space-y-2">
                  <button onClick={() => setShowExpenseModal(true)} className="w-full flex items-center justify-center gap-2 rounded-lg bg-surface-container-high py-2 text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant">
                    <TrendingDown size={14} className="text-[#ea580c]" /> Log Counter Expense
                  </button>
                  <Link href="/pos/cashier/ledger" className="w-full flex items-center justify-center gap-2 rounded-lg bg-surface-container-lowest py-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">
                    <BarChart3 size={14} /> Full Ledger History
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Floating NEW SALE Button removed as per request */}
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
          }}
        />
      )}
      {showExpenseModal && <LogExpenseModal onClose={() => setShowExpenseModal(false)} />}
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

      {/* Void Sale Alert Dialog */}
      <AlertDialog open={!!voidSaleId} onOpenChange={(open) => !open && setVoidSaleId(null)}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 size={20} />
              Void Pending Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this pending invoice? All items will be returned to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleVoidSale();
              }}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
              disabled={voidSaleMutation.isPending}
            >
              {voidSaleMutation.isPending ? 'Voiding...' : 'Yes, Void Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
