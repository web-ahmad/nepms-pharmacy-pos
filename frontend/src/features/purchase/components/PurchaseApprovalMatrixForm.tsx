import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreatePurchaseApprovalMatrix } from '../services/purchase.api';

export default function PurchaseApprovalMatrixForm({ onSuccess }: { onSuccess: () => void }) {
  const createMatrix = useCreatePurchaseApprovalMatrix();
  const [formData, setFormData] = useState({ level: 1, role_name: 'Branch Manager', amount_threshold: 1000 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMatrix.mutateAsync(formData);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Approval Level</label>
        <input type="number" className="w-full border p-2 rounded" value={formData.level} onChange={e => setFormData({...formData, level: Number(e.target.value)})} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role Name</label>
        <input type="text" className="w-full border p-2 rounded" value={formData.role_name} onChange={e => setFormData({...formData, role_name: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount Threshold</label>
        <input type="number" className="w-full border p-2 rounded" value={formData.amount_threshold} onChange={e => setFormData({...formData, amount_threshold: Number(e.target.value)})} />
      </div>
      <Button type="submit" disabled={createMatrix.isPending}>Save Matrix</Button>
    </form>
  );
}