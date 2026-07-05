import { create } from 'zustand';
import { POSCartItem, POSMedicine } from '../types/pos';
import toast from 'react-hot-toast';

interface POSState {
  cartItems: POSCartItem[];
  selectedCustomer: string | null;
  paymentMethod: 'Cash' | 'Card' | 'Credit' | 'Bank Transfer';
  amountPaid: number;
  globalDiscount: { type: 'PERCENTAGE' | 'FIXED'; value: number };
  taxRate: number;
  adjustmentAmount: number;
  
  // Derived calculated fields (kept in state for easy reading)
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  finalTotal: number;
  changeDue: number;

  // Actions
  addItem: (medicine: POSMedicine, quantity?: number, batch?: any) => void;
  updateItemQuantity: (cartId: string, quantity: number) => void;
  updateItemDiscount: (cartId: string, type: 'PERCENTAGE' | 'FIXED', value: number) => void;
  removeItem: (cartId: string) => void;
  setCustomer: (customerId: string | null) => void;
  setPaymentMethod: (method: 'Cash' | 'Card' | 'Credit' | 'Bank Transfer') => void;
  setAmountPaid: (amount: number) => void;
  setGlobalDiscount: (type: 'PERCENTAGE' | 'FIXED', value: number) => void;
  setAdjustmentAmount: (amount: number) => void;
  clearCart: () => void;
  loadCart: (items: any[], customerId: string | null) => void;
}

const calculateTotals = (state: Partial<POSState>) => {
  const items = state.cartItems || [];
  
  // Base subtotal (sum of item price * qty BEFORE item discounts)
  let rawSubtotal = 0;
  
  // Calculate item discounts and update item subtotals
  let totalItemDiscount = 0;
  const updatedItems = items.map(item => {
    rawSubtotal += item.unit_price * item.quantity;
    
    let itemDiscountAmt = 0;
    if (item.discount_type === 'PERCENTAGE') {
      itemDiscountAmt = (item.unit_price * item.quantity) * (item.discount_value / 100);
    } else {
      itemDiscountAmt = item.discount_value;
    }
    
    totalItemDiscount += itemDiscountAmt;
    return {
      ...item,
      subtotal: (item.unit_price * item.quantity) - itemDiscountAmt
    };
  });

  const subtotalAfterItemDiscounts = rawSubtotal - totalItemDiscount;
  
  // Global discount
  let globalDiscountAmt = 0;
  const gDisc = state.globalDiscount || { type: 'FIXED', value: 0 };
  if (gDisc.type === 'PERCENTAGE') {
    globalDiscountAmt = subtotalAfterItemDiscounts * (gDisc.value / 100);
  } else {
    globalDiscountAmt = gDisc.value;
  }
  
  const totalDiscount = totalItemDiscount + globalDiscountAmt;
  
  // Tax
  const taxRate = state.taxRate || 0;
  const subtotalAfterAllDiscounts = Math.max(0, rawSubtotal - totalDiscount);
  const taxAmount = subtotalAfterAllDiscounts * (taxRate / 100);
  
  const adjustmentAmount = state.adjustmentAmount || 0;
  const finalTotal = subtotalAfterAllDiscounts + taxAmount + adjustmentAmount;
  
  // Change
  const paid = state.amountPaid || 0;
  const changeDue = Math.max(0, paid - finalTotal);

  return {
    cartItems: updatedItems,
    subtotal: rawSubtotal,
    totalDiscount,
    taxAmount,
    finalTotal,
    changeDue
  };
};

