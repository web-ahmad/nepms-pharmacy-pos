'use client';

import React, { use, useEffect } from 'react';
import SimpleFormLayout from '@/features/inventory/components/MedicineMasterWizard/SimpleFormLayout';
import MedicineFormSettingsModal from '@/features/inventory/components/MedicineMasterWizard/MedicineFormSettingsModal';
import { useGetMedicine } from '@/features/inventory/services/medicine.api';
import { Loader2 } from 'lucide-react';

export default function EditMedicinePage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  // Unwrap the promise if needed in Next.js 15+ or just use params.id directly
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id;

  const { data: medicine, isLoading, isError } = useGetMedicine(id);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !medicine) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        Failed to load medicine details.
      </div>
    );
  }

  // Map backend response back to form values
  const packagingType = medicine.dosage_form || 'Tablet / Capsule';
  let strips = 10;
  let units = 10;
  let fullPackSalePrice = 0;
  
  if (medicine.packaging_levels && medicine.packaging_levels.length > 0) {
    const boxLevel = medicine.packaging_levels.find((p: any) => p.level_name === 'Box');
    const stripLevel = medicine.packaging_levels.find((p: any) => p.level_name === 'Strip');
    
    if (stripLevel) {
       units = stripLevel.conversion_qty;
    }
    if (boxLevel) {
       strips = stripLevel ? boxLevel.conversion_qty / units : boxLevel.conversion_qty;
       fullPackSalePrice = boxLevel.sale_price;
    }
  }

  const baseUnits = (packagingType === 'Tablet / Capsule') ? (strips * units) : strips;

  const initialData = {
    // Basic Info
    name: medicine.name || '',
    generic_name: medicine.generic_name || '',
    brand_name: medicine.brand_name || '',
    category: medicine.category || 'Medicine',
    therapeutic_class: medicine.therapeutic_class || '',
    manufacturer: medicine.manufacturer || '',
    country_of_origin: medicine.country_of_origin || '',
    description: medicine.description || '',
    formula: medicine.formula || '',
    image_url: medicine.image_url || '',
    barcode: medicine.barcode || '',
    status: medicine.is_active ? 'Active' : 'Inactive',

    // Auto Generated
    sku: medicine.sku || '',
    internal_product_code: medicine.internal_product_code || '',
    qr_code: medicine.qr_code || '',
    search_keywords: medicine.search_keywords || '',
    slug: medicine.slug || '',

    // Pricing
    purchase_price: (medicine.cost_per_base_unit || 0) * baseUnits,
    unit_sale_price: medicine.unit_retail_price || 0,
    purchase_discount_percent: medicine.discount_percentage || 0,
    tax_rate: medicine.tax_rate || 0,
    margin_percent: medicine.margin_percent || 0,
    sale_price: fullPackSalePrice,
    mrp: medicine.mrp || 0,

    // Packaging & Units
    base_unit: medicine.base_unit || 'Tablet',
    packaging_type: packagingType,
    strips_per_box: strips,
    units_per_strip: units,
    volume_in_ml: medicine.volume_weight ? parseFloat(medicine.volume_weight) : 0,

    // Inventory
    min_stock_level: medicine.min_stock_level || 0,
    max_stock_level: medicine.max_stock_level || 0,
    reorder_level: medicine.reorder_level || 0,
    shelf: medicine.shelf || '',
    
    // Tax
    tax_category: medicine.tax_category || '',
    tax_type: medicine.tax_type || '',
    tax_inclusive: medicine.tax_inclusive || false,
    hs_code: medicine.hs_code || '',
    
    // Advanced & Controls
    drap_registration_no: medicine.drap_registration_no || '',
    rx_required: medicine.rx_required || false,
    is_controlled: medicine.is_controlled || false,
    narcotic: medicine.narcotic || false,
    is_antibiotic: medicine.is_antibiotic || false,
    is_otc: medicine.is_otc || false,
    age_restriction: medicine.age_restriction || 0,
    
    // Storage
    storage_conditions: medicine.storage_conditions || '',
    temp_condition: medicine.temp_condition || '',
    protect_from_light: medicine.protect_from_light || false,
    keep_dry: medicine.keep_dry || false,
    hazardous: medicine.hazardous || false,
    cold_chain: medicine.cold_chain || false,
    
    // Batch (Read-Only context in edit, but added to avoid undefined)
    opening_stock: medicine.batches?.[0]?.current_quantity || 0,
    batch_number: medicine.batches?.[0]?.batch_number || '',
    expiry_date: medicine.batches?.[0]?.expiry_date || '',
    manufacturing_date: medicine.batches?.[0]?.manufacturing_date || ''
  };

  return (
    <div className="space-y-6 p-8 bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Edit Medicine</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Update medicine profile and inventory settings.
          </p>
        </div>
        <MedicineFormSettingsModal />
      </div>

      <SimpleFormLayout initialData={initialData as any} medicineId={id} isEdit={true} />
    </div>
  );
}
