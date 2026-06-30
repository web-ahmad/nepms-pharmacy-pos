'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Barcode, Save, Wand2, X, Search } from 'lucide-react';

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
import { useCreateMedicine, useMedicines } from '@/features/inventory/services/inventory.api';
import { useSuppliers } from '@/features/purchase/services/purchase.api';

const formSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  generic_name: z.string().optional(),
  brand_name: z.string().min(1, "Brand Name / Manufacturer is required"),
  category: z.string().optional(),
  therapeutic_class: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),

  packaging_unit: z.string().optional(),
  uom: z.string().min(1, "Unit of Measure is required"),
  strips_per_box: z.coerce.number().min(1).default(1),
  units_per_strip: z.coerce.number().min(1).default(1),

  purchase_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  trade_price: z.coerce.number().min(0).default(0),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
  tax_category: z.string().optional(),

  current_stock: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().min(0).default(0),
  shelf: z.string().optional(),

  batch_number: z.string().optional(),
  manufacturing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  supplier_id: z.string().optional(),

  drug_schedule: z.string().optional(),
  is_controlled: z.boolean().default(false),
  storage_conditions: z.string().optional(),

  status: z.string().default("Active"),
  substitute_ids: z.array(z.string()).default([])
});

type FormData = z.infer<typeof formSchema>;

