'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePOSStore } from '@/features/pos/store/pos-store';
import { useAuthStore } from '@/stores/auth-store';
import MedicineSearch from '@/features/pos/components/MedicineSearch';
import CartPanel from '@/features/pos/components/CartPanel';
import PaymentPanel from '@/features/pos/components/PaymentPanel';
import InvoicePreview from '@/features/pos/components/InvoicePreview';
import HeldSalesDrawer from '@/features/pos/components/HeldSalesDrawer';
import VerificationQueueDrawer from '@/features/pos/components/VerificationQueueDrawer';
import CashierVerificationModal from '@/features/pos/components/CashierVerificationModal';
import { useCheckout, useWorkflowMode, useMyTerminal } from '@/features/pos/services/pos.api';
import { QuickActionsMenu } from '@/features/pos/components/QuickActionsMenu';
import { Clock, Calendar, Building2, Store, MonitorSmartphone, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// POS is intentionally PINNED to a hard emerald-green theme — it does NOT follow
// the app accent picker. These vars override the accent-driven --brand / --md-*
// for the POS subtree only, so the terminal is always green with white text on
// green, regardless of what accent the rest of the app uses.
const POS_GREEN = {
  ['--brand']: '#059669',
  ['--brand-2']: '#047857',
  ['--brand-soft']: 'rgba(5, 150, 105, 0.14)',
  ['--brand-strong']: '#065f46',
  ['--brand-fg']: '#ffffff',
  ['--md-primary']: '#059669',
  ['--md-primary-container']: '#047857',
  ['--md-on-primary-container']: '#ffffff',
  backgroundImage: 'linear-gradient(135deg, var(--brand-soft), transparent 55%)',
} as React.CSSProperties;

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 shadow-sm mr-2">
      <div className="flex items-center gap-1.5 border-r border-outline-variant pr-3">
        <Calendar size={14} className="text-primary/70" />
        <span className="text-[12px] font-semibold text-on-surface-variant">
          {time.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock size={14} className="text-primary" />
        <span className="font-[Arial] font-bold tracking-wide text-[14px] text-primary mt-0.5">
          {time.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour12: true })}
        </span>
      </div>
    </div>
  );
}

