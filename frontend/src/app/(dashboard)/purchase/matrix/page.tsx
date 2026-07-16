'use client';
import { usePurchaseApprovalMatrix } from '@/features/purchase/services/purchase.api';
import PurchaseApprovalMatrixForm from '@/features/purchase/components/PurchaseApprovalMatrixForm';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ApprovalMatrixPage() {
  const { data: matrix, isLoading } = usePurchaseApprovalMatrix();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Approval Matrix</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add Level'}</Button>
      </div>

      {showForm && (
        <div className="bg-zinc-50 p-6 rounded-xl border">
          <PurchaseApprovalMatrixForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {isLoading ? <p>Loading...</p> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="p-3 text-left">Level</th>
                <th className="p-3 text-left">Role Name</th>
                <th className="p-3 text-right">Threshold Amount</th>
              </tr>
            </thead>
            <tbody>
              {matrix?.map((m: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="p-3">Level {m.level}</td>
                  <td className="p-3">{m.role_name}</td>
                  <td className="p-3 text-right">${m.amount_threshold.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}