export const usePOSStore = create<POSState>((set) => ({
  cartItems: [],
  selectedCustomer: null,
  paymentMethod: 'Cash',
  amountPaid: 0,
  globalDiscount: { type: 'FIXED', value: 0 },
  taxRate: 0, // Assume 0 for now, can be configured
  adjustmentAmount: 0,
  
  subtotal: 0,
  totalDiscount: 0,
  taxAmount: 0,
  finalTotal: 0,
  changeDue: 0,

  addItem: (medicine, rawQuantity = 1, batch = undefined) => set((state) => {
    let quantity = rawQuantity || 1;
    // Determine max available stock for validation
    const stock = batch 
      ? batch.available_quantity 
      : medicine.available_quantity;

    // Check if item already exists to just bump quantity
    const existingIndex = state.cartItems.findIndex(i => 
      i.medicine.id === medicine.id && 
      (batch ? i.batch_id === batch.id : (!i.batch_id))
    );
    let newItems = [...state.cartItems];
    
    if (existingIndex >= 0) {
      const newQty = newItems[existingIndex].quantity + quantity;
      if (newQty > stock) {
        toast.error(`Stock Limit Reached: Only ${stock} ${medicine.name} available.`, { id: 'stock-limit-toast' });
        newItems[existingIndex].quantity = stock;
      } else {
        newItems[existingIndex].quantity = newQty;
      }
    } else {
      if (quantity > stock) {
        toast.error(`Stock Limit Reached: Only ${stock} ${medicine.name} available.`, { id: 'stock-limit-toast' });
        quantity = stock;
      }
      if (quantity > 0) {
        const fallbackPrice = medicine.unit_retail_price || medicine.sale_price || 0;
        const price = batch 
          ? (batch.selling_price || fallbackPrice) 
          : fallbackPrice;
        newItems.push({
          cart_id: crypto.randomUUID(),
          medicine,
          batch_id: batch?.id,
          batch_number: batch?.batch_number,
          quantity,
          unit_price: price,
          discount_type: 'FIXED',
          discount_value: 0,
          subtotal: price
        });
      }
    }
    
    return { ...state, ...calculateTotals({ ...state, cartItems: newItems }) };
  }),

  updateItemQuantity: (cartId, quantity) => set((state) => {
    let limitReached = false;
    let limitMessage = '';

    const newItems = state.cartItems.map(item => {
      if (item.cart_id === cartId) {
        // Determine stock availability for validation
        const stock = item.batch_id && item.medicine.batches 
          ? item.medicine.batches.find(b => b.id === item.batch_id)?.available_quantity || 0 
          : item.medicine.available_quantity;

        if (quantity > stock) {
          limitReached = true;
          limitMessage = `Stock Limit Reached: Only ${stock} ${item.medicine.name} available in stock.`;
          return { ...item, quantity: Math.max(1, stock) }; // Fallback to max available
        }
        
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    });

    if (limitReached) {
      toast.error(limitMessage, { id: 'stock-limit-toast' });
    }

    return { ...state, ...calculateTotals({ ...state, cartItems: newItems }) };
  }),

  updateItemDiscount: (cartId, type, value) => set((state) => {
    const newItems = state.cartItems.map(item => 
      item.cart_id === cartId ? { ...item, discount_type: type, discount_value: Math.max(0, value) } : item
    );
    return { ...state, ...calculateTotals({ ...state, cartItems: newItems }) };
  }),

  removeItem: (cartId) => set((state) => {
    const newItems = state.cartItems.filter(item => item.cart_id !== cartId);
    return { ...state, ...calculateTotals({ ...state, cartItems: newItems }) };
  }),

  setCustomer: (customerId) => set({ selectedCustomer: customerId }),
  
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  
  setAmountPaid: (amount) => set((state) => {
    const changeDue = Math.max(0, amount - state.finalTotal);
    return { amountPaid: amount, changeDue };
  }),
  
  setGlobalDiscount: (type, value) => set((state) => {
    const newGlobal = { type, value: Math.max(0, value) };
    return { globalDiscount: newGlobal, ...calculateTotals({ ...state, globalDiscount: newGlobal }) };
  }),

  setAdjustmentAmount: (amount) => set((state) => {
    return { adjustmentAmount: amount, ...calculateTotals({ ...state, adjustmentAmount: amount }) };
  }),
  
  clearCart: () => set({
    cartItems: [],
    selectedCustomer: null,
    paymentMethod: 'Cash',
    amountPaid: 0,
    globalDiscount: { type: 'FIXED', value: 0 },
    subtotal: 0,
    totalDiscount: 0,
    taxAmount: 0,
    finalTotal: 0,
    changeDue: 0
  }),
  
  loadCart: (items, customerId) => set((state) => {
    const newItems = items.map(item => ({
      cart_id: crypto.randomUUID(),
      medicine: {
        id: item.medicine_id,
        name: item.medicine_name,
        sale_price: item.unit_price,
        units_per_strip: 1, 
        units_per_pack: 1,  
      } as any,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_type: 'FIXED' as const,
      discount_value: item.discount,
      subtotal: (item.quantity * item.unit_price) - item.discount
    }));
    return { ...state, selectedCustomer: customerId || null, ...calculateTotals({ ...state, cartItems: newItems }) };
  })
}));