export default function AddMedicinePage() {
  const router = useRouter();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: createMedicine, isPending } = useCreateMedicine();
  const { data: suppliers } = useSuppliers();
  const { data: medicinesData } = useMedicines();

  const [substituteSearch, setSubstituteSearch] = useState('');
  const [substituteDropdownOpen, setSubstituteDropdownOpen] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
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
      substitute_ids: [],
      category: "",
      therapeutic_class: "",
      uom: "",
      tax_category: "",
      supplier_id: "",
      drug_schedule: ""
    }
  });

  const strips = watch('strips_per_box');
  const units = watch('units_per_strip');
  const currentStock = watch('current_stock');
  const uom = watch('uom');
  const genericName = watch('generic_name');
  const therapeuticClass = watch('therapeutic_class');

  const isSingleUnitUOM = ['Tube', 'Bottle', 'Vial', 'Sachet'].includes(uom);

  const totalUnitsPerPack = useMemo(() => {
    if (isSingleUnitUOM) return 1;
    return (strips || 1) * (units || 1);
  }, [isSingleUnitUOM, strips, units]);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isSingleUnitUOM) {
      setValue('strips_per_box', 1);
      setValue('units_per_strip', 1);
    }
  }, [isSingleUnitUOM, setValue]);

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
      const matchesGeneric = genericName && med.generic_name && med.generic_name.toLowerCase() === genericName.toLowerCase();
      const matchesTherapeutic = therapeuticClass && med.therapeutic_class && med.therapeutic_class === therapeuticClass;
      return matchesGeneric || matchesTherapeutic;
    });
  }, [medicinesData, genericName, therapeuticClass]);

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
        manufacturer: data.brand_name,
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

      if (data.current_stock > 0) {
        if (!data.batch_number || !data.expiry_date) {
          toast.error("Batch Number and Expiry Date are required when providing Initial Stock.");
          return;
        }
        payload.initial_batch = {
          batch_number: data.batch_number,
          manufacturing_date: data.manufacturing_date || undefined,
          expiry_date: data.expiry_date,
          supplier_id: data.supplier_id || undefined,
          current_stock: data.current_stock
        };
      }

      await createMedicine(payload);
      toast.success("Medicine added successfully!");
      router.push('/inventory/medicines');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add medicine");
    }
  };

  return (
    <div className="w-full space-y-6 p-6 md:p-8 pb-20">
      {/* Dynamic Full-Width Header */}
      <div className="flex items-center space-x-4 border-b border-slate-200 pb-5">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl border-slate-300">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Medicine</h1>
          <p className="text-sm text-slate-500">Create a new product record in the pharmacy catalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-8">

        {/* Section 1: Basic Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">1. Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Barcode (Auto-Focus Ready)</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input {...register('barcode')}
                  ref={(e) => {
                    register('barcode').ref(e);
                    // @ts-ignore
                    barcodeInputRef.current = e;
                  }}
                  className="w-full pl-9 h-10 border-slate-300 bg-slate-50 focus-visible:ring-indigo-500"
                  placeholder="Scan product barcode..."
                />
              </div>
            </div>
            <div>
              <Label className="block mb-2 font-medium">Product Name <span className="text-red-500">*</span></Label>
              <Input {...register('name')} className="h-10 border-slate-300 capitalize" placeholder="e.g. Panadol Extra" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="block mb-2 font-medium">Generic Name (Formula)</Label>
              <Input {...register('generic_name')} className="h-10 border-slate-300" placeholder="e.g. Paracetamol" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Brand Name / Manufacturer <span className="text-red-500">*</span></Label>
              <Input {...register('brand_name')} className="h-10 border-slate-300" placeholder="e.g. GSK" />
              {errors.brand_name && <p className="text-red-500 text-xs mt-1">{errors.brand_name.message}</p>}
            </div>
            <div>
              <Label className="block mb-2 font-medium">Product Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
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
              <Label className="block mb-2 font-medium">Therapeutic Class</Label>
              <Controller
                control={control}
                name="therapeutic_class"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
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
            <div className="md:col-span-3">
              <Label className="block mb-2 font-medium">SKU / Product Code</Label>
              <div className="flex space-x-2 max-w-md">
                <Input {...register('sku')} className="h-10 border-slate-300" placeholder="MED-0001" />
                <Button type="button" variant="secondary" onClick={generateSKU} className="h-10 border border-slate-300 bg-slate-100 hover:bg-slate-200">
                  <Wand2 className="w-4 h-4 mr-2 text-slate-600" /> Auto-Gen
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Packaging & Unit Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">2. Packaging & Unit Details (UOM Matrix)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Pack Size description</Label>
              <Input {...register('packaging_unit')} className="h-10 border-slate-300" placeholder="e.g. 10x10 Box, 120ml Bottle" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Unit of Measure <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="uom"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
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
                  <Label className="block mb-2 font-medium">Strips per Box</Label>
                  <Input type="number" {...register('strips_per_box')} className="h-10 border-slate-300" min="1" />
                </div>
                <div>
                  <Label className="block mb-2 font-medium">Units per Strip</Label>
                  <Input type="number" {...register('units_per_strip')} className="h-10 border-slate-300" min="1" />
                </div>
              </>
            ) : (
              <div className="md:col-span-1 flex items-center pt-6">
                <Badge variant="outline" className="text-slate-500 px-3 py-1.5 border-dashed border-slate-300 bg-slate-50 rounded-lg text-xs italic">
                  Strip calculation rules hidden for {uom}
                </Badge>
              </div>
            )}

            <div className="md:col-span-3 flex items-end mt-2">
              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">{isSingleUnitUOM ? 'Units per Pack (Defaulted):' : 'Total Units per Pack (Auto-Calculated):'}</span>
                <span className="text-xl font-bold text-indigo-600">{totalUnitsPerPack} Units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">3. Pricing Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Purchase Price</Label>
              <Input type="number" step="0.01" {...register('purchase_price')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Retail Price (MRP) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" {...register('sale_price')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Trade Price</Label>
              <Input type="number" step="0.01" {...register('trade_price')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Max Allowed Discount %</Label>
              <Input type="number" step="0.1" {...register('discount_percentage')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Tax Category</Label>
              <Controller
                control={control}
                name="tax_category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
                      <SelectValue placeholder="Select Tax Bracket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Exempt">Exempt / Zero-Taxed</SelectItem>
                      <SelectItem value="GST 17%">Standard GST 17%</SelectItem>
                      <SelectItem value="Reduced 5%">Reduced Bracket 5%</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Stock & Inventory */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">4. Stock Thresholds</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Initial Stock Qty</Label>
              <Input type="number" {...register('current_stock')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Minimum Alert Level</Label>
              <Input type="number" {...register('min_stock_level')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Reorder Alert Trigger</Label>
              <Input type="number" {...register('reorder_level')} className="h-10 border-slate-300" />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Rack / Shelf Location</Label>
              <Input {...register('shelf')} className="h-10 border-slate-300" placeholder="e.g. Rack A-12" />
            </div>
          </div>
        </div>

        {/* Section 5: Batch & Expiry Conditional Block */}
        {currentStock > 0 && (
          <div className="bg-amber-50/60 p-6 rounded-xl border border-amber-200 shadow-sm space-y-4 animate-in fade-in duration-300">
            <h2 className="text-lg font-semibold text-amber-900 border-b border-amber-200 pb-2">5. Initial Batch Details (Opening Balance)</h2>
            <p className="text-xs text-amber-700">Since initial stock quantity is specified, a system seeder will automatically commit an automated opening balance ledger entry. Please append batch fields.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label className="block mb-2 font-medium text-amber-900">Batch Number *</Label>
                <Input {...register('batch_number')} className="h-10 border-amber-300 bg-white" placeholder="e.g. B-90812" />
              </div>
              <div>
                <Label className="block mb-2 font-medium text-amber-900">Manufacturing Date</Label>
                <Input type="date" {...register('manufacturing_date')} className="h-10 border-amber-300 bg-white" />
              </div>
              <div>
                <Label className="block mb-2 font-medium text-amber-900">Expiry Date *</Label>
                <Input type="date" {...register('expiry_date')} className="h-10 border-amber-300 bg-white" />
              </div>
              <div>
                <Label className="block mb-2 font-medium text-amber-900">Initial Supplier</Label>
                <Controller
                  control={control}
                  name="supplier_id"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger className="w-full h-10 border-amber-300 bg-white">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((sup: any) => (
                          <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Regulatory & Safety */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">6. Regulatory & Compliance Safety</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Drug Schedule Bracket</Label>
              <Controller
                control={control}
                name="drug_schedule"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
                      <SelectValue placeholder="Select Schedule Rules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTC">OTC (Over the Counter)</SelectItem>
                      <SelectItem value="Prescription Required">Prescription Required (Rx Only)</SelectItem>
                      <SelectItem value="Controlled Substance">Controlled Substance (Narcotic Logs)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="block mb-2 font-medium">Storage Environment Parameters</Label>
              <Controller
                control={control}
                name="storage_conditions"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
                      <SelectValue placeholder="Select Climate Threshold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Room Temp">Normal Room Temperature</SelectItem>
                      <SelectItem value="Refrigerated 2-8°C">Refrigerated Cold-Chain (2-8°C)</SelectItem>
                      <SelectItem value="Cool & Dry">Cool & Dry Vault</SelectItem>
                      <SelectItem value="Protect from Light">Sensitive (Protect from direct light)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('is_controlled')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700">Flag as Controlled Substance Ledger</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 7: Additional Options & Modern Combobox Substitutes */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">7. Operational Status & Substitutes Matrix</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block mb-2 font-medium">Catalog Lifecycle Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className="w-full h-10 border-slate-300 bg-white">
                      <SelectValue placeholder="Select Lifecycle Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active (Available for POS Streams)</SelectItem>
                      <SelectItem value="Inactive">Inactive (Locked / Hidden)</SelectItem>
                      <SelectItem value="Discontinued">Discontinued Listing</SelectItem>
                      <SelectItem value="Out of Stock">Temporary Out Of Stock Flag</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="relative" ref={dropdownRef}>
              <Label className="block mb-2 font-medium">Medical Substitutes (Same Formula Alternatives)</Label>
              <Controller
                control={control}
                name="substitute_ids"
                render={({ field }) => {
                  const selectedIds = field.value || [];
                  const selectedMeds = medicinesData?.items?.filter((m: any) => selectedIds.includes(m.id)) || [];

                  return (
                    <div className="w-full">
                      <div
                        className="min-h-[40px] w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white cursor-pointer flex flex-wrap gap-2 items-center hover:border-slate-400 transition-colors"
                        onClick={() => setSubstituteDropdownOpen(true)}
                      >
                        {selectedMeds.length === 0 && <span className="text-slate-400 text-sm">Select identical formula alternatives...</span>}
                        {selectedMeds.map((med: any) => (
                          <Badge key={med.id} variant="secondary" className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded-md py-0.5">
                            {med.name}
                            <X
                              className="w-3 h-3 cursor-pointer text-indigo-500 hover:text-indigo-900 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                field.onChange(selectedIds.filter(id => id !== med.id));
                              }}
                            />
                          </Badge>
                        ))}
                      </div>

                      {substituteDropdownOpen && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in slide-in-from-top-1 duration-200">
                          <div className="sticky top-0 bg-slate-50 p-2 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                placeholder="Search matching formula medicines..."
                                value={substituteSearch}
                                onChange={(e) => setSubstituteSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="p-1">
                            {filteredSubstitutes.length === 0 ? (
                              <div className="p-4 text-xs text-slate-400 text-center italic">
                                {!genericName && !therapeuticClass
                                  ? "Please supply Generic Formula / Therapeutic Class parameters above to automatically source substitutes."
                                  : "No generic matches found inside catalog records."}
                              </div>
                            ) : (
                              filteredSubstitutes.map((med: any) => {
                                const isSelected = selectedIds.includes(med.id);
                                return (
                                  <div
                                    key={med.id}
                                    className={`px-3 py-2 text-sm cursor-pointer rounded-lg flex items-center justify-between my-0.5 transition-colors ${isSelected ? 'bg-indigo-50 font-medium text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        field.onChange(selectedIds.filter(id => id !== med.id));
                                      } else {
                                        field.onChange([...selectedIds, med.id]);
                                      }
                                    }}
                                  >
                                    <span className="flex flex-col">
                                      <span>{med.name}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">Mfg: {med.brand_name || 'Generic'}</span>
                                    </span>
                                    {isSelected && <span className="text-indigo-600 font-bold text-xs">✓</span>}
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

        {/* Global Styled Actions Bottom Panel */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" className="mr-3 h-11 px-6 rounded-xl border-slate-300" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] h-11 px-6 rounded-xl shadow-md transition-all font-medium">
            {isPending ? 'Saving Record...' : <><Save className="w-4 h-4 mr-2" /> Save Medicine</>}
          </Button>
        </div>

      </form>
    </div>
  );
}