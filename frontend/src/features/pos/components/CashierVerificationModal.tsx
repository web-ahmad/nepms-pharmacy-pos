import { useState, useEffect } from 'react';
import { useVerifyComplete } from '../services/pos.api';
import { useCustomers } from '@/features/crm/services/crm.api';
import { X, Check, AlertTriangle, User, Banknote, CreditCard, Landmark, CheckCircle2, ReceiptText } from 'lucide-react';

interface CashierVerificationModalProps {
  sale: any;
  onClose: () => void;
  onSuccess: (completedInvoice: any) => void;
}

export default function CashierVerificationModal({ sale, onClose, onSuccess }: CashierVerificationModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Credit' | 'Bank Transfer'>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);

  const { data: customers } = useCustomers('');
  const verifyMutation = useVerifyComplete(sale?.id || '');

  useEffect(() => {
    if (sale) {
      setLinkedCustomerId(sale.customer_id || null);
      setAmountReceived(0);
      setPaymentMethod('Cash');
      
      const initialChecked: Record<string, boolean> = {};
      sale.items.forEach((item: any) => {
        initialChecked[item.id] = false;
      });
      setCheckedItems(initialChecked);
    }
  }, [sale]);

  if (!sale) return null;

  const currentCustomer = customers?.find(c => c.id === linkedCustomerId);
  const isWalkingCustomer = !linkedCustomerId;
  
  const allChecked = Object.values(checkedItems).every(v => v === true);
  const totalAmount = sale.total_amount;
  
  const isWalkingPaymentInvalid = isWalkingCustomer && amountReceived < totalAmount;
  const changeDue = Math.max(0, amountReceived - totalAmount);
  const remainingBalance = Math.max(0, totalAmount - amountReceived);

  const handleCheckboxChange = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleVerifyComplete = async () => {
    if (!allChecked) return;
    if (isWalkingPaymentInvalid) return;

    try {
      const result = await verifyMutation.mutateAsync({
        amount_paid: amountReceived,
        payment_method: paymentMethod
      });
      onSuccess(result);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 overflow-y-auto font-sans">
      <div className="flex w-full max-w-[900px] flex-col bg-surface-container-lowest shadow-2xl rounded-xl border border-outline-variant overflow-hidden animate-zoom-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div className="flex items-center gap-3">
            <ReceiptText className="text-primary" size={20} strokeWidth={2.5} />
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              Verify Sale: <span className="text-primary tracking-tight">{sale.invoice_number}</span>
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-container-low text-outline hover:text-on-surface transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row h-full">
          
          {/* Left Column: Checklist */}
          <div className="flex-[1.2] flex flex-col border-b md:border-b-0 md:border-r border-outline-variant bg-surface-container-lowest">
            <div className="p-6 pb-4">
              <h3 className="text-[15px] font-bold text-on-surface mb-1">Physical Items Checklist</h3>
              <p className="text-[13px] text-on-surface-variant">Verify each item physically before completing the transaction.</p>
            </div>
            
            <div className="px-6 flex-1 overflow-y-auto pb-6 max-h-[500px]">
              <div className="border border-outline-variant rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 bg-surface-container-low px-4 py-2 border-b border-outline-variant">
                  <div className="col-span-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Item Details</div>
                  <div className="col-span-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-left">Expiry</div>
                  <div className="col-span-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Qty</div>
                  <div className="col-span-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Price</div>
                </div>
                
                {/* Table Rows */}
                <div className="divide-y divide-outline-variant">
                  {sale.items.map((item: any) => (
                    <label 
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center px-4 py-3 cursor-pointer hover:bg-surface-container-low transition-colors select-none"
                    >
                      <div className="col-span-6 flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={checkedItems[item.id] || false}
                          onChange={() => handleCheckboxChange(item.id)}
                          className="h-[18px] w-[18px] rounded-sm border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer bg-surface"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] text-on-surface truncate pr-2">{item.medicine_name}</p>
                          <p className="text-[11px] text-outline mt-0.5 truncate">SKU: {item.sku || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-span-3 text-[12px] text-on-surface-variant text-left">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString([], {month: '2-digit', year: 'numeric'}) : '12/2025'}
                      </div>
                      <div className="col-span-1 text-[13px] font-bold text-on-surface text-center">
                        {item.quantity}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-[13px] font-bold text-primary">
                          <span className="text-[10px] font-semibold text-primary/70 mr-1">Rs</span>
                          {item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Collection */}
          <div className="flex-1 flex flex-col bg-surface px-8 py-6">
            <h3 className="text-[15px] font-bold text-on-surface mb-5">Payment Collection</h3>

            {/* Customer Type Indicator */}
            <div className="mb-5">
              <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm">
                <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md bg-primary-fixed text-primary">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Customer Type</p>
                  <p className="text-[13px] font-bold text-on-surface">
                    {sale.customer_id ? sale.customer_name : 'Walking Customer (Guest)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2.5">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-2.5">
                {['Cash', 'Card', 'Credit', 'Bank Transfer'].map((method) => {
                  let Icon = Banknote;
                  if (method === 'Card') Icon = CreditCard;
                  if (method === 'Bank Transfer') Icon = Landmark;
                  
                  const isCreditDisabled = method === 'Credit' && isWalkingCustomer;
                  const isActive = paymentMethod === method;

                  return (
                    <button
                      type="button"
                      key={method}
                      disabled={isCreditDisabled}
                      onClick={() => setPaymentMethod(method as any)}
                      className={`flex items-center gap-2.5 rounded-lg border p-3 transition-colors ${
                        isCreditDisabled
                          ? 'opacity-40 cursor-not-allowed bg-surface border-outline-variant text-outline'
                          : isActive
                          ? 'border-primary bg-primary text-on-primary ring-2 ring-primary/20 ring-offset-1'
                          : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50 text-on-surface font-semibold hover:bg-surface-container-low'
                      }`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-on-primary' : 'text-on-surface-variant'} />
                      <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{method}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Received */}
            <div className="mb-6">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Amount Received (Rs)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">Rs</span>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={amountReceived || ''}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-11 pr-4 text-[22px] font-bold text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Validation Box */}
            <div className="mb-6">
              {isWalkingCustomer ? (
                isWalkingPaymentInvalid ? (
                  <div className="flex gap-2.5 rounded-md bg-error-container p-3 border border-error/20 text-error shadow-sm">
                    <AlertTriangle size={16} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed font-medium">
                      Full payment of <span className="font-bold text-error">Rs {totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span> is required for guest checkout. Transaction cannot be finalized until amount is matched.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2.5 rounded-md bg-[#dcfce7] p-3 border border-[#86efac] text-[#166534] shadow-sm">
                    <CheckCircle2 size={16} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <div className="w-full flex justify-between items-center text-[13px] font-bold">
                      <span>Change to return:</span>
                      <span className="font-mono text-sm">Rs {changeDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                )
              ) : (
                amountReceived < totalAmount ? (
                  <div className="flex gap-2.5 rounded-md bg-[#fef3c7] p-3 border border-[#fde68a] text-[#92400e] shadow-sm">
                    <AlertTriangle size={16} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed font-medium">
                      Partial payment allowed. <span className="font-bold">Rs {remainingBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span> will be debited to customer account ledger.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2.5 rounded-md bg-[#dcfce7] p-3 border border-[#86efac] text-[#166534] shadow-sm">
                    <CheckCircle2 size={16} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <div className="w-full flex justify-between items-center text-[13px] font-bold">
                      <span>Change to return:</span>
                      <span className="font-mono text-sm">Rs {changeDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-auto pt-2">
              <div className="h-px w-full bg-outline-variant mb-5"></div>
              
              <div className="flex items-end justify-between mb-5">
                <span className="font-bold text-on-surface-variant text-[15px]">Grand Total</span>
                <span className="font-bold text-primary text-[28px] tracking-tight leading-none">
                  <span className="text-xl font-bold text-primary/80 mr-1.5">Rs</span>
                  {totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </span>
              </div>

              {verifyMutation.isError && (
                <div className="flex items-center gap-2 rounded-lg bg-error-container p-3 text-[11px] text-error mb-4 border border-error/20 font-medium">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>
                    {(verifyMutation.error as any)?.response?.data?.detail || 'Verification failed. Try again.'}
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={!allChecked || isWalkingPaymentInvalid || verifyMutation.isPending}
                onClick={handleVerifyComplete}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-primary py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={18} strokeWidth={2.5} />
                Verify & Complete Sale
              </button>
            </div>
            
          </div>

        </div>
      </div>
      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in {
          animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
