'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { usePurchaseOrderDetails, useApprovePO, useCancelPO, usePO_GRNs, usePOInvoices } from '@/features/purchase/services/purchase.api';
import PurchaseOrderTimeline from '@/features/purchase/components/PurchaseOrderTimeline';
import GRNForm from '@/features/purchase/components/GRNForm';
import { ArrowLeft, CheckCircle, XCircle, PackagePlus, FileText, Package, List } from 'lucide-react';
import { format } from 'date-fns';

type TabId = 'details' | 'grns' | 'invoices';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  // RBAC 4.0: Use permission-based check, never role.name strings
  const canApprove = hasPermission('purchase_orders:approve') || hasPermission('purchase_orders:manage');
  const canReceive  = hasPermission('goods_receiving:create') || hasPermission('goods_receiving:manage');

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'cancel' | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const { data: po, isLoading } = usePurchaseOrderDetails(id);
  const { data: grns } = usePO_GRNs(id);
  const { data: invoices } = usePOInvoices(id);

  const approveMutation = useApprovePO();
  const cancelMutation = useCancelPO();

  if (isLoading) return <div className="p-8 text-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div></div>;
  if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found.</div>;

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = () => setConfirmAction('approve');
  const handleCancel = () => setConfirmAction('cancel');

  const executeAction = async () => {
    if (!confirmAction) return;
    setIsActioning(true);
    try {
      if (confirmAction === 'approve') {
        await approveMutation.mutateAsync(id);
        showToast('Purchase Order approved successfully!', 'success');
      } else {
        await cancelMutation.mutateAsync(id);
        showToast('Purchase Order cancelled.', 'success');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || `Failed to ${confirmAction} PO.`;
      showToast(message, 'error');
    } finally {
      setIsActioning(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all animate-in slide-in-from-top-2
          ${toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'}`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/purchase/orders" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              PO: {po.order_number}
              <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
                | Supplier: {po.supplier_name || po.supplier_id}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {po.status === 'Draft' && canApprove && (
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <CheckCircle size={16} /> Approve PO
            </button>
          )}
          {(po.status === 'Approved' || po.status === 'Partially Received') && canReceive && !showGRNForm && (
            <button
              onClick={() => setShowGRNForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
            >
              <PackagePlus size={16} /> Receive Goods (GRN)
            </button>
          )}
          {(po.status === 'Draft' || po.status === 'Approved') && (
            <button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <XCircle size={16} /> Cancel PO
            </button>
          )}
        </div>
      </div>

      <PurchaseOrderTimeline status={po.status} />

      {showGRNForm ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Process Goods Received Note (GRN)</h3>
          <GRNForm po={po} onSuccess={() => setShowGRNForm(false)} onCancel={() => setShowGRNForm(false)} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'details' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
              >
                <List size={16} /> Order Details
              </button>
              <button
                onClick={() => setActiveTab('grns')}
                className={`group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'grns' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
              >
                <Package size={16} /> GRNs ({grns?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'invoices' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
              >
                <FileText size={16} /> Invoices ({invoices?.length || 0})
              </button>
            </nav>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-zinc-500 dark:text-zinc-400">Total Amount</span>
                    <span className="font-mono font-bold text-lg">Rs {po.total_amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 dark:text-zinc-400">Expected Delivery</span>
                    <span>{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy') : '-'}</span>
                  </div>
                </div>

                <table className="w-full text-left text-sm mt-4">
                  <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <tr>
                      <th className="p-3 font-medium">Medicine</th>
                      <th className="p-3 font-medium text-right">Qty Ordered</th>
                      <th className="p-3 font-medium text-right">Qty Received</th>
                      <th className="p-3 font-medium text-right">Unit Price</th>
                      <th className="p-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {po.items.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="p-3 font-medium">{item.medicine_name || item.medicine_id}</td>
                        <td className="p-3 text-right">{item.quantity_ordered}</td>
                        <td className="p-3 text-right font-medium text-blue-600 dark:text-blue-400">{item.quantity_received}</td>
                        <td className="p-3 text-right font-mono">Rs {item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">Rs {(item.quantity_ordered * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Expiry SLA Watermark */}
                <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <div className="bg-red-50 border-2 border-red-200 border-dashed rounded-lg p-4 text-center dark:bg-red-950/20 dark:border-red-900/50">
                    <p className="text-red-700 dark:text-red-400 font-bold uppercase tracking-widest text-xs mb-1">STRICTLY NOTE - ENTERPRISE SLA</p>
                    <p className="text-red-600 dark:text-red-300 font-medium text-sm">Any stock with less than 12 months expiry will be rejected at the time of delivery.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'grns' && (
              <div className="space-y-4">
                {(!grns || grns.length === 0) ? (
                  <div className="text-center text-zinc-500 p-8">No GRNs recorded yet.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="p-3 font-medium">GRN Number</th>
                        <th className="p-3 font-medium">Received Date</th>
                        <th className="p-3 font-medium text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {grns.map(grn => (
                        <tr key={grn.id}>
                          <td className="p-3 font-mono font-medium">{grn.grn_number}</td>
                          <td className="p-3">{grn.received_date ? format(new Date(grn.received_date), 'yyyy-MM-dd') : '-'}</td>
                          <td className="p-3 text-right font-mono">Rs {grn.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {(!invoices || invoices.length === 0) ? (
                  <div className="text-center text-zinc-500 p-8">No invoices linked yet. Manage invoices in the Invoices tab.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="p-3 font-medium">Invoice Number</th>
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 font-medium text-right">Total</th>
                        <th className="p-3 font-medium text-right">Paid</th>
                        <th className="p-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/purchase/invoices/${inv.id}`)}
                        >
                          <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number}</td>
                          <td className="p-3">{inv.invoice_date ? format(new Date(inv.invoice_date), 'yyyy-MM-dd') : '-'}</td>
                          <td className="p-3 text-right font-mono">Rs {inv.total_amount.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">Rs {inv.amount_paid.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {/* Inline Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-950 border dark:border-zinc-800">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full mx-auto
              ${confirmAction === 'approve' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {confirmAction === 'approve'
                ? <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                : <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            </div>
            <h3 className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {confirmAction === 'approve' ? 'Approve Purchase Order?' : 'Cancel Purchase Order?'}
            </h3>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {confirmAction === 'approve'
                ? `Approve ${po?.order_number}? This will allow goods to be received against it.`
                : `Cancel ${po?.order_number}? This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isActioning}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={executeAction}
                disabled={isActioning}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50
                  ${confirmAction === 'approve'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-red-600 hover:bg-red-500'}`}
              >
                {isActioning
                  ? 'Processing...'
                  : confirmAction === 'approve' ? 'Yes, Approve' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
