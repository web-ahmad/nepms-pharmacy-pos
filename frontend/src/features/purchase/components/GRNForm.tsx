import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PurchaseOrder } from '../types/purchase';
import { useCreateGRN } from '../services/purchase.api';

const grnItemSchema = z.object({
  po_item_id: z.string(),
  medicine_id: z.string(),
  medicine_name: z.string().optional(),
  quantity_received: z.coerce.number().min(1, 'Quantity must be at least 1'),
  batch_number: z.string().min(2, 'Batch number is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  apply_to_old_stock: z.boolean().default(false)
});

const grnSchema = z.object({
  po_id: z.string(),
  supplier_id: z.string(),
  received_date: z.string().optional(),
  items: z.array(grnItemSchema).min(1, 'Receive at least one item')
});

type GRNFormData = z.infer<typeof grnSchema>;

interface GRNFormProps {
  po: PurchaseOrder;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GRNForm({ po, onSuccess, onCancel }: GRNFormProps) {
  const createMutation = useCreateGRN();

  // Prepare default items: filter out items that are fully received
  const pendingItems = po.items.filter(item => item.quantity_ordered > item.quantity_received);

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<GRNFormData>({
    resolver: zodResolver(grnSchema) as any,
    defaultValues: {
      po_id: po.id,
      supplier_id: po.supplier_id,
      received_date: new Date().toISOString().split('T')[0],
      items: pendingItems.map(item => ({
        po_item_id: item.id,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity_received: item.quantity_ordered - item.quantity_received,
        batch_number: '',
        expiry_date: '',
        purchase_price: item.unit_price,
        selling_price: item.unit_price * 1.3, // Default 30% markup, users can change
        apply_to_old_stock: false
      }))
    }
  });

  const { fields, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items');
  const totalAmount = watchItems.reduce((acc, item) => acc + (item.quantity_received * item.purchase_price), 0);

  const onSubmit = async (data: GRNFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        total_amount: totalAmount
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create GRN', err);
      alert('Failed to process GRN');
    }
  };

  if (pendingItems.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-white border rounded-xl dark:bg-zinc-950 dark:border-zinc-800">
        All items for this Purchase Order have been fully received.
        <div className="mt-4">
          <button onClick={onCancel} className="text-blue-600 hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Receive Date</label>
          <input
            type="date"
            {...register('received_date')}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-end justify-end">
          <div className="text-right">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Receiving Value</p>
            <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">Rs {totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Goods to Receive</h3>
        {errors.items?.message && typeof errors.items.message === 'string' && (
          <p className="text-sm text-red-500">{errors.items.message}</p>
        )}

        {fields.map((field, index) => {
          const originalItem = pendingItems.find(pi => pi.id === field.po_item_id);
          const maxQty = originalItem ? originalItem.quantity_ordered - originalItem.quantity_received : 0;

          return (
            <div key={field.id} className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm relative">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 text-sm"
              >
                Exclude
              </button>
              
              <div className="mb-4">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {field.medicine_name || 'Medicine'}
                </h4>
                <p className="text-xs text-zinc-500 font-mono">
                  Pending: {maxQty}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Qty Received <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max={maxQty}
                    {...register(`items.${index}.quantity_received` as const)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  {errors.items?.[index]?.quantity_received && <p className="mt-1 text-xs text-red-500">{errors.items[index]?.quantity_received?.message}</p>}
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Batch No. <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    {...register(`items.${index}.batch_number` as const)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  {errors.items?.[index]?.batch_number && <p className="mt-1 text-xs text-red-500">{errors.items[index]?.batch_number?.message}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    {...register(`items.${index}.expiry_date` as const)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  {errors.items?.[index]?.expiry_date && <p className="mt-1 text-xs text-red-500">{errors.items[index]?.expiry_date?.message}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.purchase_price` as const)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.selling_price` as const)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      id={`items.${index}.apply_to_old_stock`}
                      {...register(`items.${index}.apply_to_old_stock` as const)}
                      className="h-3 w-3 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`items.${index}.apply_to_old_stock`} className="text-[10px] text-zinc-500 font-medium cursor-pointer">
                      Apply to old stock
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || fields.length === 0}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing GRN...' : 'Confirm Goods Received'}
        </button>
      </div>
    </form>
  );
}
