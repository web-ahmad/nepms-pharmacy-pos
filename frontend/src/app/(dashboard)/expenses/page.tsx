"use client";

import React, { useState, useMemo } from 'react';
import { useExpenseVouchers, useCreatePettyCashVoucher, useVoidExpenseVoucher } from '@/features/accounts/services/expense.api';
import { usePettyCashCategories, useCreatePettyCashCategory, useDeletePettyCashCategory } from '@/features/accounts/services/petty_cash.api';
import { Receipt, Check, Trash2, ArrowRight, Settings, Plus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';
import { GlobalPrintTemplate } from '@/components/shared/GlobalPrintTemplate';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PettyCashPage() {
  const [formData, setFormData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', description: '', petty_cash_category_id: '' });
  const [successMsg, setSuccessMsg] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewExpenseRef = searchParams.get('view_expense');

  const { data: categories, isLoading: isCategoriesLoading } = usePettyCashCategories();
  const { data: vouchers, isLoading: isVouchersLoading, refetch } = useExpenseVouchers();
  
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  React.useEffect(() => {
    if (viewExpenseRef && vouchers) {
      const v = vouchers.find(v => v.reference === viewExpenseRef);
      if (v) setSelectedVoucher(v);
    }
  }, [viewExpenseRef, vouchers]);

  const closeDrillDown = () => {
    setSelectedVoucher(null);
    if (viewExpenseRef) router.push('/expenses');
  };
  
  const { mutate: createVoucher, isPending: isSubmitting } = useCreatePettyCashVoucher();
  const { mutate: voidVoucher } = useVoidExpenseVoucher();
  const { mutate: createCategory, isPending: isCreatingCat } = useCreatePettyCashCategory();
  const { mutate: deleteCategory } = useDeletePettyCashCategory();

  const userData = useAuthStore(state => state.user);

  // Filter vouchers to only those that are petty cash
  const pettyCashVouchers = useMemo(() => {
    return vouchers?.filter(v => v.reference?.startsWith('PC-')) || [];
  }, [vouchers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.petty_cash_category_id || !formData.date) return;
    
    const submitData = new FormData();
    submitData.append('date', formData.date);
    submitData.append('amount', formData.amount);
    submitData.append('petty_cash_category_id', formData.petty_cash_category_id);
    submitData.append('created_by', userData?.username || "admin");
    if (formData.description) submitData.append('description', formData.description);
    
    createVoucher(submitData as any, {
      onSuccess: () => {
        setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', description: '', petty_cash_category_id: '' });
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 3000);
        refetch();
      }
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    createCategory({ name: newCatName }, {
      onSuccess: () => setNewCatName('')
    });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Petty Cash</h1>
          <p className="text-base text-gray-500 dark:text-zinc-400 mt-1">Record and manage your daily operational expenses independently.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} className="text-gray-500" />
            Download PDF
          </button>
          <button 
            onClick={() => setShowManageModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm text-sm font-medium"
          >
            <Settings size={16} />
            Manage Categories
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Receipt size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Expenses (Approved)</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              Rs {pettyCashVouchers.reduce((acc, v) => acc + (v.status === 'Approved' ? v.amount : 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Check size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Transactions</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              {pettyCashVouchers.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Premium Record Form */}
      <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-full md:flex-[0.8] space-y-2.5">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Date</label>
            <input 
              required
              type="date"
              value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
          </div>
          
          <div className="w-full md:flex-1 space-y-2.5">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Category</label>
            <select 
              required
              value={formData.petty_cash_category_id}
              onChange={e => setFormData(p => ({ ...p, petty_cash_category_id: e.target.value }))}
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none"
            >
              <option value="">Select Category</option>
              {categories?.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:flex-[0.8] space-y-2.5">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Amount (Rs)</label>
            <input 
              required
              type="number"
              min="1"
              value={formData.amount}
              onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
          </div>

          <div className="w-full md:flex-[1.5] space-y-2.5">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Description</label>
            <input 
              required
              type="text"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Office tea and snacks"
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl text-base focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto h-[54px] px-8 bg-gray-900 dark:bg-white hover:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white dark:text-gray-900 font-bold rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 shrink-0 group"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Saving...</span>
            ) : successMsg ? (
              <><Check size={20} className="text-emerald-400 dark:text-emerald-600" /> Saved!</>
            ) : (
              <><Receipt size={20} className="group-hover:scale-110 transition-transform" /> Record</>
            )}
          </button>
        </form>
        {isCategoriesLoading && (
          <p className="text-emerald-600 text-xs mt-3 ml-1 font-medium animate-pulse">Loading categories...</p>
        )}
      </div>

      {/* Recent Entries */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-zinc-950 text-gray-400 dark:text-zinc-500">
              <tr>
                <th className="px-8 py-5 font-semibold">Date</th>
                <th className="px-8 py-5 font-semibold">Category</th>
                <th className="px-8 py-5 font-semibold">Description</th>
                <th className="px-8 py-5 font-semibold text-right">Amount (Rs)</th>
                <th className="px-8 py-5 font-semibold text-center">Status</th>
                <th className="px-8 py-5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50 text-gray-700 dark:text-zinc-300">
              {isVouchersLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-400">Loading records...</td>
                </tr>
              ) : pettyCashVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-400 flex flex-col items-center gap-3">
                    <Receipt size={32} className="opacity-20" />
                    No petty cash expenses recorded yet.
                  </td>
                </tr>
              ) : (
                pettyCashVouchers.slice(0, 15).map((v) => {
                  const catName = categories?.find(c => c.id === v.petty_cash_category_id)?.name || 'Unknown';
                  return (
                    <tr 
                      key={v.id} 
                      onClick={() => setSelectedVoucher(v)}
                      className="hover:bg-gray-50/80 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-5 text-gray-500">{format(new Date(v.date), 'MMM d, yyyy')}</td>
                      <td className="px-8 py-5 font-medium">
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-zinc-300">
                          {catName}
                        </span>
                      </td>
                      <td className="px-8 py-5">{v.description || '-'}</td>
                      <td className="px-8 py-5 text-right font-bold text-gray-900 dark:text-white">Rs {v.amount.toLocaleString()}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ${
                          v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          v.status === 'Void' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {v.status !== 'Void' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if(window.confirm('Are you sure you want to void this expense?')) {
                                voidVoucher(v.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Void Expense"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Manager Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowManageModal(false)}>
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Manage Categories</h2>
              <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input 
                  required
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Foods, Travel"
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={isCreatingCat}
                  className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-medium text-sm transition-colors"
                >
                  <Plus size={16} />
                  Add
                </button>
              </form>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {isCategoriesLoading ? (
                  <p className="text-center text-sm text-gray-400 py-4">Loading...</p>
                ) : categories?.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">No custom categories yet.</p>
                ) : (
                  categories?.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <span className="font-medium text-gray-700 dark:text-zinc-300 text-sm">{cat.name}</span>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete category "${cat.name}"?`)) {
                            deleteCategory(cat.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Slide-over */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeDrillDown}>
          <div 
            className="bg-white dark:bg-zinc-950 w-full max-w-md h-full border-l border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Transaction Details</h2>
              <button onClick={closeDrillDown} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="text-center space-y-2 mt-4">
                <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Receipt size={28} />
                </div>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Rs {selectedVoucher.amount.toLocaleString()}</h3>
                <span className={`inline-flex px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg ${
                  selectedVoucher.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                  selectedVoucher.status === 'Void' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                  'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {selectedVoucher.status}
                </span>
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(selectedVoucher.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoucher.reference}</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {categories?.find(c => c.id === selectedVoucher.petty_cash_category_id)?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoucher.description || '-'}</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Created By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoucher.created_by_name || selectedVoucher.created_by || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
              <button 
                onClick={closeDrillDown}
                className="w-full py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Template for Petty Cash Summary */}
      <GlobalPrintTemplate 
        title="Petty Cash Report"
        metadata={[
          { label: 'Generated On', value: format(new Date(), 'MMM d, yyyy HH:mm') },
          { label: 'Total Spent (Approved)', value: `Rs ${pettyCashVouchers.reduce((acc, v) => v.status === 'Approved' ? acc + v.amount : acc, 0).toLocaleString()}` }
        ]}
      >
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Reference</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-center py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pettyCashVouchers.map(v => {
              const cat = categories?.find(c => c.id === v.petty_cash_category_id);
              return (
                <tr key={v.id} className="border-t">
                  <td className="py-2">{format(new Date(v.date), 'MMM d, yyyy')}</td>
                  <td className="py-2">{v.reference}</td>
                  <td className="py-2">{cat ? cat.name : 'Unknown'}</td>
                  <td className="py-2">{v.description || '-'}</td>
                  <td className="py-2 text-right">Rs {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 text-center">{v.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlobalPrintTemplate>

    </div>
  );
}