export default function POSFullScreen() {
  const router = useRouter();
  const { isAuthenticated, user, branchId } = useAuthStore();
  const { cartItems, setPaymentMethod, clearCart } = usePOSStore();
  
  const currentBranchName = user?.assigned_branches?.find(b => b.id === branchId)?.name || 'Branch Not Selected';
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const checkoutButtonRef = useRef<HTMLButtonElement>(null);
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showVerificationQueue, setShowVerificationQueue] = useState(false);
  const [verifyingSale, setVerifyingSale] = useState<any>(null);
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
  // Cashier terminal suppresses auto-print after verify-complete
  const [skipPrint, setSkipPrint] = useState(false);

  const { data: workflowData } = useWorkflowMode();
  const isDualCounter = workflowData?.mode === 'DUAL_COUNTER';

  // Each salesman gets their own counter number, allocated server-side.
  const { data: terminal } = useMyTerminal();
  const counterLabel = terminal?.counter_label ?? 'Counter —';
  const operatorName = terminal?.user_name || user?.full_name || user?.username || 'Operator';

  const flashShortcut = (key: string) => {
    setActiveShortcut(key);
    setTimeout(() => setActiveShortcut(null), 300);
  };
  
  const checkoutMutation = useCheckout();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'Cashier') {
      router.push('/cashier');
    }
  }, [isAuthenticated, user, router]);

  const handleHoldSale = async () => {
    if (cartItems.length === 0) return;
    try {
      await checkoutMutation.mutateAsync({
        items: cartItems.map(item => ({
          medicine_id: item.medicine.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: (item.unit_price * item.quantity) - item.subtotal
        })),
        discount_amount: usePOSStore.getState().totalDiscount,
        adjustment_amount: usePOSStore.getState().adjustmentAmount,
        tax_amount: usePOSStore.getState().taxAmount,
        amount_paid: 0,
        payment_method: 'Cash',
        hold_sale: true
      });
      clearCart();
      // Optional: show a toast notification here
    } catch (error) {
      console.error("Failed to hold sale", error);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'F2') {
        e.preventDefault();
        flashShortcut('F2');
        searchInputRef.current?.focus();
      } else if (e.key === 'F4' || (e.ctrlKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        flashShortcut('Ctrl+S');
        checkoutButtonRef.current?.click();
      } else if (e.key === 'F8') {
        e.preventDefault();
        flashShortcut('F8');
        handleHoldSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        flashShortcut('F9');
        setShowHeldSales(true);
      } else if (e.key === 'F10' && isDualCounter) {
        e.preventDefault();
        flashShortcut('F10');
        setShowVerificationQueue(true);
      } else if (e.key === 'Escape' && isTyping && target.id === 'medicine-search') {
        if (searchInputRef.current) searchInputRef.current.value = '';
      } else if (e.key === 'Escape' && !isTyping) {
        // Exit POS. Confirm first if there's an unsold cart so it isn't lost.
        e.preventDefault();
        flashShortcut('Esc');
        if (cartItems.length === 0 || window.confirm('Exit POS? The current cart will be cleared.')) {
          router.push('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isDualCounter]);

  if (!isAuthenticated) return null;

  if (showInvoice && invoiceData) {
    return (
      <InvoicePreview 
        invoice={invoiceData}
        skipPrint={skipPrint}
        onNewSale={() => {
          setShowInvoice(false);
          setInvoiceData(null);
          setSkipPrint(false);
          clearCart();
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }} 
      />
    );
  }

  return (
    <div
      style={POS_GREEN}
      className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 text-on-surface font-sans dark:bg-zinc-950"
    >
      {/* Premium Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex justify-between items-center w-full px-6 h-20 bg-white/70 backdrop-blur-md border-b border-zinc-200/70 shadow-sm shrink-0 z-10 dark:bg-zinc-950/70 dark:border-zinc-800"
      >
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30"
          >
            P
          </motion.div>
          <div>
            <h1 className="font-headline-lg text-headline-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 tracking-tight font-extrabold leading-tight">
              PharmaPOS
            </h1>
            <span className="text-xs font-semibold text-primary/60 tracking-widest uppercase">Enterprise Edition</span>
          </div>

          {/* New Selectors (Branch, Warehouse, Counter) */}
          <div className="hidden lg:flex items-center gap-3 ml-8 pl-8 border-l border-outline-variant/30">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-outline-variant/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md cursor-pointer">
               <Building2 size={16} className="text-primary/70" />
               <span className="text-sm font-semibold">{currentBranchName}</span>
             </div>
             <QuickActionsMenu />
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-outline-variant/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md cursor-pointer">
               <MonitorSmartphone size={16} className="text-primary/70" />
               <span className="text-sm font-semibold">{counterLabel}</span>
             </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6 h-full">
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowHeldSales(true)}
              style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-soft)' }}
              className="px-4 py-2 backdrop-blur-sm border border-transparent rounded-xl font-semibold text-sm transition-all shadow-sm relative overflow-hidden group"
            >
              Held Sales
              {activeShortcut === 'F9' && <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-md" style={{ backgroundColor: 'var(--brand)' }}></span>}
            </motion.button>
          </div>
          <div className="flex items-center gap-4 pl-4 border-l border-outline-variant/30">
            <LiveClock />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/')}
              title="Exit POS (Esc)"
              className="px-5 py-2 bg-red-50/50 backdrop-blur-sm text-red-600 hover:bg-red-100/80 border border-red-200/50 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2"
            >
              <LayoutGrid size={16} />
              Exit POS
              <span className="hidden lg:inline text-[10px] font-semibold bg-red-100/70 text-red-500 px-1.5 py-0.5 rounded ml-0.5">Esc</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Grid */}
      {!branchId ? (
        <div className="flex-1 flex items-center justify-center bg-surface/50 backdrop-blur-sm z-50">
          <div className="bg-surface p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center border border-outline-variant">
            <Store className="w-16 h-16 text-primary/50 mb-4" />
            <h2 className="text-2xl font-bold text-on-surface mb-2">Branch Required</h2>
            <p className="text-on-surface-variant mb-6">
              You are currently viewing Combined Data. The Point of Sale must be operated within a specific branch. Please return to the dashboard and select a branch.
            </p>
            <button 
              onClick={() => router.push('/')} 
              className="px-6 py-2.5 bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 font-medium transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <main className="flex-1 flex overflow-hidden p-3 gap-3 z-0">
          {/* Left: Search */}
          <motion.aside 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-[30%] min-w-[340px] bg-white/80 backdrop-blur-xl border border-zinc-200/70 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/5 dark:bg-zinc-950/70 dark:border-zinc-800"
          >
            <MedicineSearch searchInputRef={searchInputRef} />
          </motion.aside>

          {/* Center: Cart */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 bg-white/80 backdrop-blur-xl border border-zinc-200/70 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/5 dark:bg-zinc-950/70 dark:border-zinc-800"
          >
            <CartPanel onHoldSale={handleHoldSale} />
          </motion.section>

          {/* Right: Checkout */}
          <motion.aside 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-[32%] min-w-[360px] max-w-[420px] bg-white/80 backdrop-blur-xl border border-zinc-200/70 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/5 dark:bg-zinc-950/70 dark:border-zinc-800"
          >
            <PaymentPanel 
              checkoutButtonRef={checkoutButtonRef}
              onSuccess={(invoice) => {
                setInvoiceData(invoice);
                setShowInvoice(true);
                clearCart();
              }}
            />
          </motion.aside>
        </main>
      )}
      
      {/* Footer Status Bar */}
      <footer className="h-8 shrink-0 bg-surface-container text-[11px] text-on-surface-variant px-gutter flex items-center justify-between border-t border-outline-variant">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="font-semibold text-on-surface">{operatorName}</span>
            <span className="text-outline">·</span>
            <span>{counterLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-outline uppercase font-bold mr-2">Shortcuts:</span>
          <span className={activeShortcut === 'F2' ? 'text-primary font-bold' : ''}>[F2] Search</span>
          <span className={activeShortcut === 'Ctrl+S' ? 'text-primary font-bold' : ''}>[Ctrl+S] Pay & Print</span>
          <span className={activeShortcut === 'F8' ? 'text-primary font-bold' : ''}>[F8] Hold</span>
          <span className={activeShortcut === 'F9' ? 'text-primary font-bold' : ''}>[F9] Held List</span>
          <span className={activeShortcut === 'Esc' ? 'text-red-500 font-bold' : ''}>[Esc] Exit</span>

        </div>
      </footer>
      
      <HeldSalesDrawer isOpen={showHeldSales} onClose={() => setShowHeldSales(false)} />
      
      <VerificationQueueDrawer 
        isOpen={showVerificationQueue} 
        onClose={() => setShowVerificationQueue(false)} 
        onSelectSale={(sale) => {
          setVerifyingSale(sale);
        }}
      />

      {verifyingSale && (
        <CashierVerificationModal 
          sale={verifyingSale} 
          onClose={() => setVerifyingSale(null)} 
          onSuccess={(completedInvoice) => {
            setVerifyingSale(null);
            setShowVerificationQueue(false);
            setSkipPrint(true);
            setInvoiceData(completedInvoice);
            setShowInvoice(true);
          }}
        />
      )}
    </div>
  );
}
