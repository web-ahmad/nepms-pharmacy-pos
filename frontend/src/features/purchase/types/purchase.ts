export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit: number;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

export interface SupplierLedger {
  id: string;
  transaction_date: string;
  transaction_type: string;
  reference_id: string;
  debit: number;
  credit: number;
  balance_after: number;
  notes?: string;
}

export interface POItem {
  id: string;
  medicine_id: string;
  medicine_name?: string; // Optional field populated by frontend join or backend
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string; // Frontend helper
  expected_delivery_date?: string;
  total_amount: number;
  status: string; // Draft, Approved, Partially Received, Completed, Cancelled
  items: POItem[];
}

export interface GRN {
  id: string;
  grn_number: string;
  po_id: string;
  supplier_id: string;
  received_date?: string;
  total_amount: number;
  status: string;
}

export interface InvoiceItem {
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number?: string;
  grn_id: string;
  supplier_id: string;
  invoice_date?: string;
  due_date?: string;
  total_amount: number;
  tax_amount: number;
  amount_paid: number;
  status: string; // Draft, Unpaid, Partially Paid, Paid, Cancelled
  items?: InvoiceItem[];
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  payment_date: string;
}

// Payloads
export interface CreateSupplierPayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit: number;
  opening_balance: number;
  is_active: boolean;
}

export interface CreatePOPayload {
  supplier_id: string;
  expected_delivery_date?: string;
  total_amount: number;
  items: {
    medicine_id: string;
    quantity_ordered: number;
    unit_price: number;
  }[];
}

export interface GRNItemPayload {
  po_item_id: string;
  medicine_id: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  quantity_received: number;
}

export interface CreateGRNPayload {
  po_id: string;
  supplier_id: string;
  received_date?: string;
  total_amount: number;
  items: GRNItemPayload[];
}

export interface CreateInvoicePayload {
  grn_id: string;
  supplier_id: string;
  invoice_date?: string;
  due_date?: string;
  total_amount: number;
  tax_amount: number;
  amount_paid: number;
}

export interface CreatePaymentPayload {
  supplier_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}
