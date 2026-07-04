export interface PackagingLevel {
  id?: string;
  level_name: string;
  conversion_qty: number;
  barcode?: string;
  is_purchase_unit: boolean;
  is_sale_unit: boolean;
  is_default_pos_unit: boolean;
  sale_price: number;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  category: string;
  category_id?: string;
  manufacturer: string;
  barcode?: string;
  
  base_unit: string;
  drap_registration_no?: string;
  rx_required: boolean;
  cost_per_base_unit: number;
  margin_percent: number;
  
  packaging_levels: PackagingLevel[];
  
  reorder_level: number;
  is_active: boolean;
  total_quantity: number;
  stock_value: number;
  formula?: string;
  strength?: string;
  dosage_form?: string;
  is_controlled: boolean;
  mrp: number;
  tax_rate: number;
  min_stock_level: number;
  max_stock_level?: number;
  shelf?: string;
  therapeutic_class?: string | null;
  sku?: string | null;
  trade_price?: number;
  unit_retail_price?: number;
  discount_percentage?: number;
  tax_category?: string | null;
  drug_schedule?: string | null;
  storage_conditions?: string | null;
  image_url?: string | null;
  status?: string;
  substitute_ids?: string[];
  initial_batch?: {
    batch_number: string;
    manufacturing_date?: string;
    expiry_date: string;
    supplier_id?: string;
    current_stock: number;
  };
}

export interface Batch {
  id: string;
  batch_number: string;
  medicine_id: string;
  supplier_id?: string;
  purchase_price: number;
  selling_price: number;
  current_quantity: number;
  expiry_date: string;
  mfg_date?: string;
  status: string;
}

export interface StockMovement {
  id: string;
  medicine_id: string;
  batch_id?: string;
  movement_type: string;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface StockAdjustmentPayload {
  medicine_id: string;
  batch_id: string;
  adjustment_type: 'INCREASE' | 'DECREASE';
  quantity: number;
  reason: string;
}
