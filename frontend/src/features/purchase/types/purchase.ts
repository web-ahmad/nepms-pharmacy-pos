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
  created_at?: string;
  updated_at?: string;
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

// Enterprise Types

export interface PurchaseRequestItem {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  requested_quantity: number;
  priority: string;
}

export interface PurchaseRequest {
  id: string;
  request_number: string;
  branch_id: string;
  requested_by_id: string;
  status: string; // Pending, Approved, Rejected, Partially Ordered, Completed
  notes?: string;
  items: PurchaseRequestItem[];
}

export interface PurchaseQuotationItem {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  quoted_quantity: number;
  quoted_unit_price: number;
  is_selected: boolean;
}

export interface PurchaseQuotation {
  id: string;
  quotation_number: string;
  request_id?: string;
  supplier_id: string;
  supplier_name?: string;
  valid_until?: string;
  status: string; // Draft, Submitted, Accepted, Rejected
  items: PurchaseQuotationItem[];
}

export interface PurchaseApproval {
  id: string;
  po_id: string;
  approver_id: string;
  level: number;
  status: string; // Pending, Approved, Rejected
  comments?: string;
}

export interface PurchaseReceivingItem {
  id: string;
  po_item_id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date?: string;
  manufacturing_date?: string;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason?: string;
}

export interface PurchaseReceiving {
  id: string;
  receiving_number: string;
  po_id: string;
  warehouse_id?: string;
  received_by_id: string;
  status: string; // Draft, Completed
  items: PurchaseReceivingItem[];
}

export interface CreatePurchaseRequestPayload {
  priority: string;
  notes?: string;
  items: { medicine_id: string; requested_quantity: number; }[];
}

export interface CreatePurchaseQuotationPayload {
  supplier_id: string;
  request_id?: string;
  valid_until?: string;
  items: { medicine_id: string; quoted_quantity: number; quoted_unit_price: number; }[];
}

export interface CreatePurchaseApprovalPayload {
  po_id: string;
  status: string;
  comments?: string;
}

export interface CreatePurchaseReceivingPayload {
  po_id: string;
  warehouse_id?: string;
  items: { 
    po_item_id: string; 
    medicine_id: string; 
    batch_number: string; 
    expiry_date?: string; 
    manufacturing_date?: string; 
    received_quantity: number; 
    accepted_quantity: number; 
    rejected_quantity: number; 
    rejection_reason?: string; 
  }[];
}

