'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Wand2, X, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpdateMedicine, useMedicineDetails, useMedicines } from '@/features/inventory/services/inventory.api';

const formSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  generic_name: z.string().optional().nullable(),
  brand_name: z.string().min(1, "Brand Name / Manufacturer is required"),
  category: z.string().optional().nullable(),
  therapeutic_class: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  
  packaging_unit: z.string().optional().nullable(),
  uom: z.string().min(1, "Unit of Measure is required"),
  strips_per_box: z.coerce.number().min(1).default(1),
  units_per_strip: z.coerce.number().min(1).default(1),
  
  purchase_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  trade_price: z.coerce.number().min(0).default(0),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
  tax_category: z.string().optional().nullable(),
  
  current_stock: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().min(0).default(0),
  shelf: z.string().optional().nullable(),
  
  drug_schedule: z.string().optional().nullable(),
  is_controlled: z.boolean().default(false),
  storage_conditions: z.string().optional().nullable(),
  
  status: z.string().default("Active"),
  substitute_ids: z.array(z.string()).optional()
});

type FormData = z.infer<typeof formSchema>;

export default function EditMedicinePage() {
  const router = useRouter();
  const { id } = useParams();
  
  const { data: medicine, isLoading } = useMedicineDetails(id as string);
  const { mutateAsync: updateMedicine, isPending } = useUpdateMedicine(id as string);
  const { data: medicinesData } = useMedicines();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [substituteDropdownOpen, setSubstituteDropdownOpen] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      strips_per_box: 1,
      units_per_strip: 1,
      purchase_price: 0,
      sale_price: 0,
      trade_price: 0,
      discount_percentage: 0,
      current_stock: 0,
      min_stock_level: 0,
      reorder_level: 0,
      is_controlled: false,
      status: "Active",
      substitute_ids: []
    }
  });

  useEffect(() => {
    if (medicine) {
      reset({
        name: medicine.name || '',
        generic_name: medicine.generic_name || '',
        brand_name: medicine.brand_name || medicine.manufacturer || '',
        category: medicine.category || '',
        therapeutic_class: medicine.therapeutic_class || '',
        sku: medicine.sku || '',
        barcode: medicine.barcode || '',
        packaging_unit: medicine.packaging_unit || '',
        uom: medicine.uom || '',
        strips_per_box: medicine.strips_per_box || 1,
        units_per_strip: medicine.units_per_strip || 1,
        purchase_price: medicine.purchase_price || 0,
        sale_price: medicine.sale_price || 0,
        trade_price: medicine.trade_price || 0,
        discount_percentage: medicine.discount_percentage || 0,
        tax_category: medicine.tax_category || '',
        current_stock: medicine.total_quantity || 0,
        min_stock_level: medicine.min_stock_level || 0,
        reorder_level: medicine.reorder_level || 0,
        shelf: medicine.shelf || '',
        drug_schedule: medicine.drug_schedule || '',
        is_controlled: medicine.is_controlled || false,
        storage_conditions: medicine.storage_conditions || '',
        status: medicine.status || 'Active',
        substitute_ids: (medicine as any).substitute_ids || []
      });
    }
  }, [medicine, reset]);

  const strips = watch('strips_per_box');
  const units = watch('units_per_strip');
  const uom = watch('uom');
  const genericName = watch('generic_name');
  const therapeuticClass = watch('therapeutic_class');

  const isSingleUnitUOM = ['Tube', 'Bottle', 'Vial', 'Sachet'].includes(uom || '');
  const totalUnitsPerPack = (strips || 1) * (units || 1);

  useEffect(() => {
    if (isSingleUnitUOM && medicine) {
      setValue('strips_per_box', 1);
      setValue('units_per_strip', 1);
    }
  }, [isSingleUnitUOM, setValue, medicine]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSubstituteDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validSubstitutes = useMemo(() => {
    if (!medicinesData?.items) return [];
    return medicinesData.items.filter((med: any) => {
      if (med.id === id) return false; // Exclude self
      const matchesGeneric = genericName && med.generic_name && med.generic_name.toLowerCase() === genericName.toLowerCase();
      const matchesTherapeutic = therapeuticClass && med.therapeutic_class && med.therapeutic_class === therapeuticClass;
      return matchesGeneric || matchesTherapeutic;
    });
  }, [medicinesData, genericName, therapeuticClass, id]);

  const filteredSubstitutes = useMemo(() => {
    if (!substituteSearch) return validSubstitutes;
    return validSubstitutes.filter((med: any) => med.name.toLowerCase().includes(substituteSearch.toLowerCase()));
  }, [validSubstitutes, substituteSearch]);

  const generateSKU = () => {
    const name = watch('name') || 'MED';
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    setValue('sku', `${prefix}-${random}`);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        name: data.name,
        generic_name: data.generic_name,
        brand_name: data.brand_name,
        manufacturer: data.brand_name, // Map brand_name to manufacturer as well
        category: data.category,
        therapeutic_class: data.therapeutic_class,
        sku: data.sku,
        barcode: data.barcode,
        packaging_unit: data.packaging_unit,
        uom: data.uom,
        strips_per_box: data.strips_per_box,
        units_per_strip: data.units_per_strip,
        purchase_price: data.purchase_price,
        sale_price: data.sale_price,
        trade_price: data.trade_price,
        discount_percentage: data.discount_percentage,
        tax_category: data.tax_category,
        min_stock_level: data.min_stock_level,
        reorder_level: data.reorder_level,
        shelf: data.shelf,
        drug_schedule: data.drug_schedule,
        is_controlled: data.is_controlled,
        storage_conditions: data.storage_conditions,
        status: data.status,
        substitute_ids: data.substitute_ids
      };

      await updateMedicine(payload);
      toast.success("Medicine updated successfully!");
      router.push('/inventory/medicines');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update medicine");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Medicine</h1>
          <p className="text-sm text-slate-500">Update the product record in the pharmacy catalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Section 1: Basic Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">1. Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block mb-2">Barcode</Label>
              <Input {...register('barcode')} className="bg-white" placeholder="Scan barcode..." />
            </div>
            <div>
              <Label className="block mb-2">Product Name <span className="text-red-500">*</span></Label>
              <Input {...register('name')} className="bg-white capitalize" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="block mb-2">Generic Name</Label>
              <Input {...register('generic_name')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Brand Name / Manufacturer <span className="text-red-500">*</span></Label>
              <Input {...register('brand_name')} className="bg-white" />
              {errors.brand_name && <p className="text-red-500 text-xs mt-1">{errors.brand_name.message}</p>}
            </div>
            <div>
              <Label className="block mb-2">Product Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="Syrup">Syrup</SelectItem>
                <SelectItem value="Capsule">Capsule</SelectItem>
                <SelectItem value="Injection">Injection</SelectItem>
                <SelectItem value="Cream">Cream</SelectItem>
                <SelectItem value="Ointment">Ointment</SelectItem>
                <SelectItem value="Drops">Drops</SelectItem>
                <SelectItem value="Inhaler">Inhaler</SelectItem>
                <SelectItem value="Powder">Powder</SelectItem>
                <SelectItem value="Suspension">Suspension</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="block mb-2">Therapeutic Class</Label>
              <Controller
                control={control}
                name="therapeutic_class"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                <SelectItem value="Painkiller">Painkiller</SelectItem>
                <SelectItem value="Antacid">Antacid</SelectItem>
                <SelectItem value="Antihistamine">Antihistamine</SelectItem>
                <SelectItem value="Vitamin">Vitamin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="block mb-2">SKU / Product Code</Label>
              <div className="flex space-x-2">
                <Input {...register('sku')} className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                <Button type="button" variant="secondary" onClick={generateSKU}><Wand2 className="w-4 h-4 mr-2" /> Auto</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Packaging & Unit Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">2. Packaging & Unit Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2">Pack Size</Label>
              <Input {...register('packaging_unit')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Unit of Measure <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="uom"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Strip">Strip</SelectItem>
                <SelectItem value="Box">Box</SelectItem>
                <SelectItem value="Bottle">Bottle</SelectItem>
                <SelectItem value="Vial">Vial</SelectItem>
                <SelectItem value="Tube">Tube</SelectItem>
                <SelectItem value="Sachet">Sachet</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.uom && <p className="text-red-500 text-xs mt-1">{errors.uom.message}</p>}
            </div>

            {!isSingleUnitUOM ? (
              <>
                <div>
                  <Label className="block mb-2">Strips per Box</Label>
                  <Input type="number" {...register('strips_per_box')} className="bg-white" min="1" />
                </div>
                <div>
                  <Label className="block mb-2">Units per Strip</Label>
                  <Input type="number" {...register('units_per_strip')} className="bg-white" min="1" />
                </div>
              </>
            ) : (
              <div className="md:col-span-1 flex items-center pt-6">
                <p className="text-sm text-slate-500 italic">Strip configuration disabled for {uom}.</p>
              </div>
            )}
            
            <div className="md:col-span-3 flex items-end mt-2">
              <div className="w-full bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">{isSingleUnitUOM ? 'Units/Volume per Pack:' : 'Total Units per Pack (Calculated):'}</span>
                <span className="text-lg font-bold text-indigo-600">{totalUnitsPerPack} Units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">3. Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2">Purchase Price</Label>
              <Input type="number" step="0.01" {...register('purchase_price')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Retail Price (MRP)</Label>
              <Input type="number" step="0.01" {...register('sale_price')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Trade Price</Label>
              <Input type="number" step="0.01" {...register('trade_price')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Discount %</Label>
              <Input type="number" step="0.1" {...register('discount_percentage')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Tax Category</Label>
              <Controller
                control={control}
                name="tax_category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select tax_category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Exempt">Exempt</SelectItem>
                <SelectItem value="GST 17%">GST 17%</SelectItem>
                <SelectItem value="Reduced 5%">Reduced 5%</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Stock & Inventory */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">4. Stock Thresholds</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2">Current Stock Qty (Read-only)</Label>
              <Input type="number" {...register('current_stock')} className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-md outline-none" readOnly disabled />
              <p className="text-xs text-slate-500 mt-1">Use Stock Movements to adjust quantity.</p>
            </div>
            <div>
              <Label className="block mb-2">Minimum Stock Level</Label>
              <Input type="number" {...register('min_stock_level')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Reorder Level</Label>
              <Input type="number" {...register('reorder_level')} className="bg-white" />
            </div>
            <div>
              <Label className="block mb-2">Storage Location / Shelf</Label>
              <Input {...register('shelf')} className="bg-white" />
            </div>
          </div>
        </div>

        {/* Section 6: Regulatory & Safety */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">5. Regulatory & Safety</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2">Drug Schedule</Label>
              <Controller
                control={control}
                name="drug_schedule"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select drug_schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTC">OTC</SelectItem>
                <SelectItem value="Prescription Required">Prescription Required</SelectItem>
                <SelectItem value="Controlled Substance">Controlled Substance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="block mb-2">Storage Conditions</Label>
              <Controller
                control={control}
                name="storage_conditions"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select storage_conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Room Temp">Room Temp</SelectItem>
                <SelectItem value="Refrigerated 2-8°C">Refrigerated 2-8°C</SelectItem>
                <SelectItem value="Cool & Dry">Cool & Dry</SelectItem>
                <SelectItem value="Protect from Light">Protect from Light</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('is_controlled')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700">Controlled Substance Flag</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 7: Additional */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">6. Additional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block mb-2">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Discontinued">Discontinued</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="relative" ref={dropdownRef}>
              <Label className="block mb-2">Substitute Medicines</Label>
              <Controller
                control={control}
                name="substitute_ids"
                render={({ field }) => {
                  const selectedIds = field.value || [];
                  const selectedMeds = medicinesData?.items?.filter((m: any) => selectedIds.includes(m.id)) || [];

                  return (
                    <div className="w-full">
                      <div 
                        className="min-h-[42px] w-full px-3 py-2 border border-slate-300 rounded-md bg-white cursor-pointer flex flex-wrap gap-2 items-center"
                        onClick={() => setSubstituteDropdownOpen(true)}
                      >
                        {selectedMeds.length === 0 && <span className="text-slate-400 text-sm">Select substitutes...</span>}
                        {selectedMeds.map((med: any) => (
                          <Badge key={med.id} variant="secondary" className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                            {med.name}
                            <X 
                              className="w-3 h-3 cursor-pointer hover:text-indigo-900" 
                              onClick={(e) => {
                                e.stopPropagation();
                                field.onChange(selectedIds.filter(id => id !== med.id));
                              }}
                            />
                          </Badge>
                        ))}
                      </div>

                      {substituteDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                              <input 
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Search substitutes..."
                                value={substituteSearch}
                                onChange={(e) => setSubstituteSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="p-1">
                            {filteredSubstitutes.length === 0 ? (
                              <div className="p-3 text-sm text-slate-500 text-center">
                                {!genericName && !therapeuticClass 
                                  ? "Enter Generic Name or Therapeutic Class first." 
                                  : "No matching substitutes found."}
                              </div>
                            ) : (
                              filteredSubstitutes.map((med: any) => {
                                const isSelected = selectedIds.includes(med.id);
                                return (
                                  <div 
                                    key={med.id}
                                    className={`px-3 py-2 text-sm cursor-pointer rounded-sm flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        field.onChange(selectedIds.filter(id => id !== med.id));
                                      } else {
                                        field.onChange([...selectedIds, med.id]);
                                      }
                                    }}
                                  >
                                    <span>{med.name} <span className="text-slate-400 text-xs ml-1">({med.brand_name})</span></span>
                                    {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="button" variant="outline" className="mr-4" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]">
            {isPending ? 'Updating...' : <><Save className="w-4 h-4 mr-2" /> Update Medicine</>}
          </Button>
        </div>

      </form>
    </div>
  );
}
