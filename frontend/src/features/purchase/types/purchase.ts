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
  medicine_name?: string;  // Resolved from medicines table by backend
  quantity_requested: number;
  quantity_approved?: number;
  remarks?: string;
}

export interface PurchaseRequest {
  id: string;
  request_number: string;
  branch_id?: string;
  requested_by?: string;
  requested_by_name?: string;  // Resolved from users table by backend
  request_date?: string;
  required_date?: string;
  status: string; // Draft, Submitted, Approved, PO Created, Rejected
  priority: string;
  remarks?: string;
  items: PurchaseRequestItem[];
}

export interface SupplierScorecard {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  on_time_delivery_pct: number;
  quality_score: number;
  return_rate: number;
  avg_lead_time_days: number;
  last_purchase_price?: number;
  overall_score: number;
}

export interface QuotationComparisonItem {
  medicine_id: string;
  medicine_name: string;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  lead_time_days: number;
  line_total: number;
  is_lowest_price: boolean;
  is_fastest: boolean;
}

export interface QuotationComparisonEntry {
  quotation_id: string;
  quotation_number: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  valid_until?: string;
  currency: string;
  payment_terms?: string;
  delivery_terms?: string;
  status: string;
  items: QuotationComparisonItem[];
  scorecard?: SupplierScorecard;
  is_lowest_cost: boolean;
  is_fastest_delivery: boolean;
  is_best_overall: boolean;
  is_highest_rated: boolean;
}

export interface QuotationComparisonResponse {
  request_id: string;
  request_number?: string;
  medicine_ids: string[];
  quotations: QuotationComparisonEntry[];
}

export interface PurchaseQuotationItem {
  id?: string;
  medicine_id: string;
  medicine_name?: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  lead_time_days: number;
  line_total?: number;
  moq?: number;
  brand?: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  line_notes?: string;
}

export interface PurchaseQuotation {
  id: string;
  quotation_number: string;
  request_id?: string;
  request_number?: string;
  supplier_id: string;
  supplier_name?: string;
  branch_id?: string;
  warehouse_id?: string;
  quotation_date?: string;
  valid_until?: string;
  currency: string;
  status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  warranty?: string;
  remarks?: string;
  attachment_url?: string;
  supplier_score?: number;
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
  status: string; // 'Draft' or 'Submitted'
  remarks?: string;
  required_date?: string;
  items: {
    medicine_id: string;
    quantity_requested: number;
    quantity_approved?: number;
    remarks?: string;
  }[];
}

export interface CreatePurchaseQuotationPayload {
  supplier_id: string;
  request_id?: string;
  branch_id?: string;
  warehouse_id?: string;
  quotation_date?: string;
  valid_until?: string;
  currency?: string;
  status?: string;
  total_amount?: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  payment_terms?: string;
  delivery_terms?: string;
  warranty?: string;
  remarks?: string;
  attachment_url?: string;
  items: PurchaseQuotationItem[];
}

export interface QuotationStatusUpdate {
  status: string;
  remarks?: string;
}

export interface UpdatePurchaseQuotationPayload extends Partial<CreatePurchaseQuotationPayload> {}

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


export interface PurchaseApprovalMatrix {
  id: string;
  level: number;
  role_name: string;
  amount_threshold: number;
}

export interface PurchaseTimeline {
  id: string;
  reference_id: string;
  reference_type: string;
  action: string;
  user_id?: string;
  remarks?: string;
  timestamp: string;
}

export interface CreatePurchaseApprovalMatrixPayload {
  level: number;
  role_name: string;
  amount_threshold: number;
}

export interface PurchaseApprovalRequestPayload {
  status: string;
  remarks?: string;
}
