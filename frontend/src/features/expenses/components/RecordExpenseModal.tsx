import React, { useState, useRef } from 'react';
import { useCreateExpenseVoucher } from '@/features/accounts/services/expense.api';
import { useChartAccounts } from '@/features/accounts/services/accounts.api';
import { X, UploadCloud, Plus, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  expenseAccounts: any[];
}

export default function RecordExpenseModal({ onClose, expenseAccounts }: Props) {
  const { mutate: createVoucher, isPending: isCreating } = useCreateExpenseVoucher();

  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    payment_method: 'Cash',
    payee: '',
    description: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category_id) return;
    
    const submitData = new FormData();
    submitData.append('amount', formData.amount);
    submitData.append('category_id', formData.category_id);
    submitData.append('payment_method', formData.payment_method);
    if (formData.payee) submitData.append('payee', formData.payee);
    if (formData.description) submitData.append('description', formData.description);
    if (file) submitData.append('file', file);
    
    createVoucher(submitData as any, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="h-full w-full max-w-md bg-white dark:bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Expense</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Expense Category *</label>
              <select 
                required
                value={formData.category_id}
                onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none transition-colors"
              >
                <option value="">Select Category</option>
                {expenseAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Amount (Rs) *</label>
              <input 
                type="number" 
                required min="0" step="0.01"
                value={formData.amount}
                onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none transition-colors"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Payment Method</label>
              <select 
                value={formData.payment_method}
                onChange={e => setFormData(p => ({ ...p, payment_method: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none transition-colors"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Payee / Vendor</label>
              <input 
                type="text" 
                value={formData.payee}
                onChange={e => setFormData(p => ({ ...p, payee: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none transition-colors"
                placeholder="e.g. K-Electric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Description</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none resize-none transition-colors"
                placeholder="Details of expense..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Attachment (Optional)</label>
              <div 
                className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="mx-auto h-8 w-8 text-gray-400 group-hover:text-emerald-500 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {file ? file.name : "Click or drag receipt here"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 5MB</p>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
          <button 
            form="expense-form"
            type="submit" 
            disabled={isCreating}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            {isCreating ? 'Processing...' : 'Save & Auto-Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
