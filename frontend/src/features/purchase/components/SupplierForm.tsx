import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateSupplier, useUpdateSupplier, useUpsertSupplierMedicines, useSupplierMedicines } from '../services/purchase.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Supplier } from '../types/purchase';
import { Plus, Trash2, Upload } from 'lucide-react';

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

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<SupplierFormData>({
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // Basic CSV parsing splitting by comma
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
          trade_price: parseFloat(row['tradeprice'] || row['trade_price'] || '0') || 0,
          exclusive_discount_percentage: parseFloat(row['discountpercent'] || row['discount_percent'] || '0') || 0,
          bonus_scheme_threshold: parseInt(row['bonusthreshold'] || row['bonus_threshold'] || '0', 10) || 0,
          delivery_lead_time_days: parseInt(row['leadtimedays'] || row['lead_time_days'] || '1', 10) || 1,
        };
      });

      append(newItems);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = "SKU/MedicineName,TradePrice,DiscountPercent,BonusThreshold,LeadTimeDays\n";
    const example = "Panadol Extra 50mg,10.50,5,10,2\n";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier_mapping_template.csv';
    a.click();
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
        await updateMutation.mutateAsync(supplierData);
      } else {
        const result = await createMutation.mutateAsync(supplierData);
        savedSupplierId = result.id;
      }

      if (savedSupplierId && medicine_prices) {
        const payload = medicine_prices.map((m: any) => ({ ...m, supplier_id: savedSupplierId }));
        await upsertMedicinesMutation.mutateAsync({ supplierId: savedSupplierId, medicines: payload });
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      alert("Failed to save supplier.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 font-['Inter']">
      {/* Profile Section */}
      <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3">Supplier Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Supplier Name <span className="text-red-500">*</span></label>
            <input
              {...register('name')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Region <span className="text-red-500">*</span></label>
            <input
              {...register('region_name')}
              placeholder="e.g. Lahore, Karachi"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {errors.region_name && <p className="mt-1 text-sm text-red-500">{errors.region_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Contact Person</label>
            <input
              {...register('contact_person')}
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
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
            <input
              {...register('phone')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tax Number (VAT/GST)</label>
            <input
              {...register('tax_number')}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              rows={2}
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
            <button
              type="button"
              onClick={() => append({ medicine_id: '', trade_price: 0, exclusive_discount_percentage: 0, bonus_scheme_threshold: 0, delivery_lead_time_days: 1 })}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-indigo-200 h-[38px] self-start"
            >
              <Plus size={16} /> Add Contract Mapping
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
              {fields.map((field, index) => (
                <tr key={field.id} className="hover:bg-zinc-50/50">
                  <td className="py-2 px-2">
                    <select
                      {...register(`medicine_prices.${index}.medicine_id` as const)}
                      className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Select Medicine --</option>
                      {inventoryMedicines.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
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
              ))}
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
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          {isSubmitting ? 'Saving Configuration...' : 'Save & Deploy Supplier'}
        </button>
      </div>
    </form>
  );
}
