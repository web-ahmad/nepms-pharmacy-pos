import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { MedicineFormValues } from '@/features/inventory/components/MedicineMasterWizard/schema';

export interface MedicineMaster {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

/**
 * Maps frontend form values to the backend API payload shape.
 * Key differences:
 *  - purchase_price → cost_per_base_unit
 *  - purchase_discount_percent → discount_percentage
 *  - status "Active"/"Inactive" → is_active boolean
 */
function mapFormToBackend(form: MedicineFormValues) {
  const {
    purchase_price, // full pack purchase price
    purchase_discount_percent,
    extra_charges,
    wholesale_margin_percent,
    margin_percent,
    status,
    rack,
    warehouse,
    preferred_supplier,
    supplier_product_code,
    supplier_barcode,
    supplier_purchase_price,
    lead_time,
    minimum_order_quantity,
    sub_category,
    strength_unit,
    sale_price, // full pack sale price
    unit_sale_price,
    packaging_type,
    strips_per_box,
    units_per_strip,
    volume_in_ml,
    opening_stock,
    batch_number,
    expiry_date,
    manufacturing_date,
    reorder_level, // Exclude reorder_level to prevent it from overwriting min_stock_level on backend
    ...rest
  } = form;

  const isBox = packaging_type === 'Box';
  const total_base_units = isBox ? ((strips_per_box || 1) * (units_per_strip || 1)) : (volume_in_ml || 1);
  const cost_per_base_unit = purchase_price ? purchase_price / total_base_units : 0;

  // We create two packaging levels if it's a multi-level pack (e.g. Box of Tablets)
  // Or just one if they are selling purely by the base unit.
  // The redesign implies we sell the Full Pack (Box), and we can also track Base Units (Tablet).
  const packaging_levels: any[] = [
    {
      level_name: rest.base_unit || 'Tablet',
      conversion_qty: 1,
      is_smallest_unit: true,
      is_sale_unit: true,
      is_purchase_unit: false,
      is_default_pos_unit: true,
      sale_price: unit_sale_price || 0
    }
  ];

  if (isBox && units_per_strip && units_per_strip > 1) {
    packaging_levels.push({
      level_name: 'Strip',
      conversion_qty: units_per_strip,
      is_smallest_unit: false,
      is_sale_unit: true,
      is_purchase_unit: false,
      is_default_pos_unit: false,
      sale_price: (unit_sale_price || 0) * units_per_strip // Pro-rata for now
    });
  }

  if (isBox || packaging_type !== 'Box') {
    packaging_levels.push({
      level_name: packaging_type || 'Box',
      conversion_qty: total_base_units,
      is_smallest_unit: false,
      is_sale_unit: true,
      is_purchase_unit: true,
      is_default_pos_unit: false,
      sale_price: sale_price || 0
    });
  }

  let initial_batch = undefined;
  if (opening_stock > 0 && batch_number && expiry_date) {
    initial_batch = {
      batch_number: batch_number,
      manufacturing_date: manufacturing_date || undefined,
      expiry_date: expiry_date,
      current_stock: opening_stock
    };
  }

  return {
    ...rest,
    initial_batch,
    margin_percent: margin_percent || 0,
    packaging_levels,
    cost_per_base_unit,
    discount_percentage: purchase_discount_percent ?? 0,
    trade_price: supplier_purchase_price ?? purchase_price ?? 0,
    unit_retail_price: unit_sale_price || 0,
    is_active: status === 'Active',
    shelf: rest.shelf ?? rack,
    strips_per_box,
    units_per_strip,
    volume_weight: volume_in_ml ? String(volume_in_ml) : undefined
  };
}

/**
 * Maps backend API response shape back to frontend form values for editing.
 */
export function mapBackendToForm(data: any): Partial<MedicineFormValues> {
  if (!data) return {};

  // Derive packaging_type from dosage_form stored in DB
  const dosageForm = data.dosage_form || '';

  // Find packaging level roles
  const boxPkg = data.packaging_levels?.find((p: any) => p.is_purchase_unit) || data.packaging_levels?.[0];
  const salePkg = data.packaging_levels?.find((p: any) => p.is_smallest_unit) || data.packaging_levels?.[0];
  const stripPkg = data.packaging_levels?.find((p: any) => p.level_name === 'Strip');

  // Derive strips_per_box and units_per_strip
  // Priority 1: Use the DB column directly (most reliable)
  // Priority 2: Derive from packaging_levels conversion_qty
  let strips_per_box = data.strips_per_box || 0;
  let units_per_strip = data.units_per_strip || 0;

  if (!strips_per_box && boxPkg) {
    if (stripPkg) {
      // Tablet/Capsule: Box contains strips, Strip contains tablets
      units_per_strip = stripPkg.conversion_qty || 1;
      strips_per_box = Math.round((boxPkg.conversion_qty || 1) / units_per_strip);
    } else {
      // Syrup, Injection, Cream etc: Box conversion_qty = items per box
      strips_per_box = Math.round(boxPkg.conversion_qty || 1);
      units_per_strip = 1;
    }
  }

  // Final fallback
  if (!strips_per_box) strips_per_box = 1;
  if (!units_per_strip) units_per_strip = 1;

  return {
    ...data,
    status: data.is_active ? 'Active' : 'Inactive',
    // Keep as plain strings - CreatableMasterDataSelect stores values as strings
    // Backend category lookup: WHERE Category.name == category_name
    // Backend manufacturer: stored directly as string column
    category: data.category || '',
    manufacturer: data.manufacturer || '',
    generic_name: data.generic_name || '',
    
    purchase_price: data.cost_per_base_unit && boxPkg ? data.cost_per_base_unit * (boxPkg.conversion_qty || 1) : (data.cost_per_base_unit || 0),
    purchase_discount_percent: data.discount_percentage || 0,
    sale_price: boxPkg?.sale_price || data.sale_price || 0,
    unit_sale_price: salePkg?.sale_price || data.unit_retail_price || 0,
    
    // Packaging type from dosage_form column
    packaging_type: dosageForm || 'Tablet / Capsule',
    strips_per_box: Math.round(strips_per_box),
    units_per_strip: Math.round(units_per_strip),
    volume_in_ml: data.volume_weight && !isNaN(Number(data.volume_weight)) ? Number(data.volume_weight) : undefined,
    base_unit: salePkg?.level_name || data.base_unit || 'Tablet',
    rack: data.shelf || data.rack || '',
    margin_percent: data.margin_percent || 0,
    wholesale_margin_percent: data.wholesale_margin_percent || 0,
    
    // Stock & Batch details from nested batches array
    opening_stock: data.batches?.[0]?.current_quantity ?? data.opening_stock ?? 0,
    batch_number: data.batches?.[0]?.batch_number || data.batch_number || '',
    expiry_date: data.batches?.[0]?.expiry_date ? String(data.batches[0].expiry_date).split('T')[0] : (data.expiry_date || ''),
    manufacturing_date: data.batches?.[0]?.manufacturing_date ? String(data.batches[0].manufacturing_date).split('T')[0] : (data.manufacturing_date || ''),
    min_stock_level: Number(data.min_stock_level) || 0,
    max_stock_level: Number(data.max_stock_level) || 0,
    reorder_level: Number(data.reorder_level) || 0,
    mrp: data.mrp || 0,
    supplier_purchase_price: data.trade_price || 0,
  };
}

export const useMedicines = (search?: string) => {
  return useQuery({
    queryKey: ['medicines', search],
    queryFn: async () => {
      const endpoint = search ? `/api/v1/inventory/medicines?search_term=${search}` : '/api/v1/inventory/medicines';
      const res = await api.get(endpoint);
      return res.data as MedicineMaster[];
    }
  });
};

export const useCreateMedicine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      // payload is already built by SimpleFormLayout
      const res = await api.post('/api/v1/inventory/medicines', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
};

export const useGetMedicine = (id: string) => {
  return useQuery({
    queryKey: ['medicines', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/api/v1/inventory/medicines/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useUpdateMedicine = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      // payload is already built by SimpleFormLayout
      const res = await api.put(`/api/v1/inventory/medicines/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['medicines', id] });
    }
  });
};

export const useDeleteMedicine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/inventory/medicines/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
};
