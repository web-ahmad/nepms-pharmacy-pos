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

  const pkgLevels = medicine.packaging_levels || [];
  const boxLevel = pkgLevels.find((p: any) => p.level_name?.toLowerCase() === 'box' || ['box', 'pack', 'carton'].includes(p.level_name?.toLowerCase() || ''));
  const stripLevel = pkgLevels.find((p: any) => p.level_name?.toLowerCase() === 'strip');
  const smallestLevel = pkgLevels.find((p: any) => p.is_smallest_unit) || pkgLevels.find((p: any) => ['tablet', 'capsule', 'bottle', 'ampule', 'drop', 'tube', 'inhaler', 'sachet'].includes(p.level_name?.toLowerCase() || ''));
  
  const unitsPerStrip = medicine.units_per_strip || stripLevel?.conversion_qty || 1;
  const stripsPerBox = medicine.strips_per_box || (boxLevel ? Math.floor(boxLevel.conversion_qty / unitsPerStrip) : 1);
  const packagingType = medicine.dosage_form || 'Tablet / Capsule';

  const totalBaseUnits = boxLevel?.conversion_qty || 1;
  const purchasePrice = (medicine.cost_per_base_unit || 0) * totalBaseUnits;
  const fullPackSalePrice = boxLevel?.sale_price || medicine.sale_price || 0;
  const unitSalePrice = smallestLevel?.sale_price || medicine.sale_price || 0;

  // Map backend response back to form values
  const initialData = {
    name: medicine.name || '',
    brand_name: medicine.brand_name || '',
    generic_name: medicine.generic_name || '',
    formula: medicine.formula || '',
    category: medicine.category || 'Medicine',
    manufacturer: medicine.manufacturer || '',
    barcode: medicine.barcode || '',
    shelf: medicine.shelf || '',
    margin_percent: medicine.margin_percent || 0,
    mrp: medicine.mrp || 0,
    tax_rate: medicine.tax_rate || 0,
    min_stock_level: medicine.min_stock_level || 0,
    max_stock_level: medicine.max_stock_level || 0,
    status: medicine.is_active ? 'Active' : 'Inactive',
    is_controlled: medicine.is_controlled || false,
    // Advanced fields extracted from packaging_levels
    base_unit: medicine.base_unit || 'Tablet',
    packaging_type: packagingType,
    strips_per_box: stripsPerBox,
    units_per_strip: unitsPerStrip,
    volume_in_ml: medicine.volume_weight ? parseFloat(medicine.volume_weight) : 0,
    purchase_price: purchasePrice,
    unit_sale_price: unitSalePrice,
    sale_price: fullPackSalePrice,
    purchase_discount_percent: medicine.discount_percentage || 0,
    strength: medicine.strength || '',
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
