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
import { useCheckout, useWorkflowMode } from '@/features/pos/services/pos.api';
import { Clock, Calendar } from 'lucide-react';

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
  const { isAuthenticated, user } = useAuthStore();
  const { cartItems, setPaymentMethod, clearCart } = usePOSStore();
  
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

  const flashShortcut = (key: string) => {
    setActiveShortcut(key);
    setTimeout(() => setActiveShortcut(null), 300);
  };
  
  const checkoutMutation = useCheckout();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'Cashier') {
      router.push('/pos/cashier');
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-on-surface font-sans">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">PharmaPOS Elite</h1>
        </div>
        <div className="hidden md:flex items-center gap-8 h-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHeldSales(true)} 
              className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md font-semibold text-sm transition-colors relative"
            >
              Held Sales
              {activeShortcut === 'F9' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full"></span>}
            </button>
          </div>
          <div className="flex items-center gap-4 ml-8">
            <LiveClock />
            <button 
              onClick={() => router.push('/')} 
              className="px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-semibold text-sm transition-colors ml-2"
            >
              Exit POS
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left: Search (1/4) min-w-[320px] */}
        <aside className="w-1/4 min-w-[320px] bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden">
          <MedicineSearch searchInputRef={searchInputRef} />
        </aside>

        {/* Center: Cart (1/2) */}
        <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden">
          <CartPanel onHoldSale={handleHoldSale} />
        </section>

        {/* Right: Checkout (1/4) min-w-[340px] */}
        <aside className="w-1/4 min-w-[340px] flex flex-col gap-2 overflow-hidden">
          <PaymentPanel 
            checkoutButtonRef={checkoutButtonRef} 
            onSuccess={(data) => {
              setInvoiceData(data);
              setShowInvoice(true);
            }} 
          />
        </aside>
      </main>
      
      {/* Footer Status Bar */}
      <footer className="h-8 shrink-0 bg-surface-container text-[11px] text-on-surface-variant px-gutter flex items-center justify-between border-t border-outline-variant">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>System Online: 127.0.0.1</span>
          </div>

        </div>
        <div className="flex items-center gap-4">
          <span className="text-outline uppercase font-bold mr-2">Shortcuts:</span>
          <span className={activeShortcut === 'F2' ? 'text-primary font-bold' : ''}>[F2] Search</span>
          <span className={activeShortcut === 'Ctrl+S' ? 'text-primary font-bold' : ''}>[Ctrl+S] Pay & Print</span>
          <span className={activeShortcut === 'F8' ? 'text-primary font-bold' : ''}>[F8] Hold</span>
          <span className={activeShortcut === 'F9' ? 'text-primary font-bold' : ''}>[F9] Held List</span>

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
