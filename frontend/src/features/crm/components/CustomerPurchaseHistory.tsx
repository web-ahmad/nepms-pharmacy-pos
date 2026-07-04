import React, { useState } from 'react';
import { useCustomerPurchases } from '../services/crm.api';
import { useSaleDetail } from '../../sales/services/sales.api';
import { format } from 'date-fns';
import { Eye, Printer, X, Receipt } from 'lucide-react';
import { useInvoiceSettings } from '@/features/settings/services/settings.api';
import { generateReceiptHtml } from '@/utils/receiptGenerator';

export default function CustomerPurchaseHistory({ customerId }: { customerId: string }) {
  const { data: purchases, isLoading, isError } = useCustomerPurchases(customerId);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  
  const { data: saleDetail, isLoading: isLoadingDetail } = useSaleDetail(selectedSaleId || undefined);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        Loading purchase history...
      </div>
    );
  }
  if (isError) {
    return <div className="text-red-500 p-4">Failed to load purchase history</div>;
  }

  const { data: invoiceSettings } = useInvoiceSettings();

  const handlePrint = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateReceiptHtml(sale, invoiceSettings, 'sale');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
            Completed
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-250 animate-pulse">
            Partially Paid
          </span>
        );
      case 'Held':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Held
          </span>
        );
      case 'Voided':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-250">
            Voided
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-premium-sans">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-4 font-medium">Invoice Number</th>
              <th className="p-4 font-medium">Date & Time</th>
              <th className="p-4 font-medium">Payment Mode</th>
              <th className="p-4 font-medium text-right">Total Amount</th>
              <th className="p-4 font-medium text-right">Amount Paid</th>
              <th className="p-4 font-medium text-right">Balance Owed</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800/50">
            {!purchases || purchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500 italic">No purchase transactions found.</td>
              </tr>
            ) : (
              purchases.map((sale) => {
                const balanceOwed = Math.max(0, sale.total_amount - sale.amount_paid);
                return (
                  <tr key={sale.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition">
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{sale.invoice_number}</td>
                    <td className="p-4 text-zinc-500">{format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm')}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium">{sale.payment_method}</td>
                    <td className="p-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">Rs {sale.total_amount.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-zinc-600 dark:text-zinc-400">Rs {sale.amount_paid.toFixed(2)}</td>
                    <td className={`p-4 text-right font-mono font-bold ${balanceOwed > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'}`}>
                      Rs {balanceOwed.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(sale.status)}</td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        title="View Details"
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition border border-zinc-200 dark:border-zinc-800"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Print Invoice"
                        onClick={() => handlePrint(sale)}
                        className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition border border-zinc-200 dark:border-zinc-800"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Detail Sidebar Drawer (White Theme) */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-lg h-screen shadow-2xl flex flex-col z-50 animate-slideLeft font-premium-sans">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-slate-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-950 font-premium-heading">Invoice Details</h3>
                  <p className="text-xs text-slate-500">Summary and financial logs</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleId(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="h-full flex items-center justify-center">
                  <span className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></span>
                </div>
              ) : !saleDetail ? (
                <p className="text-center text-slate-500">Could not fetch invoice details.</p>
              ) : (
                <div className="space-y-6">
                  
                  {/* Meta Grid details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Invoice Number</p>
                      <p className="font-bold text-slate-900 mt-0.5">{saleDetail.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status</p>
                      <div className="mt-1">{getStatusBadge(saleDetail.status)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Timestamp</p>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {new Date(saleDetail.sale_date).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Payment Method</p>
                      <p className="font-bold text-slate-800 mt-0.5">{saleDetail.payment_method}</p>
                    </div>
                  </div>

                  {/* List of Medicines */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sold Products</h4>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-150">
                      {saleDetail.items?.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50/50 transition">
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{item.medicine_name}</span>
                            <span className="font-mono text-slate-700">Rs {item.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>
                              Qty: {item.quantity} &bull; Price: Rs {item.unit_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">Rs {saleDetail.subtotal.toFixed(2)}</span>
                    </div>
                    {saleDetail.discount_amount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Discount</span>
                        <span className="font-mono">-Rs {saleDetail.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {saleDetail.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span className="font-mono">Rs {saleDetail.tax_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-2 text-base">
                      <span>Grand Total</span>
                      <span className="font-mono">Rs {saleDetail.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-700">
                      <span>Amount Paid</span>
                      <span className="font-mono">Rs {saleDetail.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Balance Owed</span>
                      <span className="font-mono">Rs {Math.max(0, saleDetail.total_amount - saleDetail.amount_paid).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Print Action */}
                  <button
                    onClick={() => handlePrint(saleDetail)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Printer size={16} />
                    Print Receipt Invoice
                  </button>

                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
