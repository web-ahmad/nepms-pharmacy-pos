'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { usePurchaseReturns, useCreatePurchaseReturn, PurchaseReturn } from '@/features/purchase/services/purchase.api';
import { PurchaseOrder } from '@/features/purchase/types/purchase';
import { Plus, ArrowLeft, PackageX, CheckCircle2, Eye, Printer, TrendingDown, FileText } from 'lucide-react';
import Link from 'next/link';
import { GlobalPrintTemplate } from '@/components/shared/GlobalPrintTemplate';

export default function PurchaseReturnsPage() {
  const { data: returns, isLoading } = usePurchaseReturns();
  const { data: purchaseOrders } = useQuery({ 
    queryKey: ['purchase_orders'], 
    queryFn: async () => (await api.get('/api/v1/purchase/orders')).data as PurchaseOrder[] 
  });
  
  const createMutation = useCreatePurchaseReturn();
  const [showModal, setShowModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>('');
  
  const selectedOrder = purchaseOrders?.find(po => po.id === selectedPO);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseReturn | null>(null);

  const totalValue = returns?.reduce((sum, r) => sum + r.total_amount, 0) || 0;
  const totalInvoices = returns?.length || 0;

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    const itemsToReturn = selectedOrder.items
      .filter(i => returnItems[i.medicine_id] > 0)
      .map(i => ({
        medicine_id: i.medicine_id,
        quantity_returned: returnItems[i.medicine_id],
        unit_price: i.unit_price
      }));
      
    if (itemsToReturn.length === 0) return;
    
    const totalAmount = itemsToReturn.reduce((sum, item) => sum + (item.quantity_returned * item.unit_price), 0);
    
    await createMutation.mutateAsync({
      po_id: selectedOrder.id,
      supplier_id: selectedOrder.supplier_id,
      total_amount: totalAmount,
      reason,
      items: itemsToReturn
    });
    
    setShowModal(false);
    setSelectedPO('');
    setReturnItems({});
    setReason('');
  };

  return (
    <>
      <div className={`space-y-6 ${selectedInvoice ? 'print:hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/purchase" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Purchase Returns
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage PO returns and auto-debit notes.
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Initiate Return
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Returns Value</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Rs {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Return Invoices</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalInvoices}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : returns?.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500 text-sm">
            <PackageX size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100">No returns found</p>
            <p>You haven't initiated any purchase returns yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Return No</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {returns?.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(r.return_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {r.return_number}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {r.supplier_name || 'Unknown Supplier'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {r.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                      Rs {r.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center print:hidden">
                      <button 
                        onClick={() => setSelectedInvoice(r)}
                        className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="View Debit Note"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Initiate Purchase Return</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="return-form" onSubmit={handleCreateReturn} className="space-y-6">
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Select Purchase Order</label>
                  <select 
                    value={selectedPO}
                    onChange={(e) => {
                      setSelectedPO(e.target.value);
                      setReturnItems({});
                    }}
                    required
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a PO to Return Items From --</option>
                    {purchaseOrders?.filter(po => po.status === 'Received' || po.status === 'Completed' || po.status === 'Partially Received' || po.status === 'Approved').map(po => (
                      <option key={po.id} value={po.id}>
                        {po.order_number} - {po.supplier_name} (Rs {po.total_amount})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOrder && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">Select Items to Return</h4>
                    
                    <div className="space-y-3">
                      {selectedOrder.items.map(item => (
                        <div key={item.medicine_id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <div>
                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{item.medicine_name}</p>
                            <p className="text-xs text-zinc-500">Purchased: {item.quantity_ordered} @ Rs {item.unit_price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Return Qty:</label>
                            <input 
                              type="number"
                              min="0"
                              max={item.quantity_ordered}
                              value={returnItems[item.medicine_id] || ''}
                              onChange={(e) => setReturnItems(prev => ({ ...prev, [item.medicine_id]: parseInt(e.target.value) || 0 }))}
                              className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-semibold text-zinc-500 uppercase">Reason for Return</label>
                      <input 
                        type="text"
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Damaged during transit, Near expiry"
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                  </div>
                )}
                
              </form>
            </div>
            
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="return-form"
                disabled={createMutation.isPending || !selectedOrder || Object.values(returnItems).every(v => !v)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 print:hidden shrink-0">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Debit Note Invoice</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none px-2">&times;</button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
              
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">DEBIT NOTE</h1>
                <p className="text-sm font-semibold tracking-widest text-zinc-500 uppercase mt-1">Purchase Return</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-8">
                <div>
                  <p className="text-sm font-semibold text-zinc-500 uppercase">To Supplier</p>
                  <p className="text-lg font-bold mt-1">{selectedInvoice.supplier_name}</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-zinc-500">Return No:</div>
                    <div className="font-bold">{selectedInvoice.return_number}</div>
                    
                    <div className="text-zinc-500">Date:</div>
                    <div className="font-medium">{new Date(selectedInvoice.return_date).toLocaleDateString()}</div>
                    
                    {selectedInvoice.reason && (
                      <>
                        <div className="text-zinc-500">Reason:</div>
                        <div className="font-medium">{selectedInvoice.reason}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <table className="w-full text-sm text-left mb-8">
                <thead className="border-b-2 border-zinc-800 dark:border-zinc-200 font-semibold uppercase text-xs text-zinc-500">
                  <tr>
                    <th className="py-3 px-2">Item Description</th>
                    <th className="py-3 px-2 text-right">Qty</th>
                    <th className="py-3 px-2 text-right">Rate</th>
                    <th className="py-3 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {selectedInvoice.items.map(item => (
                    <tr key={item.medicine_id}>
                      <td className="py-4 px-2 font-medium">{item.medicine_name || 'Unknown Item'}</td>
                      <td className="py-4 px-2 text-right">{item.quantity_returned}</td>
                      <td className="py-4 px-2 text-right">Rs {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-2 text-right font-medium">Rs {(item.quantity_returned * item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-800 dark:border-zinc-200">
                    <td colSpan={3} className="py-4 px-2 text-right font-bold text-base">Grand Total (To Deduct)</td>
                    <td className="py-4 px-2 text-right font-bold text-lg text-red-600 dark:text-red-400 whitespace-nowrap">Rs {selectedInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
              
              <div className="mt-16 text-center text-sm text-zinc-500 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <p>This is a computer generated debit note and does not require a physical signature.</p>
              </div>
              
            </div>
            
          </div>
        </div>
      )}

      {/* Global Print Template for PO Returns / Debit Note */}
      {selectedInvoice && (
        <GlobalPrintTemplate
          title="DEBIT NOTE"
          metadata={[
            { label: 'Supplier', value: selectedInvoice.supplier_name },
            { label: 'Return No', value: selectedInvoice.return_number },
            { label: 'Date', value: new Date(selectedInvoice.return_date).toLocaleDateString() },
            ...(selectedInvoice.reason ? [{ label: 'Reason', value: selectedInvoice.reason }] : [])
          ]}
        >
          <table>
            <thead>
              <tr>
                <th className="text-left">Item Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map(item => (
                <tr key={item.medicine_id}>
                  <td>{item.medicine_name || 'Unknown Item'}</td>
                  <td className="text-right">{item.quantity_returned}</td>
                  <td className="text-right">Rs {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-right font-medium">Rs {(item.quantity_returned * item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right">Grand Total (To Deduct)</td>
                <td className="text-right">Rs {selectedInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </GlobalPrintTemplate>
      )}

    </>
  );
}
