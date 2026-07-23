import { z } from 'zod';

export const initialBatchSchema = z.object({
  batch_number: z.string().nullable().optional(),
  manufacturing_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  supplier_id: z.string().nullable().optional(),
  purchase_invoice_id: z.string().nullable().optional(),
  mrp: z.coerce.number().optional(),
  current_stock: z.coerce.number().min(0, 'Stock cannot be negative').default(0),
}).refine(data => data.current_stock === 0 || (data.batch_number && data.batch_number.trim().length > 0), {
  message: "Batch number is required when opening stock is > 0",
  path: ["batch_number"]
}).refine(data => data.current_stock === 0 || (data.expiry_date && data.expiry_date.trim().length > 0), {
  message: "Expiry date is required when opening stock is > 0",
  path: ["expiry_date"]
});

export const packagingLevelSchema = z.object({
  level_name: z.string().min(1, 'Level name is required'),
  conversion_qty: z.coerce.number().min(0.001, 'Must be greater than 0').default(1),
  barcode: z.string().nullable().optional(),
  secondary_barcode: z.string().nullable().optional(),
  is_purchase_unit: z.boolean().default(false),
  is_sale_unit: z.boolean().default(true),
  is_smallest_unit: z.boolean().default(false),
  is_default_pos_unit: z.boolean().default(false),
  sale_price: z.coerce.number().min(0, 'Sale price cannot be negative').default(0),
});

const selectField = z.union([z.string(), z.any()]);

export const medicineSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Medicine name is required'),
  brand_name: z.string().nullable().optional(),
  generic_name: selectField.nullable().optional(),
  strength: z.string().nullable().optional(),
  strength_unit: z.string().nullable().optional(),
  dosage_form: z.string().nullable().optional(),
  category: selectField,
  therapeutic_class: z.string().nullable().optional(),
  sub_category: z.string().nullable().optional(),
  manufacturer: selectField,
  country_of_origin: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  formula: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),

  // Auto Generated
  sku: z.string().nullable().optional(),
  internal_product_code: z.string().nullable().optional(),
  qr_code: z.string().nullable().optional(),
  search_keywords: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),

  // Pricing
  purchase_price: z.coerce.number().min(0, 'Cannot be negative').default(0),
  unit_sale_price: z.coerce.number().min(0, 'Cannot be negative').default(0),
  purchase_discount_percent: z.coerce.number().min(0).default(0),
  extra_charges: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).default(0),
  margin_percent: z.coerce.number().min(0).default(0),
  wholesale_margin_percent: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0, 'Cannot be negative').default(0),
  mrp: z.coerce.number().min(0, 'Cannot be negative').default(0),

  // Packaging & Units
  base_unit: z.string().min(1, 'Base unit is required').default('Tablet'),
  packaging_type: z.string().min(1, 'Packaging type is required').default('Tablet / Capsule'),
  strips_per_box: z.coerce.number().min(1, 'Must be at least 1').default(10),
  units_per_strip: z.coerce.number().min(1, 'Must be at least 1').default(10),
  volume_in_ml: z.coerce.number().min(0, 'Cannot be negative').nullable().optional(),
  packaging_levels: z.array(packagingLevelSchema).default([]),

  // Supplier
  preferred_supplier: z.string().nullable().optional(),
  supplier_id: z.string().nullable().optional(),
  supplier_product_code: z.string().nullable().optional(),
  supplier_barcode: z.string().nullable().optional(),
  supplier_purchase_price: z.coerce.number().nullable().optional(),
  lead_time: z.coerce.number().nullable().optional(),
  minimum_order_quantity: z.coerce.number().nullable().optional(),

  // Inventory
  min_stock_level: z.coerce.number().min(0).default(0),
  max_stock_level: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().min(0).default(0),
  shelf: z.string().nullable().optional(),
  rack: z.string().nullable().optional(),
  warehouse: z.string().nullable().optional(),
  expiry_alert_days: z.coerce.number().nullable().optional(),

  // Batches
  initial_batch: initialBatchSchema.optional(),
  opening_stock: z.coerce.number().min(0).default(0),
  batch_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  manufacturing_date: z.string().nullable().optional(),

  // Tax
  tax_type: z.string().nullable().optional(),
  tax_inclusive: z.boolean().default(false),
  hs_code: z.string().nullable().optional(),

  // Prescription
  rx_required: z.boolean().default(false),
  is_otc: z.boolean().default(false),
  is_antibiotic: z.boolean().default(false),
  is_controlled: z.boolean().default(false),
  narcotic: z.boolean().default(false),
  cold_chain: z.boolean().default(false),
  age_restriction: z.coerce.number().nullable().optional(),

  // Storage
  temp_condition: z.string().nullable().optional(),
  protect_from_light: z.boolean().default(false),
  keep_dry: z.boolean().default(false),
  hazardous: z.boolean().default(false),
})
.refine(data => data.mrp === 0 || data.sale_price <= data.mrp, {
  message: "Sale Price cannot exceed MRP",
  path: ["sale_price"]
})
.refine(data => data.sale_price === 0 || data.purchase_price <= data.sale_price, {
  message: "Purchase Price cannot exceed Sale Price",
  path: ["purchase_price"]
})
.refine(data => !data.opening_stock || data.opening_stock === 0 || (!!data.batch_number && data.batch_number.trim().length > 0), {
  message: "Batch number is required when opening stock is greater than 0",
  path: ["batch_number"]
})
.refine(data => !data.opening_stock || data.opening_stock === 0 || (!!data.expiry_date && data.expiry_date.trim().length > 0), {
  message: "Expiry date is required when opening stock is greater than 0",
  path: ["expiry_date"]
});

export type MedicineFormValues = z.infer<typeof medicineSchema>;

export const defaultMedicineValues: Partial<MedicineFormValues> = {
  status: 'Active',
  base_unit: 'Tablet',
  rx_required: false,
  is_controlled: false,
  is_otc: false,
  is_antibiotic: false,
  narcotic: false,
  cold_chain: false,
  protect_from_light: false,
  keep_dry: false,
  hazardous: false,
  tax_inclusive: false,
  purchase_price: 0,
  purchase_discount_percent: 0,
  extra_charges: 0,
  tax_rate: 0,
  margin_percent: 0,
  wholesale_margin_percent: 0,
  sale_price: 0,
  unit_sale_price: 0,
  mrp: 0,
  min_stock_level: 0,
  max_stock_level: 0,
  reorder_level: 0,
  packaging_type: 'Tablet / Capsule',
  strips_per_box: 10,
  units_per_strip: 10,
  packaging_levels: [
    {
      level_name: 'Tablet',
      conversion_qty: 1,
      is_smallest_unit: true,
      is_sale_unit: true,
      is_purchase_unit: false,
      is_default_pos_unit: true,
      sale_price: 0
    }
  ]
};
