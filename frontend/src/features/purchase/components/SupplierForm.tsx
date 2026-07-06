import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateSupplier, useUpdateSupplier, useUpsertSupplierMedicines, useSupplierMedicines } from '../services/purchase.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Supplier } from '../types/purchase';
import { Plus, Trash2, Upload, Loader2, X, CheckSquare } from 'lucide-react';
import { useState } from 'react';

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')),
  address: z.string().optional(),
  region_name: z.string().min(1, 'Region is required'),
  tax_number: z.string().optional(),
  credit_limit: z.coerce.number().min(0).default(0),
  opening_balance: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
  medicine_prices: z.array(z.object({
    medicine_id: z.string().min(1, 'Select a medicine'),
    _unmatched_name: z.string().optional(),
    trade_price: z.coerce.number().min(0),
    exclusive_discount_percentage: z.coerce.number().min(0).default(0),
    bonus_scheme_threshold: z.coerce.number().min(0).default(0),
    delivery_lead_time_days: z.coerce.number().min(1).default(1)
  })).default([])
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  initialData?: Supplier & { region_name?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SupplierForm({ initialData, onSuccess, onCancel }: SupplierFormProps) {
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(initialData?.id || '');
  const upsertMedicinesMutation = useUpsertSupplierMedicines();
  
  const { data: existingMedicines, isLoading: isLoadingPrices } = useSupplierMedicines(initialData?.id || 'new');
  const { data: medicinesData } = useMedicines('', 1, 1000);
  const inventoryMedicines = medicinesData?.items || [];
  console.log('SupplierForm debug - medicinesData:', medicinesData, 'inventoryMedicines:', inventoryMedicines);

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      region_name: '',
      tax_number: '',
      credit_limit: 0,
      opening_balance: 0,
      is_active: true,
      medicine_prices: []
    }
  });

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const watchedMedicines = watch('medicine_prices') || [];
  const [customRegions, setCustomRegions] = useState<string[]>([]);
  
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [isRegionSubmitting, setIsRegionSubmitting] = useState(false);
  const [regionError, setRegionError] = useState(false);

  const handleAddRegion = () => {
    setIsRegionModalOpen(true);
    setNewRegionName('');
    setRegionError(false);
  };

  const handleSaveRegion = async () => {
    if (!newRegionName.trim()) {
      setRegionError(true);
      return;
    }
    
    setIsRegionSubmitting(true);
    
    // Simulate slight network delay for better UX
    await new Promise(res => setTimeout(res, 500));
    
    const trimmed = newRegionName.trim();
    if (!customRegions.includes(trimmed) && !['Lahore', 'Islamabad', 'Karachi', 'National'].includes(trimmed)) {
      setCustomRegions(prev => [...prev, trimmed]);
    }
    setValue('region_name', trimmed, { shouldValidate: true });
    
    setIsRegionSubmitting(false);
    setIsRegionModalOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const uniqueManufacturers = Array.from(new Set(inventoryMedicines.map((m: any) => m.manufacturer).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(inventoryMedicines.map((m: any) => m.category).filter(Boolean)));

  const filteredMedicines = inventoryMedicines.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesManufacturer = selectedManufacturer ? m.manufacturer === selectedManufacturer : true;
    const matchesCategory = selectedCategory ? m.category === selectedCategory : true;
    return matchesSearch && matchesManufacturer && matchesCategory;
  });

  const isAllFilteredSelected = filteredMedicines.length > 0 && filteredMedicines.every((m: any) => watchedMedicines.some((w: any) => w.medicine_id === m.id));

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const itemsToAdd = filteredMedicines.filter((m: any) => !watchedMedicines.some((w: any) => w.medicine_id === m.id));
      const payload = itemsToAdd.map((m: any) => ({
        medicine_id: m.id,
        trade_price: m.cost_per_base_unit || 0,
        exclusive_discount_percentage: 0,
        bonus_scheme_threshold: 0,
        delivery_lead_time_days: 1
      }));
      append(payload);
    } else {
      const filteredIds = new Set(filteredMedicines.map((m: any) => m.id));
      const indicesToRemove = fields.map((f, i) => filteredIds.has(f.medicine_id) ? i : -1).filter(i => i !== -1);
      remove(indicesToRemove);
    }
  };

  const handleCheckboxToggle = (medId: string, checked: boolean) => {
    if (checked) {
      const match = inventoryMedicines.find((m: any) => m.id === medId);
      append({
        medicine_id: medId,
        trade_price: match ? match.cost_per_base_unit || 0 : 0,
        exclusive_discount_percentage: 0,
        bonus_scheme_threshold: 0,
        delivery_lead_time_days: 1
      });
    } else {
      const index = fields.findIndex(f => f.medicine_id === medId);
      if (index !== -1) remove(index);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((h, index) => {
        row[h] = values[index] ? values[index].trim() : '';
      });
      rows.push(row);
    }
    return rows;
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      
      const newItems = rows.map(row => {
        const rawName = row['sku/medicinename'] || row['medicinename'] || row['sku'] || '';
        const match = inventoryMedicines.find((m: any) => m.name.toLowerCase() === rawName.toLowerCase() || m.sku?.toLowerCase() === rawName.toLowerCase());
        
        return {
          medicine_id: match ? match.id : '',
          _unmatched_name: match ? undefined : rawName,
          trade_price: parseFloat(row['tradeprice']) || (match ? match.cost_per_base_unit : 0),
          exclusive_discount_percentage: parseFloat(row['discount']) || 0,
          bonus_scheme_threshold: parseInt(row['bonusthreshold']) || 0,
          delivery_lead_time_days: parseInt(row['leadtime']) || 1
        };
      });

      const currentItems = fields;
      reset({
        ...control._formValues,
        medicine_prices: [...currentItems, ...newItems]
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const header = "SKU/MedicineName,TradePrice,Discount,BonusThreshold,LeadTime\n";
    const sample = "Paracetamol 500mg,2.50,10,100,2\n";
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "contract_pricing_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medicine_prices'
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        contact_person: initialData.contact_person || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        region_name: initialData.region_name || '',
        tax_number: initialData.tax_number || '',
        credit_limit: initialData.credit_limit,
        opening_balance: initialData.opening_balance,
        is_active: initialData.is_active,
        medicine_prices: existingMedicines || []
      });
    }
  }, [initialData, existingMedicines, reset]);

  const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay);
    }
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      let savedSupplierId = initialData?.id;
      const { medicine_prices, ...rawSupplierData } = data;
      
      const supplierData = {
        ...rawSupplierData,
        region_name: rawSupplierData.region_name || undefined,
        contact_person: rawSupplierData.contact_person || undefined,
        email: rawSupplierData.email || undefined,
        phone: rawSupplierData.phone || undefined,
        address: rawSupplierData.address || undefined,
        tax_number: rawSupplierData.tax_number || undefined,
        credit_limit: Number.isNaN(rawSupplierData.credit_limit) ? 0 : rawSupplierData.credit_limit,
        opening_balance: Number.isNaN(rawSupplierData.opening_balance) ? 0 : rawSupplierData.opening_balance,
      };

      if (initialData) {
        await withRetry(() => updateMutation.mutateAsync(supplierData));
      } else {
        const result = await withRetry(() => createMutation.mutateAsync(supplierData));
        savedSupplierId = result.id;
      }

      if (savedSupplierId && medicine_prices && medicine_prices.length > 0) {
        // Pre-flight check: Ensure all items have a selected medicine
        const validMedicines = medicine_prices.filter((m: any) => m.medicine_id);
        if (validMedicines.length > 0) {
          const payload = validMedicines.map((m: any) => ({ ...m, supplier_id: savedSupplierId }));
          // Batch execution using Promise.all wrapper around mutation if needed, but mutation already takes an array
          await withRetry(() => upsertMedicinesMutation.mutateAsync({ supplierId: savedSupplierId!, medicines: payload }));
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to deploy supplier mapping after retries:', err);
      alert("Network Error: Failed to deploy supplier configuration after multiple attempts. Please check your connection.");
    }
  };

  if (isLoadingPrices) {
    return <div className="h-64 flex items-center justify-center">Loading contract pricing...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-2">Supplier Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              {...register('name')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Contact Person</label>
            <input
              type="text"
              {...register('contact_person')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Region *</label>
            <div className="flex gap-2">
              <select
                {...register('region_name')}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Region</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Karachi">Karachi</option>
                <option value="National">National</option>
                {customRegions.map(r => <option key={r} value={r}>{r}</option>)}
                {initialData?.region_name && !['Lahore', 'Islamabad', 'Karachi', 'National'].includes(initialData.region_name) && !customRegions.includes(initialData.region_name) && (
                  <option value={initialData.region_name}>{initialData.region_name}</option>
                )}
              </select>
              <button
                type="button"
                onClick={handleAddRegion}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200"
                title="Add New Region"
              >
                <Plus size={20} />
              </button>
            </div>
            {errors.region_name && <p className="mt-1 text-xs text-red-500">{errors.region_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
            <input
              type="text"
              {...register('phone')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Physical Address</label>
            <input
              type="text"
              {...register('address')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tax Number (NTN/GST)</label>
            <input
              type="text"
              {...register('tax_number')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Credit Limit</label>
            <input
              type="number"
              step="0.01"
              {...register('credit_limit', { valueAsNumber: true })}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {!initialData && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Opening Balance</label>
              <input
                type="number"
                step="0.01"
                {...register('opening_balance', { valueAsNumber: true })}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-zinc-700">
            Active Supplier
          </label>
        </div>
      </div>

      {/* Map Medicines & Contract Pricing Sub-form */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-zinc-900">Map Medicines & Contract Pricing</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Define exclusive rates, bonus schemes, and delivery SLAs.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVImport} />
            <div className="flex flex-col items-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-emerald-200"
              >
                <Upload size={16} /> Import from CSV
              </button>
              <button type="button" onClick={downloadTemplate} className="text-[10px] text-emerald-600 hover:underline mt-1 font-medium">Download CSV Template</button>
            </div>
            {/* Hard Override: Replaced Add Contract Mapping with Checklist Button */}
            <button
              type="button"
              onClick={() => setIsChecklistModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-indigo-200 h-[38px] self-start"
            >
              <CheckSquare size={16} /> Select Medicines (Checklist)
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
            <thead className="text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="pb-3 px-2 font-medium w-1/3">Medicine / SKU</th>
                <th className="pb-3 px-2 font-medium text-right">Trade Price (Rs)</th>
                <th className="pb-3 px-2 font-medium text-right">Discount (%)</th>
                <th className="pb-3 px-2 font-medium text-right">Bonus Threshold</th>
                <th className="pb-3 px-2 font-medium text-right">Lead Time (Days)</th>
                <th className="pb-3 px-2 font-medium text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {fields.map((field, index) => {
                return (
                <tr key={field.id} className="hover:bg-zinc-50/50">
                  <td className="py-2 px-2">
                    {/* Hard Override: Completely comment out the dropdown mapping */}
                    {/* 
                    <select
                      {...register(`medicine_prices.${index}.medicine_id` as const)}
                      onChange={(e) => {
                        register(`medicine_prices.${index}.medicine_id`).onChange(e); // Trigger RHF validation
                        const medId = e.target.value;
                        if (medId) {
                          const match = inventoryMedicines.find((m: any) => m.id === medId);
                          if (match) {
                            const basePrice = match.cost_per_base_unit || 0;
                            setValue(`medicine_prices.${index}.trade_price` as const, basePrice);
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Select Medicine --</option>
                      {inventoryMedicines.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    */}
                    <div className="font-medium text-zinc-900 px-2">
                      {inventoryMedicines.find((m: any) => m.id === watchedMedicines[index]?.medicine_id)?.name || watchedMedicines[index]?.medicine_id}
                      <input type="hidden" {...register(`medicine_prices.${index}.medicine_id` as const)} />
                    </div>
                    {(field as any)._unmatched_name && (
                      <p className="mt-1 text-xs text-red-500 font-semibold bg-red-50 p-1 rounded border border-red-100">
                        Unmatched: {(field as any)._unmatched_name}
                      </p>
                    )}
                    {errors.medicine_prices?.[index]?.medicine_id && (
                      <p className="mt-1 text-xs text-red-500">{errors.medicine_prices[index]?.medicine_id?.message}</p>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`medicine_prices.${index}.trade_price` as const)}
                      className="w-full text-right rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register(`medicine_prices.${index}.exclusive_discount_percentage` as const)}
                      className="w-full text-right rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      {...register(`medicine_prices.${index}.bonus_scheme_threshold` as const)}
                      className="w-full text-right rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="1"
                      {...register(`medicine_prices.${index}.delivery_lead_time_days` as const)}
                      className="w-full text-right rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
                );
              })}
              {fields.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No contract pricing mapped. Click "Add Contract Mapping" to define pricing rules.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Deploying...' : 'Save & Deploy Supplier'}
        </button>
      </div>

      {/* Checklist Mapping Modal */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border dark:border-zinc-800">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Select Medicines</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Check medicines to add them to the contract mapping list.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsChecklistModalOpen(false)} 
                className="p-2 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-white shadow-sm transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sticky Header with Filters */}
            <div className="sticky top-0 bg-white dark:bg-zinc-950 p-4 border-b border-zinc-100 dark:border-zinc-800 z-10 space-y-3 shrink-0">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }} className="w-full">
                <input 
                  type="text" 
                  placeholder="Search medicines..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <select 
                  value={selectedManufacturer}
                  onChange={e => setSelectedManufacturer(e.target.value)}
                  className="min-w-[180px] rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Manufacturers</option>
                  {uniqueManufacturers.map((m: any) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="min-w-[180px] rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedManufacturer(''); setSelectedCategory(''); }}
                  className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg whitespace-nowrap transition-colors border border-transparent hover:border-zinc-200 shrink-0 font-medium"
                >
                  Clear Filters
                </button>
              </div>
              <div className="flex items-center gap-3 px-1 pt-1">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  Select All Filtered ({filteredMedicines.length})
                </span>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {filteredMedicines.map((med: any) => {
                  const isChecked = watchedMedicines.some((w: any) => w.medicine_id === med.id);
                  return (
                    <label key={med.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCheckboxToggle(med.id, e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <div>
                        <div className="font-medium text-zinc-900">{med.name}</div>
                        <div className="text-xs text-zinc-500">
                          {med.manufacturer && <span className="mr-2">Mfr: {med.manufacturer}</span>}
                          {med.category && <span className="mr-2">Cat: {med.category}</span>}
                          <span>Base Cost: ${med.cost_per_base_unit}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(false)}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Region Modal */}
      {isRegionModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Add New Region</h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsRegionModalOpen(false)} 
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-white shadow-sm transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Region Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newRegionName}
                onChange={(e) => {
                  setNewRegionName(e.target.value);
                  if (e.target.value.trim()) setRegionError(false);
                }}
                placeholder="e.g. Peshawar"
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  regionError 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-zinc-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {regionError && <p className="mt-1 text-xs text-red-500 font-medium">Region name cannot be empty.</p>}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsRegionModalOpen(false)}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRegion}
                disabled={isRegionSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                {isRegionSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRegionSubmitting ? 'Saving...' : 'Save Region'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
