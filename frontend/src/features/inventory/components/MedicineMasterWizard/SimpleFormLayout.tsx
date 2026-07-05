'use client';

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Save, X, Loader2, Info, ChevronDown, ChevronRight, Package, Calculator, MapPin, Tag, Box, LayoutGrid, Clock, ShieldAlert, Barcode, Settings2 } from 'lucide-react';
import { useCreateMedicine, useUpdateMedicine } from '@/features/inventory/services/medicine.api';
import { useMasterData } from '@/features/inventory/services/masterData.api';
import { parseApiError } from '@/utils/errorParser';

import { medicineSchema, MedicineFormValues, defaultMedicineValues } from './schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { CreatableMasterDataSelect } from '../CreatableMasterDataSelect';
import { useMedicineFormSettings } from '../../store/useMedicineFormSettings';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface SimpleFormLayoutProps {
  initialData?: MedicineFormValues;
  medicineId?: string;
  isEdit?: boolean;
}

export default function SimpleFormLayout({ initialData, medicineId, isEdit }: SimpleFormLayoutProps) {
  const router = useRouter();
  const createMedicineMutation = useCreateMedicine();
  const updateMedicineMutation = useUpdateMedicine(medicineId || '');
  const settings = useMedicineFormSettings();

  const [showSettings, setShowSettings] = useState(false);
  const methods = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema) as any,
    defaultValues: defaultMedicineValues as any,
    mode: 'onChange'
  });

  const { register, handleSubmit, control, setValue, reset, formState: { errors, dirtyFields } } = methods;

  useEffect(() => {
    if (initialData && isEdit) {
      reset(initialData);
    }
  }, [initialData, isEdit, reset]);

  const onSubmit = async (data: MedicineFormValues) => {
    try {
      // 1. Calculate base units to find unit cost
      let calcTotalBaseUnits = 1;
      let isTablet = false;
      if (data.packaging_type === 'Tablet / Capsule') {
        isTablet = true;
        calcTotalBaseUnits = (data.strips_per_box || 1) * (data.units_per_strip || 1);
      } else {
        calcTotalBaseUnits = (data.strips_per_box || 1);
      }

      const costPerBaseUnit = data.purchase_price > 0 ? (data.purchase_price / calcTotalBaseUnits) : 0;

      // 2. Build packaging levels
      const packagingLevels = [];
      if (isTablet) {
        packagingLevels.push({
          level_name: 'Tablet',
          conversion_qty: 1,
          is_smallest_unit: true,
          is_sale_unit: true,
          is_purchase_unit: false,
          is_default_pos_unit: true,
          sale_price: data.unit_sale_price || 0
        });
        packagingLevels.push({
          level_name: 'Strip',
          conversion_qty: data.units_per_strip || 10,
          is_smallest_unit: false,
          is_sale_unit: true,
          is_purchase_unit: false,
          is_default_pos_unit: false,
          sale_price: 0
        });
        packagingLevels.push({
          level_name: 'Box',
          conversion_qty: calcTotalBaseUnits,
          is_smallest_unit: false,
          is_sale_unit: true,
          is_purchase_unit: true,
          is_default_pos_unit: false,
          sale_price: data.sale_price || 0
        });
      } else {
        const smallestUnitName = data.packaging_type === 'Syrup / Suspension' ? 'Bottle' :
          data.packaging_type === 'Injection (Ampule / Vial)' ? 'Ampule' :
            data.packaging_type === 'Drops (Eye / Ear / Nasal)' ? 'Drop' :
              data.packaging_type === 'Cream / Ointment / Gel' ? 'Tube' :
                data.packaging_type === 'Inhaler / Spray' ? 'Inhaler' :
                  data.packaging_type === 'Sachet / Powder' ? 'Sachet' : 'Unit';

        packagingLevels.push({
          level_name: smallestUnitName,
          conversion_qty: 1,
          is_smallest_unit: true,
          is_sale_unit: true,
          is_purchase_unit: false,
          is_default_pos_unit: true,
          sale_price: data.unit_sale_price || 0
        });
        packagingLevels.push({
          level_name: 'Box',
          conversion_qty: calcTotalBaseUnits,
          is_smallest_unit: false,
          is_sale_unit: true,
          is_purchase_unit: true,
          is_default_pos_unit: false,
          sale_price: data.sale_price || 0
        });
      }

      if (!data.barcode || data.barcode.trim() === '') {
        // Generate a random 13-digit EAN-like barcode if empty
        data.barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      }

      const payload = {
        ...data,
        dosage_form: data.packaging_type,
        unit_retail_price: data.unit_sale_price,
        cost_per_base_unit: costPerBaseUnit,
        packaging_levels: packagingLevels,
        initial_batch: data.opening_stock > 0 ? {
          batch_number: data.batch_number,
          manufacturing_date: data.manufacturing_date,
          expiry_date: data.expiry_date,
          current_stock: data.opening_stock,
          mrp: data.mrp
        } : undefined
      };

      // Prevent backend from overwriting min_stock_level with reorder_level default 0
      delete (payload as any).reorder_level;

      // Sanitize payload: convert null/undefined to empty string ONLY for plain string fields
      // Do NOT touch numeric fields - the backend validators handle those
      const STRING_FIELDS = [
        'name', 'brand_name', 'manufacturer', 'category', 'generic_name',
        'formula', 'description', 'strength', 'dosage_form', 'packaging_type',
        'base_unit', 'shelf', 'rack', 'country_of_origin', 'therapeutic_class',
        'tax_type', 'temp_condition', 'drug_schedule', 'storage_conditions',
        'search_keywords', 'status',
      ];
      STRING_FIELDS.forEach(key => {
        if ((payload as any)[key] === null || (payload as any)[key] === undefined) {
          (payload as any)[key] = '';
        }
      });

      // Unwrap any select object that may have slipped through (safety net)
      (['category', 'manufacturer', 'generic_name', 'brand_name'] as const).forEach(key => {
        const val = (payload as any)[key];
        if (val && typeof val === 'object') {
          // Use label (display name) — backend looks up category BY NAME
          (payload as any)[key] = val.label || val.value || '';
        }
      });

      console.log('PAYLOAD:', payload);

      if (isEdit) {
        await updateMedicineMutation.mutateAsync(payload as any);
        toast.success("Medicine Updated Successfully!", {
          duration: 4000,
          style: { background: '#10b981', color: '#fff', fontWeight: 500 }
        });
      } else {
        await createMedicineMutation.mutateAsync(payload as any);
        toast.success("Medicine Saved Successfully!", {
          duration: 4000,
          style: { background: '#10b981', color: '#fff', fontWeight: 500 }
        });
      }
      router.push('/inventory/medicines');
    } catch (error: any) {
      toast.error(parseApiError(error));
      console.log('Submit Error:', error);
    }
  };

  const onError = (errors: any) => {
    toast.error('Please fill in all required fields correctly.');
    Object.keys(errors).forEach((key) => {
      const fieldError = errors[key];
      if (Array.isArray(fieldError)) {
        // Nested array errors (e.g. packaging_levels[0].level_name)
        fieldError.forEach((item: any, idx: number) => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach((subKey) => {
              if (item[subKey]?.message) {
                toast.error(`${key}[${idx}].${subKey}: ${String(item[subKey].message)}`);
              }
            });
          }
        });
      } else if (fieldError?.message) {
        toast.error(`${key}: ${String(fieldError.message)}`);
      }
    });
    console.log('Form Validation Errors:', errors);
  };

  // Watch fields for calculations
  const name = useWatch({ control, name: 'name' });
  const packagingType = useWatch({ control, name: 'packaging_type', defaultValue: 'Tablet / Capsule' });
  const stripsPerBox = useWatch({ control, name: 'strips_per_box', defaultValue: 10 }) as number;
  const unitsPerStrip = useWatch({ control, name: 'units_per_strip', defaultValue: 10 }) as number;
  const purchasePrice = useWatch({ control, name: 'purchase_price', defaultValue: 0 }) as number; // Full Pack
  const unitSalePrice = useWatch({ control, name: 'unit_sale_price', defaultValue: 0 }) as number; // Unit Sale
  const marginPercent = useWatch({ control, name: 'margin_percent', defaultValue: 0 }) as number;

  // Calculate dynamic packaging fields
  let totalBaseUnits = 1;
  let baseUnitSuffix = 'Units';
  let field1Label = 'Items per Pack';
  let field2Label = 'Units per Item';
  let showField2 = false;
  let strengthPlaceholder = 'e.g., 500mg, 10ml, 5g';
  let strengthSuffix = '';

  switch (packagingType) {
    case 'Tablet / Capsule':
      field1Label = 'Strips per Box/Pack';
      field2Label = 'Units per Strip';
      showField2 = true;
      totalBaseUnits = (stripsPerBox || 1) * (unitsPerStrip || 1);
      baseUnitSuffix = 'Tablets/Capsules';
      strengthPlaceholder = 'e.g., 500mg, 250mcg, 1g';
      strengthSuffix = 'mg/mcg/g';
      break;
    case 'Syrup / Suspension':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Bottles';
      strengthPlaceholder = 'e.g., 120ml, 125mg/5ml';
      strengthSuffix = 'ml / mg';
      break;
    case 'Injection (Ampule / Vial)':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Ampules/Vials';
      strengthPlaceholder = 'e.g., 1g, 500mg, 10IU';
      strengthSuffix = 'mg / IU / cc';
      break;
    case 'Drops (Eye / Ear / Nasal)':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Drops';
      strengthPlaceholder = 'e.g., 5ml, 10ml, 0.5% w/v';
      strengthSuffix = 'ml / %';
      break;
    case 'Cream / Ointment / Gel':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Tubes';
      strengthPlaceholder = 'e.g., 15g, 50g, 2% w/w';
      strengthSuffix = 'g / %';
      break;
    case 'Inhaler / Spray':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Inhalers/Sprays';
      strengthPlaceholder = 'e.g., 200 Puffs, 50mcg/dose';
      strengthSuffix = 'Puffs / mcg';
      break;
    case 'Sachet / Powder':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Sachets';
      strengthPlaceholder = 'e.g., 5g, 10g';
      strengthSuffix = 'g / mg';
      break;
    case 'Surgical / Disposable (Syringe, Cannula, IV Set)':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Pieces';
      strengthPlaceholder = 'e.g., 3cc, 5cc, 24G, 16Fr';
      strengthSuffix = 'cc / G / Fr';
      break;
    case 'Bandage / Dressing / Plaster':
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Pieces';
      strengthPlaceholder = 'e.g., 10cm x 5m, 4x4 inch';
      strengthSuffix = 'cm / m / inch';
      break;
    case 'Medical Device / Equipment (BP Monitor, Thermometer)':
      field1Label = 'Pieces per Carton/Box';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Pieces';
      strengthPlaceholder = 'e.g., Model Series, Size';
      strengthSuffix = '';
      break;
    case 'General Item (FMCG / Baby Care / Cosmetics)':
      field1Label = 'Pieces per Carton/Box';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Pieces';
      strengthPlaceholder = 'e.g., Large, 500g, 1 Liter';
      strengthSuffix = '';
      break;
    default:
      field1Label = 'Items/Pieces per Box/Pack';
      showField2 = false;
      totalBaseUnits = (stripsPerBox || 1);
      baseUnitSuffix = 'Units';
      break;
  }

  // Handle irrelevant field cleanup to avoid dirty data
  useEffect(() => {
    if (!showField2) {
      setValue('units_per_strip', 1);
    }
  }, [showField2, setValue]);

  const unitCost = purchasePrice > 0 ? (purchasePrice / totalBaseUnits) : 0;

  // Calculate full pack sale price.
  const fullPackSalePrice = unitSalePrice > 0 ? (unitSalePrice * totalBaseUnits) : 0;


  // Auto-calculate unit sale price and full pack sale price when pricing inputs change
  useEffect(() => {
    // Only calculate if we have a valid purchase price and margin
    if (purchasePrice >= 0 && marginPercent >= 0) {
      const calculatedUnitSale = unitCost + (unitCost * (marginPercent / 100));
      const calculatedFullSale = purchasePrice + (purchasePrice * (marginPercent / 100));

      const currentUnitSale = methods.getValues('unit_sale_price');
      const currentFullSale = methods.getValues('sale_price');

      const newUnitSale = Number(calculatedUnitSale.toFixed(2));
      const newFullSale = Number(calculatedFullSale.toFixed(2));

      if (currentUnitSale !== newUnitSale) {
        setValue('unit_sale_price', newUnitSale, { shouldValidate: true, shouldDirty: true });
      }
      if (currentFullSale !== newFullSale) {
        setValue('sale_price', newFullSale, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [purchasePrice, marginPercent, totalBaseUnits, unitCost, setValue, methods]);

  useEffect(() => {
    if (name && dirtyFields.name) {
      setValue('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''), { shouldValidate: true, shouldDirty: true });
    }
  }, [name, setValue, dirtyFields]);

  // Sync computed full pack sale price into form state so it passes validation (mrp must be >= sale_price etc.)
  useEffect(() => {
    if (dirtyFields.unit_sale_price || dirtyFields.purchase_price || dirtyFields.margin_percent || dirtyFields.strips_per_box || dirtyFields.units_per_strip || dirtyFields.packaging_type) {
      setValue('sale_price', parseFloat(fullPackSalePrice.toFixed(2)));
      const currentMrp = methods.getValues('mrp');
      if (currentMrp < fullPackSalePrice) {
        setValue('mrp', parseFloat(fullPackSalePrice.toFixed(2)));
      }
    }
  }, [fullPackSalePrice, setValue, methods, dirtyFields]);

  return (
    <div className="w-full max-w-5xl mx-auto pb-8">


      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

          {/* Section 1: Basic Information */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-1">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">1</span>
                Basic Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="col-span-1 md:col-span-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Medicine Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g., Amoxicillin 250mg"
                  className={`w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>

              {settings.showGenericName && (
                <div className="col-span-1 md:col-span-5">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Generic Name</label>
                  <Controller
                    control={control}
                    name="generic_name"
                    render={({ field }) => (
                      <CreatableMasterDataSelect
                        masterType="generics"
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Generic"
                      />
                    )}
                  />
                </div>
              )}

              <div className="col-span-1 md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <CreatableMasterDataSelect
                      masterType="categories"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Category"
                    />
                  )}
                />
              </div>

              <div className="col-span-1 md:col-span-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Manufacturer <span className="text-red-500">*</span></label>
                <Controller
                  control={control}
                  name="manufacturer"
                  render={({ field }) => (
                    <CreatableMasterDataSelect
                      masterType="manufacturers"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Manufacturer"
                    />
                  )}
                />
              </div>

              {settings.showBrandName && (
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    {...register('brand_name')}
                    placeholder="e.g., Augmentin"
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              {settings.showFormula && (
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Formula</label>
                  <input
                    type="text"
                    {...register('formula')}
                    placeholder="e.g., Amoxicillin 250mg + Clavulanic Acid"
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              <div className="col-span-1 md:col-span-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Barcode</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    {...register('barcode')}
                    placeholder="Scan or Enter Barcode"
                    className="w-full border border-outline-variant rounded-l-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-10"
                  />
                  <div className="shrink-0 h-10 rounded-r-custom border-y border-r border-outline-variant bg-slate-50 flex items-center justify-center">
                    <BarcodeScannerModal onScan={(code) => setValue('barcode', code)} />
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-12">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full border border-outline-variant rounded-custom px-3 py-2 min-h-[80px] focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Packaging & Location */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-2">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">2</span>
                Packaging & Location
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Packaging Type <span className="text-red-500">*</span></label>
                  <select
                    {...register('packaging_type')}
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="Tablet / Capsule">Tablet / Capsule</option>
                    <option value="Syrup / Suspension">Syrup / Suspension</option>
                    <option value="Injection (Ampule / Vial)">Injection (Ampule / Vial)</option>
                    <option value="Cream / Ointment / Gel">Cream / Ointment / Gel</option>
                    <option value="Drops (Eye / Ear / Oral)">Drops (Eye / Ear / Oral)</option>
                    <option value="Inhaler / Spray">Inhaler / Spray</option>
                    <option value="Powder / Sachet">Powder / Sachet</option>
                    <option value="Suppository / Enema">Suppository / Enema</option>
                    <option value="Surgical / Dressing (Bandage, Gauze, Tape)">Surgical / Dressing</option>
                    <option value="Medical Device / Equipment (BP Monitor, Thermometer)">Medical Device / Equipment</option>
                    <option value="General Item (FMCG / Baby Care / Cosmetics)">General Item</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{field1Label} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    {...register('strips_per_box', { valueAsNumber: true })}
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {showField2 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field2Label} <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="1"
                      {...register('units_per_strip', { valueAsNumber: true })}
                      className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Shelf / Rack Location</label>
                  <input
                    type="text"
                    {...register('shelf')}
                    placeholder="e.g., A-12, Rack 3"
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-mint-soft/50 p-4 rounded-custom border border-mint-bright/30 flex items-center gap-4">
                <div className="bg-emerald-deep p-2 rounded-lg text-white">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-deep uppercase tracking-wider">Total Base Units (Calculated)</p>
                  <p className="text-xl font-bold text-slate-900">{totalBaseUnits} <span className="text-slate-500 text-sm font-normal">{baseUnitSuffix}</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Dynamic Pricing Setup */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-3">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">3</span>
                Dynamic Pricing Setup
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Price (Full Pack) <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('purchase_price', { valueAsNumber: true })}
                    className="w-full border border-outline-variant rounded-r-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1">Unit Cost (Auto)</label>
                <div className="flex items-center opacity-60">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input
                    type="text"
                    value={unitCost.toFixed(4)}
                    disabled
                    className="w-full bg-slate-50 border border-outline-variant rounded-r-custom h-10 px-3 py-2 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Margin (%)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    {...register('margin_percent', { valueAsNumber: true })}
                    className="w-full border border-outline-variant rounded-l-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <span className="bg-slate-100 border border-l-0 border-outline-variant px-3 py-2 rounded-r-custom text-slate-500 text-sm font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Unit Sale Price <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('unit_sale_price', { valueAsNumber: true })}
                    className="w-full border border-outline-variant rounded-r-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-emerald-deep"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="bg-slate-50 p-3 rounded-custom inline-block border border-dashed border-outline-variant">
                  <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-tighter">Full Pack Sale Price (Auto)</p>
                  <p className="text-lg font-bold text-slate-800">Rs {fullPackSalePrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Specifications & Taxes */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-4">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">4</span>
                Specifications & Taxes
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Strength / Specification</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    {...register('strength')}
                    placeholder={strengthPlaceholder}
                    className="w-full border border-outline-variant rounded-l-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  {strengthSuffix && (
                    <span className="bg-slate-100 border border-l-0 border-outline-variant px-2 py-2 rounded-r-custom text-slate-400 text-[10px] uppercase font-bold">
                      {strengthSuffix}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Max Retail Price (MRP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('mrp', { valueAsNumber: true })}
                  className={`w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all ${errors.mrp ? 'border-red-500' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  {...register('tax_rate', { valueAsNumber: true })}
                  className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 text-red-600">Low Stock Alert Level</label>
                <input
                  type="number"
                  min="0"
                  {...register('min_stock_level', { valueAsNumber: true })}
                  className="w-full border border-red-200 bg-red-50/30 rounded-custom h-10 px-3 py-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 5: Opening Stock & Batch Details */}
          {!isEdit && (
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-5">
              <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
                <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">5</span>
                  Opening Stock & Batch Details
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    {...register('opening_stock', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    {...register('batch_number')}
                    placeholder="e.g., BATCH-001"
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mfg Date</label>
                  <input
                    type="date"
                    {...register('manufacturing_date')}
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    {...register('expiry_date')}
                    className="w-full border border-outline-variant rounded-custom h-10 px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-600"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Settings & Control */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-6">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">{isEdit ? '5' : '6'}</span>
                Settings & Control
              </h3>
            </div>
            <div className="p-6 flex flex-wrap gap-12">
              <label className="flex items-center gap-3 cursor-pointer group">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value === 'Active'}
                      onChange={(e) => field.onChange(e.target.checked ? 'Active' : 'Inactive')}
                      className="w-5 h-5 rounded text-emerald-deep focus:ring-emerald-500 transition-all"
                    />
                  )}
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-deep transition-colors">Active (Available for Sale)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('narcotic')}
                  className="w-5 h-5 rounded text-red-500 border-red-200 focus:ring-red-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors">Controlled Substance (Narcotic)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('is_antibiotic')}
                  className="w-5 h-5 rounded text-blue-500 border-blue-200 focus:ring-blue-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Antibiotic</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('rx_required')}
                  className="w-5 h-5 rounded text-yellow-500 border-yellow-200 focus:ring-yellow-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-yellow-600 transition-colors">Prescription Required</span>
              </label>
            </div>
          </section>

          {/* Form Footer Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant animate-fade-in delay-6">
            <button
              type="button"
              onClick={() => router.push('/inventory/medicines')}
              className="px-8 py-3 text-slate-600 font-bold hover:text-slate-900 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMedicineMutation.isPending || updateMedicineMutation.isPending}
              className="px-12 py-3 bg-emerald hover:bg-emerald-deep text-white font-bold rounded-custom shadow-lg shadow-emerald/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {(createMedicineMutation.isPending || updateMedicineMutation.isPending) ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isEdit ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
