export interface SaleItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  quantity_returned_so_far: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  cashier_id: string;
  cashier_name?: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  adjustment_amount?: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  change_due: number;
  status: string; // 'Completed', 'Held', 'Voided', 'Partially Returned', 'Fully Returned'
  items: SaleItem[];
}

export interface SaleReturnItemCreate {
  sale_item_id: string;
  quantity_returned: number;
  return_reason?: string;
  stock_action: 'Returned to Stock' | 'Marked as Damaged';
}

export interface SaleReturnCreateRequest {
  items: SaleReturnItemCreate[];
  payment_mode: 'Cash' | 'Store Credit';
  notes?: string;
}

export interface ReturnLogItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  quantity_returned: number;
  unit_price: number;
  total_refund: number;
  return_reason?: string;
  stock_action: string;
}

export interface ReturnLog {
  id: string;
  return_number: string;
  invoice_number: string;
  cashier_name: string;
  return_date: string;
  total_amount: number;
  payment_mode: string;
  items_summary: string;
  notes?: string;
  items?: ReturnLogItem[];
}

export interface SalesHistoryFilters {
  start_date?: string;
  end_date?: string;
  invoice_id?: string;
  customer_id?: string;
  cashier_id?: string;
  page: number;
  limit: number;
}
