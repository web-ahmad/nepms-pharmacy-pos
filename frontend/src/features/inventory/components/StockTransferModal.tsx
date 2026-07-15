import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Medicine } from '../types/inventory';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineId?: string; // Pre-select a medicine if initiated from details page
}

export default function StockTransferModal({ isOpen, onClose, medicineId }: StockTransferModalProps) {
  const { branchId } = useAuthStore();
  const queryClient = useQueryClient();
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<Array<{ medicine_id: string; quantity: number }>>(
    medicineId ? [{ medicine_id: medicineId, quantity: 1 }] : []
  );

  // Fetch destination branches for transfer (this usually requires a list of all branches,
  // but for simplicity, assuming we have a branches API or can manually enter for now)
  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get('/enterprise/branches');
      return res.data;
    }
  });

  // Fetch medicines for selection
  const { data: medicines } = useQuery({
    queryKey: ['medicines', 'all'],
    queryFn: async () => {
      const res = await api.get('/api/v1/inventory/medicines?limit=1000');
      return res.data.items || res.data;
    }
  });

  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/v1/inventory/transfers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Stock transfer initiated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(parseApiError(error));
    }
  });

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { medicine_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationBranchId) return toast.error('Destination branch is required');
    if (items.length === 0) return toast.error('At least one item is required');
    if (items.some(i => !i.medicine_id || i.quantity <= 0)) return toast.error('Valid medicine and quantity required for all items');

    createTransfer.mutate({
      source_branch_id: branchId || '',
      destination_branch_id: destinationBranchId,
      status: 'Pending',
      reason,
      items: items.map(item => ({
        medicine_id: item.medicine_id,
        quantity: item.quantity
      }))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-[8px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9ff]">
          <h2 className="text-[18px] font-bold text-[#0b1c30]">Initiate Stock Transfer</h2>
          <button onClick={onClose} className="p-2 text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#45464d]">Source Branch</label>
              <div className="px-3 py-2 border border-[#c6c6cd] rounded-[4px] bg-[#f8f9ff] text-[14px] text-[#76777d]">
                Current Branch
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#45464d]">Destination Branch <span className="text-[#ba1a1a]">*</span></label>
              <select
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-[4px] text-[14px] focus:outline-none focus:border-[#0058be]"
                required
              >
                <option value="">Select Destination Branch</option>
                {branches?.items?.filter((b: any) => b.id !== branchId).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-[#45464d]">Transfer Reason / Notes</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-[#c6c6cd] rounded-[4px] text-[14px] focus:outline-none focus:border-[#0058be]"
              placeholder="e.g., Replenishment, Inter-branch sharing"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#0b1c30]">Transfer Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eff4ff] text-[#0058be] font-semibold text-[13px] rounded-[4px] hover:bg-[#0058be]/10 transition-colors"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="border border-[#e2e8f0] rounded-[4px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f8f9ff] border-b border-[#e2e8f0] text-[#45464d]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Medicine</th>
                    <th className="px-4 py-3 font-bold w-32">Quantity</th>
                    <th className="px-4 py-3 font-bold w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <select
                          value={item.medicine_id}
                          onChange={(e) => handleUpdateItem(index, 'medicine_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-[#c6c6cd] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0058be]"
                        >
                          <option value="">Select Medicine...</option>
                          {medicines?.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.generic_name})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-[#c6c6cd] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0058be]"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-sm transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[#76777d]">
                        No items added to transfer
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e2e8f0] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-bold text-[#45464d] border border-[#c6c6cd] rounded-[4px] hover:bg-[#f8f9ff] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createTransfer.isPending}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-bold text-white bg-[#0058be] rounded-[4px] hover:bg-[#2170e4] transition-colors disabled:opacity-50"
          >
            {createTransfer.isPending ? 'Initiating...' : 'Initiate Transfer'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
