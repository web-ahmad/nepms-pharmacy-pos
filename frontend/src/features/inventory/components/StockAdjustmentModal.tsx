import { useState } from 'react';
import { useAdjustStock } from '../services/inventory.api';
import { Batch } from '../types/inventory';
import { X } from 'lucide-react';

interface StockAdjustmentModalProps {
  medicineId: string;
  batches: Batch[];
  isOpen: boolean;
  onClose: () => void;
}

export default function StockAdjustmentModal({ medicineId, batches, isOpen, onClose }: StockAdjustmentModalProps) {
  const [batchId, setBatchId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE'>('DECREASE');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  
  const adjustMutation = useAdjustStock();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      alert("Please select a batch");
      return;
    }
    
    try {
      await adjustMutation.mutateAsync({
        medicine_id: medicineId,
        batch_id: batchId,
        adjustment_type: adjustmentType,
        quantity,
        reason
      });
      onClose();
    } catch (err) {
      console.error("Adjustment failed", err);
      alert("Failed to adjust stock. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-950 border dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Adjust Stock</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Batch</label>
            <select
              required
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">-- Choose a batch --</option>
              {batches?.filter(b => b.status === 'Active' || b.current_quantity > 0).map(b => (
                <option key={b.id} value={b.id}>
                  {b.batch_number} (Qty: {b.current_quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={adjustmentType === 'INCREASE'}
                  onChange={() => setAdjustmentType('INCREASE')}
                  className="text-blue-600 focus:ring-blue-600"
                />
                Increase
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={adjustmentType === 'DECREASE'}
                  onChange={() => setAdjustmentType('DECREASE')}
                  className="text-red-600 focus:ring-red-600"
                />
                Decrease
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Reason</label>
            <textarea
              required
              rows={3}
              placeholder="E.g., Damaged, Expired, Inventory Count Discrepancy"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Confirm'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
