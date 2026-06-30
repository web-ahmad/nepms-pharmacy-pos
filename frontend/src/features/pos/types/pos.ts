export interface POSMedicine {
  id: string;
  name: string;
  generic_name?: string;
  sale_price: number;
  available_quantity: number;
  total_quantity?: number;
  units_per_pack?: number;
  strips_per_box?: number;
  units_per_strip?: number;
  batches?: {
    id: string;
    batch_number: string;
    expiry_date: string;
    available_quantity: number;
    selling_price: number;
  }[];
  shelf?: string;
}

export interface POSCartItem {
  cart_id: string; // internal UUID for tracking in cart
  medicine: POSMedicine;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  subtotal: number; // After item discount
}

export interface CheckoutPayload {
  customer_id?: string;
  items: {
    medicine_id: string;
    batch_id?: string;
    quantity: number;
    unit_price: number;
    discount: number;
  }[];
  discount_amount: number;
  adjustment_amount: number;
  tax_amount: number;
  amount_paid: number;
  payment_method: 'Cash' | 'Card' | 'Credit' | 'Bank Transfer';
  hold_sale: boolean;
}

export interface POSInvoiceItem {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface POSInvoiceResponse {
  id: string;
  invoice_number: string;
  customer_id?: string;
  cashier_id: string;
  cashier_name?: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  change_due: number;
  status: string;
  items: POSInvoiceItem[];
}

export interface VerifyCompletePayload {
  amount_paid: number;
  payment_method: 'Cash' | 'Card' | 'Credit' | 'Bank Transfer';
}
