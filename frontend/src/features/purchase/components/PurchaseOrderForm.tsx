import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useCreatePO, useSuppliers } from '../services/purchase.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Plus, Trash2 } from 'lucide-react';

const poItemSchema = z.object({
  medicine_id: z.string().min(1, 'Select a medicine'),
  quantity_ordered: z.coerce.number().min(1, 'Must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Cannot be negative')
});

const poSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  expected_delivery_date: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item')
});

type POFormData = z.infer<typeof poSchema>;

export default function PurchaseOrderForm() {
  const router = useRouter();
  const createMutation = useCreatePO();
  
  // Data for dropdowns
  const { data: suppliers } = useSuppliers();
  const { data: medicinesData } = useMedicines('', 1, 1000); // Fetching a larger limit for dropdowns in this phase
  const medicines = medicinesData?.items || [];

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<POFormData>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      supplier_id: '',
      expected_delivery_date: '',
      items: [{ medicine_id: '', quantity_ordered: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items');

  // Calculate total automatically
  const totalAmount = watchItems.reduce((acc, item) => acc + (item.quantity_ordered * item.unit_price), 0);

  const onSubmit = async (data: POFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        expected_delivery_date: data.expected_delivery_date || undefined,
        total_amount: totalAmount
      });
      router.push('/purchase/orders');
    } catch (err) {
      console.error('Failed to create PO:', err);
      alert('Failed to create Purchase Order');
    }
  };

  // Auto-fill purchase price when medicine is selected
  const handleMedicineChange = (index: number, medId: string) => {
    const med = medicines.find((m: any) => m.id === medId);
    if (med) {
      setValue(`items.${index}.unit_price`, med.purchase_price);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Supplier <span className="text-red-500">*</span></label>
          <select
            {...register('supplier_id')}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">-- Select Supplier --</option>
            {(suppliers || []).filter(s => s.is_active).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.supplier_id && <p className="mt-1 text-sm text-red-500">{errors.supplier_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Expected Delivery Date</label>
          <input
            type="date"
            {...register('expected_delivery_date')}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Order Items</h3>
          <button
            type="button"
            onClick={() => append({ medicine_id: '', quantity_ordered: 1, unit_price: 0 })}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>

        <div className="p-4 overflow-x-auto">
          {errors.items?.message && typeof errors.items.message === 'string' && (
            <p className="mb-4 text-sm text-red-500">{errors.items.message}</p>
          )}
          
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="pb-3 font-medium w-2/5">Medicine</th>
                <th className="pb-3 font-medium w-1/5 text-right">Quantity</th>
                <th className="pb-3 font-medium w-1/5 text-right">Unit Price</th>
                <th className="pb-3 font-medium w-1/5 text-right">Subtotal</th>
                <th className="pb-3 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="py-3 pr-4">
                    <select
                      {...register(`items.${index}.medicine_id` as const)}
                      onChange={(e) => {
                        register(`items.${index}.medicine_id`).onChange(e);
                        handleMedicineChange(index, e.target.value);
                      }}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- Select Medicine --</option>
                      {medicines.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.total_quantity} in stock)</option>
                      ))}
                    </select>
                    {errors.items?.[index]?.medicine_id && (
                      <p className="mt-1 text-xs text-red-500">{errors.items[index]?.medicine_id?.message}</p>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity_ordered` as const)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rs</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.unit_price` as const)}
                        className="w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm text-right focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    {(() => {
                      const medId = watchItems[index]?.medicine_id;
                      if (!medId) return null;
                      const med = medicines.find((m: any) => m.id === medId);
                      if (!med) return null;
                      const currentPrice = watchItems[index]?.unit_price || 0;
                      if (currentPrice === 0) return null;
                      
                      const avgPrice = med.purchase_price || 0;
                      if (avgPrice === 0) return null;

                      if (currentPrice > avgPrice * 1.05) {
                        return <div className="mt-1 flex justify-end"><span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500">Above Avg</span></div>;
                      }
                      if (currentPrice <= avgPrice) {
                        return <div className="mt-1 flex justify-end"><span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400">Best Deal</span></div>;
                      }
                      return null;
                    })()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    Rs {((watchItems[index]?.quantity_ordered || 0) * (watchItems[index]?.unit_price || 0)).toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-6 text-right font-bold text-zinc-900 dark:text-zinc-50 text-lg">Grand Total:</td>
                <td className="pt-6 text-right font-bold font-mono text-blue-600 dark:text-blue-400 text-xl">
                  Rs {totalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || fields.length === 0}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating PO...' : 'Create Purchase Order'}
        </button>
      </div>

    </form>
  );
}
