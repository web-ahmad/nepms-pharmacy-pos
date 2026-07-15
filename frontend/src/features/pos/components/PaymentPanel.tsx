import { useState } from 'react';
import { usePOSStore } from '../store/pos-store';
import { useCheckout, useWorkflowMode } from '../services/pos.api';
import { CheckoutPayload } from '../types/pos';
import { CreditCard, Banknote, Landmark, Loader2, AlertCircle, Search, ClipboardList, X, Split, Gift } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCustomers } from '@/features/crm/services/crm.api';
import { Customer } from '@/features/crm/types/crm';
import POSPrescriptions from './POSPrescriptions';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaymentPanel({ 
  checkoutButtonRef, 
  onSuccess 
}: { 
  checkoutButtonRef: React.RefObject<HTMLButtonElement | null>,
  onSuccess: (data: any) => void
}) {
  const { 
    cartItems, 
    finalTotal, 
    amountPaid, 
    changeDue, 
    paymentMethod, 
    setPaymentMethod, 
    setAmountPaid,
    selectedCustomer,
    globalDiscount,
    setGlobalDiscount,
    adjustmentAmount,
    setAdjustmentAmount,
    totalDiscount,
    taxAmount
  } = usePOSStore();
  
  const { user } = useAuthStore();
  const checkoutMutation = useCheckout();
  const [errorMsg, setErrorMsg] = useState('');
  
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customers } = useCustomers(customerSearch);
  const selectedCustomerData = customers?.find(c => c.id === selectedCustomer);

  const hasDiscountPermission = user?.permissions?.includes('pos.apply_discount') || user?.role === 'Super Admin';

  const { data: workflowData } = useWorkflowMode();
  const isDualCounter = workflowData?.mode === 'DUAL_COUNTER';

  const handleCheckout = async (holdSale = false) => {
    setErrorMsg('');
    if (cartItems.length === 0) {
      setErrorMsg('Cart is empty.');
      return;
    }
    
    // Auto set amountPaid to finalTotal for Card/Transfer if they haven't typed it
    let actualPaid = amountPaid;
    if ((paymentMethod === 'Card' || paymentMethod === 'Bank Transfer') && amountPaid === 0) {
      actualPaid = finalTotal;
    }

    // Require customer for partial payment/credit if not holding sale (and not in dual counter mode where cashier handles payment)
    if (!holdSale && !isDualCounter && actualPaid < finalTotal && !selectedCustomer) {
      setErrorMsg('Customer selection is required for partial payments / credit sales.');
      return;
    }

    const payload: CheckoutPayload = {
      customer_id: selectedCustomer || undefined,
      items: cartItems.map(item => ({
        medicine_id: item.medicine.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: (item.unit_price * item.quantity) - item.subtotal // Send absolute discount per item
      })),
      discount_amount: totalDiscount,
      adjustment_amount: adjustmentAmount,
      tax_amount: taxAmount,
      amount_paid: actualPaid,
      payment_method: paymentMethod,
      hold_sale: holdSale
    };

    try {
      const result = await checkoutMutation.mutateAsync(payload);
      onSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Checkout failed. Please try again.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Customer Information Card */}
      <div className="bg-surface/50 rounded-2xl border border-outline-variant/40 p-4 relative flex-shrink-0 shadow-sm backdrop-blur-sm">
        <h3 className="text-xs font-bold text-primary/70 mb-3 uppercase tracking-widest">Customer Info</h3>
        
        {/* Customer Selection Input */}
        <div className="relative mb-2">
          <div className="flex items-center border border-outline-variant/50 rounded-xl bg-surface focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
            <Search className="ml-3 text-primary/50 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by name, phone, CNIC..."
              className="w-full p-2.5 text-sm focus:outline-none bg-transparent text-on-surface font-medium"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          
          {customerSearch && customers && customers.length > 0 && !selectedCustomerData && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-outline-variant rounded-md shadow-lg max-h-48 overflow-y-auto">
            {customers.map(cust => (
              <button
                key={cust.id}
                className="w-full text-left px-4 py-2 hover:bg-surface-container transition-colors"
                onClick={() => {
                  usePOSStore.getState().setCustomer(cust.id);
                  setCustomerSearch('');
                }}
              >
                <div className="font-title-md text-body-md text-on-surface">{cust.full_name}</div>
                <div className="text-body-sm text-outline">{cust.phone || 'No phone'}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCustomerData ? (
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-title-sm text-body-md font-bold">
              {selectedCustomerData.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-title-sm text-body-md text-on-surface leading-tight font-bold">{selectedCustomerData.full_name}</h4>
              <p className="text-[10px] text-on-surface-variant">{selectedCustomerData.phone || 'No phone'} • Tier: {selectedCustomerData.loyalty_tier || 'Standard'}</p>
            </div>
            <button 
              onClick={() => usePOSStore.getState().setCustomer(null)}
              className="absolute top-2 right-2 text-outline hover:text-error p-1"
              title="Remove Customer (Revert to Walking)"
            >
              <X size={14} />
            </button>
          </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Loyalty Points</p>
                <p className="font-title-sm text-body-md font-bold text-primary">{selectedCustomerData.loyalty_points || 0}</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Balance</p>
                <p className="font-title-sm text-body-md font-bold text-error">Rs {selectedCustomerData.current_balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {selectedCustomerData.loyalty_points > 0 && (
              <div className="mt-2 pt-2 border-t border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-on-surface">Redeem Points (Max {selectedCustomerData.loyalty_points})</span>
                  <input 
                    type="number"
                    placeholder="Pts"
                    className="w-20 px-2 py-1 text-body-sm rounded border border-outline-variant bg-white focus:outline-none focus:border-primary"
                    onChange={(e) => {
                      const pts = Number(e.target.value);
                      if (pts > 0 && pts <= selectedCustomerData.loyalty_points) {
                        setGlobalDiscount('FIXED', pts * 0.1);
                      } else {
                        setGlobalDiscount('FIXED', 0);
                      }
                    }}
                  />
                  <span className="text-label-md text-outline">10 pts = Rs 1</span>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs">
              <POSPrescriptions customerId={selectedCustomerData.id} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 rounded-full bg-surface-container-high text-outline flex items-center justify-center font-title-sm text-body-md font-bold">
              W
            </div>
            <div>
              <h4 className="font-title-sm text-body-md text-on-surface leading-tight font-bold">Walking Customer</h4>
              <p className="text-[10px] text-on-surface-variant">Default (No Ledger)</p>
            </div>
          </div>
        )}
      </div>

      {/* Global Discount */}
      {hasDiscountPermission && (
        <div className="mt-4">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Cart Discount</label>
          <div className="flex items-center gap-2">
            <select 
              className="rounded-md border border-outline-variant bg-white p-2 text-body-md focus:border-primary focus:outline-none"
              value={globalDiscount.type}
              onChange={(e) => setGlobalDiscount(e.target.value as 'PERCENTAGE'|'FIXED', globalDiscount.value)}
            >
              <option value="FIXED">Rs</option>
              <option value="PERCENTAGE">%</option>
            </select>
            <input 
              type="number" 
              className="w-full rounded-md border border-outline-variant bg-white p-2 text-body-md focus:border-primary focus:outline-none"
              value={globalDiscount.value}
              onChange={(e) => setGlobalDiscount(globalDiscount.type, parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      )}

      <div className="mt-2">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Adjustment Amount</label>
        <input 
          type="number" 
          className="w-full rounded-md border border-outline-variant bg-white p-2 text-body-md focus:border-primary focus:outline-none"
          value={adjustmentAmount || ''}
          onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
          placeholder="e.g. -5.00 or 10.00"
        />
      </div>

      {/* Amount Received */}
      {!isDualCounter && (
        <div className="mt-4">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">
              {paymentMethod === 'Credit' ? 'Initial Amount Paid (Optional)' : 'Amount Received'}
            </label>
            <input 
              type="number" 
              className="w-full rounded-md border border-outline-variant p-3 text-headline-lg font-[Arial] font-bold focus:border-primary focus:outline-none bg-white text-on-surface [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              value={amountPaid || ''}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              placeholder={(paymentMethod === 'Card' || paymentMethod === 'Bank Transfer') ? finalTotal.toFixed(2) : '0.00'}
            />
          </div>
      )}

      {/* Payment Methods */}
      {!isDualCounter && (
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <label className="text-xs text-on-surface-variant font-bold tracking-widest uppercase mb-3 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['Cash', 'Card', 'Credit', 'Bank Transfer', 'Split', 'Gift Voucher'].map((method) => {
                let Icon = Banknote;
                if (method === 'Card') Icon = CreditCard;
                if (method === 'Bank Transfer') Icon = Landmark;
                if (method === 'Split') Icon = Split;
                if (method === 'Gift Voucher') Icon = Gift;

                const isSelected = paymentMethod === method;

                return (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all shadow-sm ${
                      isSelected
                        ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-white shadow-primary/20'
                        : 'border-outline-variant/50 bg-surface text-on-surface-variant hover:border-primary/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <Icon size={18} className={isSelected ? 'text-white' : 'text-primary/70'} />
                    <span className="font-semibold text-sm">{method}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
      )}

      {/* Summary Box */}
      <div className="mt-auto pt-4 border-t border-outline-variant/30 shrink-0">
        <motion.div 
          layout
          className="bg-gradient-to-br from-primary-container to-primary/20 rounded-2xl p-5 mb-4 border border-primary/10 shadow-inner"
        >
          <div className="flex justify-between items-center text-on-primary-container mb-1">
            <span className="font-semibold opacity-80 uppercase tracking-wider text-xs">Payable Amount</span>
            <span className="text-3xl font-[Arial] font-extrabold tracking-tight text-primary drop-shadow-sm">Rs {finalTotal.toFixed(2)}</span>
          </div>
          
          {!isDualCounter && (
            <AnimatePresence>
                {amountPaid > finalTotal ? (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-between items-center mt-3 border-t border-primary/20 pt-3">
                    <span className="font-semibold text-on-primary-container opacity-90 uppercase tracking-wider text-xs">Change Due</span>
                    <span className="text-2xl font-[Arial] font-extrabold text-emerald-600 dark:text-emerald-400">Rs {changeDue.toFixed(2)}</span>
                  </motion.div>
                ) : amountPaid < finalTotal && amountPaid > 0 ? (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-between items-center mt-3 border-t border-primary/20 pt-3">
                    <span className="font-semibold text-rose-600/80 dark:text-rose-300/80 uppercase tracking-wider text-xs">Remaining Balance</span>
                    <span className="text-2xl font-[Arial] font-extrabold text-rose-600 dark:text-rose-400">Rs {(finalTotal - amountPaid).toFixed(2)}</span>
                  </motion.div>
                ) : (amountPaid === 0 || isNaN(amountPaid)) && (paymentMethod === 'Credit' || selectedCustomer) ? (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-between items-center mt-3 border-t border-primary/20 pt-3">
                    <span className="font-semibold text-rose-600/80 dark:text-rose-300/80 uppercase tracking-wider text-xs">Remaining Balance</span>
                    <span className="text-2xl font-[Arial] font-extrabold text-rose-600 dark:text-rose-400">Rs {finalTotal.toFixed(2)}</span>
                  </motion.div>
                ) : null}
            </AnimatePresence>
          )}
        </motion.div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-error/10 p-3 text-sm font-medium text-error border border-error/20"
            >
              <AlertCircle size={18} className="shrink-0" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          ref={checkoutButtonRef}
          onClick={() => handleCheckout(false)}
          disabled={checkoutMutation.isPending || cartItems.length === 0}
          className="w-full bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-lg py-4 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center justify-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {checkoutMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            isDualCounter ? 'Save Order (Ctrl+S)' : 'Process Sale (Ctrl+S)'
          )}
        </motion.button>
      </div>
    </div>
  );
}
