'use client';

import React, { useEffect } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useCreateMedicine, useUpdateMedicine } from '@/features/inventory/services/medicine.api';

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

  const methods = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema) as any,
    defaultValues: defaultMedicineValues as any,
    mode: 'onChange'
  });

  const { register, handleSubmit, control, setValue, reset, formState: { errors, dirtyFields } } = methods;

  useEffect(() => {
    if (initialData && isEdit) {
      reset(initialData);

      // Trigger Auto-Calculations on Mount/Data Load
      const pPrice = initialData.purchase_price || 0;
      const margin = initialData.margin_percent || 0;
      const pType = initialData.packaging_type || 'Tablet / Capsule';
      const strips = initialData.strips_per_box || 1;
      const units = initialData.units_per_strip || 1;

      let baseUnits = 1;
      if (pType === 'Tablet / Capsule') {
        baseUnits = strips * units;
      } else {
        baseUnits = strips;
      }

      const uCost = pPrice > 0 ? pPrice / baseUnits : 0;
      const calcUSale = uCost + (uCost * margin / 100);
      const formattedUSale = parseFloat(calcUSale.toFixed(2));

      const fullSale = formattedUSale > 0 ? formattedUSale * baseUnits : 0;
      const formattedFullSale = parseFloat(fullSale.toFixed(2));

      setValue('unit_sale_price', formattedUSale);
      setValue('sale_price', formattedFullSale);

      const currentMrp = initialData.mrp || 0;
      if (currentMrp < formattedFullSale) {
        setValue('mrp', formattedFullSale);
      }
    }
  }, [initialData, isEdit, reset, setValue]);

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

      const payload = {
        ...data,
        dosage_form: data.packaging_type,
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

      if (isEdit) {
        await updateMedicineMutation.mutateAsync(payload as any);
        toast.success("Medicine updated successfully.");
      } else {
        await createMedicineMutation.mutateAsync(payload as any);
        toast.success("Medicine added successfully.");
      }
      router.push('/inventory/medicines');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Failed to save medicine");
      console.log("Submit Error:", error);
    }
  };

  const onError = (errors: any) => {
    toast.error("Please fill in all required fields correctly.");
    Object.keys(errors).forEach((key) => {
      if (errors[key]?.message) {
        toast.error(`${key}: ${errors[key].message}`);
      }
    });
    console.log("Form Validation Errors:", errors);
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


  // Auto-calculate unit sale price when unit cost changes to maintain current margin
  useEffect(() => {
    if (unitCost >= 0 && (dirtyFields.purchase_price || dirtyFields.margin_percent || dirtyFields.strips_per_box || dirtyFields.units_per_strip || dirtyFields.packaging_type)) {
      const margin = methods.getValues('margin_percent') || 0;
      const calculatedUnitSalePrice = unitCost + (unitCost * margin / 100);
      
      const currentUnitSalePrice = methods.getValues('unit_sale_price');
      const formattedCalculated = parseFloat(calculatedUnitSalePrice.toFixed(2));
      
      if (currentUnitSalePrice !== formattedCalculated) {
         setValue('unit_sale_price', formattedCalculated, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [unitCost, setValue, methods, dirtyFields]);

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
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              
              {/* 1. Basic Information */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">1. Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">
                      Medicine Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="name"
                      {...register('name')}
                      placeholder="e.g., Amoxicillin 250mg" 
                      className={errors.name ? 'border-red-500' : ''}
                    />
                  </div>
                  {settings.showGenericName && (
                    <div className="space-y-2">
                      <Label htmlFor="generic_name" className="text-zinc-700 dark:text-zinc-300">Generic Name</Label>
                      <Controller
                        control={control}
                        name="generic_name"
                        render={({ field }) => (
                          <CreatableMasterDataSelect
                            masterType="generics"
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Amoxicillin"
                          />
                        )}
                      />
                    </div>
                  )}
                  {settings.showBrandName && (
                    <div className="space-y-2">
                      <Label htmlFor="brand_name" className="text-zinc-700 dark:text-zinc-300">Brand Name</Label>
                      <Input 
                        id="brand_name"
                        {...register('brand_name')}
                        placeholder="e.g., Augmentin" 
                        className={errors.brand_name ? 'border-red-500' : ''}
                      />
                    </div>
                  )}
                  {settings.showFormula && (
                    <div className="space-y-2">
                      <Label htmlFor="formula" className="text-zinc-700 dark:text-zinc-300">Formula / Composition</Label>
                      <Input 
                        id="formula"
                        {...register('formula')}
                        placeholder="e.g., Amoxicillin 250mg + Clavulanic Acid 125mg" 
                        className={errors.formula ? 'border-red-500' : ''}
                      />
                    </div>
                  )}

                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-zinc-700 dark:text-zinc-300">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Medicine">Medicine</SelectItem>
                            <SelectItem value="Non-Medicine">Non-Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer" className="text-zinc-700 dark:text-zinc-300">
                      Manufacturer <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="manufacturer"
                      render={({ field }) => (
                        <CreatableMasterDataSelect
                          masterType="manufacturers"
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="GSK"
                          error={!!errors.manufacturer}
                        />
                      )}
                    />
                  </div>
                  {settings.showBarcode && (
                    <div className="space-y-2">
                      <Label htmlFor="barcode" className="text-zinc-700 dark:text-zinc-300">Barcode</Label>
                      <div className="flex items-center gap-2">
                        <Input id="barcode" {...register('barcode')} placeholder="7245149940272" className="flex-1" />
                        <BarcodeScannerModal onScan={(code) => setValue('barcode', code, { shouldValidate: true, shouldDirty: true })} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Packaging Details & Location */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">2. Packaging Details & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-zinc-700 dark:text-zinc-300">
                      Packaging Type Selection <span className="text-red-500">*</span>
                    </Label>
                    <Select onValueChange={(val) => setValue('packaging_type', val || '')} value={packagingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tablet / Capsule">Tablet / Capsule</SelectItem>
                        <SelectItem value="Syrup / Suspension">Syrup / Suspension</SelectItem>
                        <SelectItem value="Injection (Ampule / Vial)">Injection (Ampule / Vial)</SelectItem>
                        <SelectItem value="Drops (Eye / Ear / Nasal)">Drops (Eye / Ear / Nasal)</SelectItem>
                        <SelectItem value="Cream / Ointment / Gel">Cream / Ointment / Gel</SelectItem>
                        <SelectItem value="Inhaler / Spray">Inhaler / Spray</SelectItem>
                        <SelectItem value="Sachet / Powder">Sachet / Powder</SelectItem>
                        <SelectItem value="Surgical / Disposable (Syringe, Cannula, IV Set)">Surgical / Disposable (Syringe, Cannula, IV Set)</SelectItem>
                        <SelectItem value="Bandage / Dressing / Plaster">Bandage / Dressing / Plaster</SelectItem>
                        <SelectItem value="Medical Device / Equipment (BP Monitor, Thermometer)">Medical Device / Equipment (BP Monitor, Thermometer)</SelectItem>
                        <SelectItem value="General Item (FMCG / Baby Care / Cosmetics)">General Item (FMCG / Baby Care / Cosmetics)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="strips_per_box" className="text-zinc-700 dark:text-zinc-300">
                      {field1Label} <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="strips_per_box" 
                      type="number" 
                      {...register('strips_per_box', { valueAsNumber: true })} 
                      className={errors.strips_per_box ? 'border-red-500' : ''}
                    />
                  </div>

                  {showField2 && (
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="units_per_strip" className="text-zinc-700 dark:text-zinc-300">
                        {field2Label} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="units_per_strip" 
                        type="number" 
                        {...register('units_per_strip', { valueAsNumber: true })} 
                        className={errors.units_per_strip ? 'border-red-500' : ''}
                      />
                    </div>
                  )}

                  {settings.showShelfLocation && (
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="shelf" className="text-zinc-700 dark:text-zinc-300">Shelf / Rack Location</Label>
                      <Input id="shelf" {...register('shelf')} placeholder="e.g., A-12, Rack 3" />
                    </div>
                  )}

                  <div className="space-y-2 col-span-1 md:col-span-4">
                    <Label className="text-zinc-400 text-xs font-semibold tracking-wider uppercase">Total Base Units (Calculated)</Label>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-center w-full max-w-sm">
                      <span className="text-xl font-bold font-mono mr-2">{totalBaseUnits}</span> 
                      <span className="text-sm text-zinc-500 font-mono">{baseUnitSuffix}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Dynamic Pricing Setup */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">3. Dynamic Pricing Setup</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price" className="text-zinc-700 dark:text-zinc-300">
                      Purchase Price (Full Pack) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">Rs</span>
                      <Input 
                        id="purchase_price" 
                        type="number" 
                        step="0.01"
                        {...register('purchase_price', { valueAsNumber: true })} 
                        className={`pl-8 ${errors.purchase_price ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold tracking-wider uppercase">Unit Cost (Auto)</Label>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-center">
                      <span className="text-zinc-500 text-sm font-medium mr-1">Rs</span>
                      <span className="text-lg font-bold font-mono">{unitCost.toFixed(4)}</span>
                    </div>
                  </div>
                  {settings.showMargin && (
                    <div className="space-y-2">
                      <Label htmlFor="margin_percent" className="text-zinc-700 dark:text-zinc-300">
                        Margin (%)
                      </Label>
                      <Input 
                        id="margin_percent" 
                        type="number" 
                        step="0.01"
                        {...register('margin_percent', { 
                          valueAsNumber: true,
                          onChange: (e) => {
                            const newMargin = parseFloat(e.target.value) || 0;
                            const currentUnitCost = methods.getValues('purchase_price') > 0 ? (methods.getValues('purchase_price') / totalBaseUnits) : 0;
                            const newSalePrice = currentUnitCost + (currentUnitCost * newMargin / 100);
                            setValue('unit_sale_price', parseFloat(newSalePrice.toFixed(2)), { shouldValidate: true, shouldDirty: true });
                          }
                        })} 
                        placeholder="e.g. 15"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="unit_sale_price" className="text-zinc-700 dark:text-zinc-300">
                      Unit Sale Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">Rs</span>
                      <Input 
                        id="unit_sale_price" 
                        type="number" 
                        step="0.01"
                        {...register('unit_sale_price', { 
                          valueAsNumber: true,
                          onChange: (e) => {
                            const newSalePrice = parseFloat(e.target.value) || 0;
                            const currentUnitCost = methods.getValues('purchase_price') > 0 ? (methods.getValues('purchase_price') / totalBaseUnits) : 0;
                            if (currentUnitCost > 0) {
                              const newMargin = ((newSalePrice - currentUnitCost) / currentUnitCost) * 100;
                              setValue('margin_percent', parseFloat(newMargin.toFixed(2)), { shouldValidate: true, shouldDirty: true });
                            }
                          }
                        })} 
                        className={`pl-8 ${errors.unit_sale_price ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold tracking-wider uppercase">Full Pack Sale Price (Auto)</Label>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-center">
                      <span className="text-zinc-500 text-sm font-medium mr-1">Rs</span>
                      <span className="text-lg font-bold font-mono">{fullPackSalePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Specifications & Taxes */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">4. Specifications & Taxes</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {settings.showStrength && (
                    <div className="space-y-2">
                      <Label htmlFor="strength">Strength / Specification</Label>
                      <div className="relative">
                        <Input 
                          id="strength" 
                          {...register('strength')} 
                          placeholder={strengthPlaceholder} 
                          className={strengthSuffix ? "pr-28" : ""}
                        />
                        {strengthSuffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium pointer-events-none">
                            {strengthSuffix}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {settings.showMRP && (
                    <div className="space-y-2">
                      <Label htmlFor="mrp">Max Retail Price (MRP)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">Rs</span>
                        <Input id="mrp" type="number" step="0.01" {...register('mrp', { valueAsNumber: true })} className="pl-8" />
                      </div>
                    </div>
                  )}
                  {settings.showTaxRate && (
                    <div className="space-y-2">
                      <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                      <Input id="tax_rate" type="number" step="0.01" {...register('tax_rate', { valueAsNumber: true })} />
                    </div>
                  )}
                  {settings.showMinStock && (
                      <div className="space-y-2">
                        <Label htmlFor="min_stock_level" className="text-zinc-700 dark:text-zinc-300">Low Stock Alert Level</Label>
                        <Input id="min_stock_level" type="number" {...register('min_stock_level')} placeholder="e.g., 20" />
                      </div>
                  )}
                  {settings.showMaxStock && (
                    <div className="space-y-2">
                      <Label htmlFor="max_stock_level">Maximum Stock Level</Label>
                      <Input id="max_stock_level" type="number" {...register('max_stock_level', { valueAsNumber: true })} />
                    </div>
                  )}
                </div>
              </div>

              {/* 4.5 Opening Stock & Batch Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">5. Opening Stock & Batch Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {settings.showOpeningStock && (
                    <div className="space-y-2">
                      <Label htmlFor="opening_stock">Opening Stock Qty</Label>
                      <Input 
                        id="opening_stock" 
                        type="number" 
                        {...register('opening_stock', { valueAsNumber: true })} 
                        className={errors.opening_stock ? 'border-red-500' : ''}
                      />
                    </div>
                  )}
                  {settings.showBatchDetails && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="batch_number">Batch Number</Label>
                        <Input 
                          id="batch_number" 
                          {...register('batch_number')} 
                          placeholder="e.g. BATCH-001" 
                          className={errors.batch_number ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manufacturing_date">Mfg Date</Label>
                        <Input 
                          id="manufacturing_date" 
                          type="date" 
                          {...register('manufacturing_date')} 
                          className={errors.manufacturing_date ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiry_date">Expiry Date</Label>
                        <Input 
                          id="expiry_date" 
                          type="date" 
                          {...register('expiry_date')} 
                          className={errors.expiry_date ? 'border-red-500' : ''}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 5. Settings & Control */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-blue-600 border-b border-slate-100 pb-2">6. Settings & Control</h3>
                <div className="flex flex-col sm:flex-row gap-6">
                  {settings.showStatus && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="status_active" 
                        checked={methods.watch('status') === 'Active'}
                        onCheckedChange={(checked) => setValue('status', checked ? 'Active' : 'Inactive', { shouldValidate: true, shouldDirty: true })}
                      />
                      <Label htmlFor="status_active" className="text-sm font-normal">Active (Available for Sale)</Label>
                    </div>
                  )}
                  {settings.showControlledSubstance && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_controlled" 
                        checked={!!methods.watch('is_controlled')}
                        onCheckedChange={(checked) => setValue('is_controlled', !!checked, { shouldValidate: true, shouldDirty: true })}
                      />
                      <Label htmlFor="is_controlled" className="text-sm font-normal">Controlled Substance (Narcotic / Prescription Required)</Label>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/inventory/medicines')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                disabled={createMedicineMutation.isPending}
              >
                {createMedicineMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Medicine"
                )}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
