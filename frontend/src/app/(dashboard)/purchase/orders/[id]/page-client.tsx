'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { usePurchaseOrderDetails, useApprovePO, useCancelPO, usePO_GRNs, usePOInvoices, useSupplierDetails } from '@/features/purchase/services/purchase.api';
import PurchaseOrderTimeline from '@/features/purchase/components/PurchaseOrderTimeline';
import GRNForm from '@/features/purchase/components/GRNForm';
import { ArrowLeft, CheckCircle, XCircle, PackagePlus, FileText, Package, List, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings, useInvoiceTemplate, resolveAssetUrl } from '@/features/settings/services/settings.api';

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

  // Print config (logo / accent / identity) for the Purchase Order document.
  const { data: settings } = useSettings();
  const template = useInvoiceTemplate();
  const { data: supplier } = useSupplierDetails(po?.supplier_id || 'new');

  if (isLoading) return <div className="p-8 text-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div></div>;
  if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found.</div>;

  const company = settings?.company_settings || {};
  const accent = template.header_color || '#2563eb';
  const companyName = company.name || 'Pharvix Pharmacy';
  const companyAddress = [company.address, company.city, company.country].filter(Boolean).join(', ') || 'Pharvix Pharmacy Management System';
  const companyLogo = template.show_logo ? resolveAssetUrl(company.logo_url) : '';
  const cPhone = (company as any).phone;
  const cEmail = (company as any).email;
  const onAccent = (() => {
    const h = accent.replace('#', '');
    if (h.length < 6) return '#ffffff';
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#111827' : '#ffffff';
  })();

  const handlePrintPO = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const poNo = po.order_number || 'N/A';
    const poDate = (po as any).created_at ? format(new Date((po as any).created_at), 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy');
    const expDate = po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy') : '—';
    const totalQty = po.items.reduce((s, it) => s + (it.quantity_ordered || 0), 0);
    const statusCls = po.status === 'Completed' ? 'status-paid' : po.status === 'Cancelled' ? 'status-unpaid' : 'status-partial';
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>Purchase Order ${poNo}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        html, body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; padding:40px; color:#1e293b; background:#fff; font-size:14px; }
        .card { border:2px solid #0f172a; border-radius:14px; padding:32px 34px; }
        .head { display:flex; justify-content:space-between; align-items:center; gap:24px; }
        .title { display:inline-block; background:${accent}; color:${onAccent}; font-size:18px; font-weight:800; letter-spacing:0.12em; padding:10px 22px; border-radius:8px; }
        .rule { height:3px; background:${accent}; border-radius:3px; margin:16px 0 26px; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:22px; }
        .box { border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px; background:#f8fafc; }
        .lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:${accent}; margin-bottom:6px; }
        .val { font-size:16px; font-weight:700; color:#0f172a; }
        .muted { font-size:13px; color:#64748b; margin-top:3px; }
        .strip { border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px; background:#f8fafc; margin-bottom:28px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .mlbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8; }
        .mval { font-size:14px; font-weight:600; color:#0f172a; margin-top:2px; }
        .badge { display:inline-block; padding:4px 14px; border-radius:999px; font-size:11px; font-weight:800; text-transform:uppercase; }
        .status-paid{background:#dcfce7;color:#15803d;} .status-unpaid{background:#fee2e2;color:#b91c1c;} .status-partial{background:#fef9c3;color:#a16207;}
        table { width:100%; border-collapse:collapse; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; }
        thead th { background:${accent}; color:${onAccent}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; padding:11px 14px; text-align:left; }
        tbody td { padding:11px 14px; border-bottom:1px solid #eef2f7; font-size:13.5px; color:#334155; }
        tbody tr:nth-child(even){ background:#f8fafc; }
        tbody tr:last-child td{ border-bottom:none; }
        .r{text-align:right;} .mono{font-family:monospace;}
        .bottom { display:flex; justify-content:space-between; gap:28px; align-items:flex-start; margin-top:22px; }
        .note { flex:1; max-width:380px; }
        .note-title { font-weight:800; color:#b91c1c; text-transform:uppercase; font-size:11px; letter-spacing:0.06em; }
        .note-body { font-size:12px; color:#b91c1c; line-height:1.6; margin-top:4px; }
        .tot { width:280px; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
        .tot-row { display:flex; justify-content:space-between; padding:14px 18px; }
        .tot-grand { background:${accent}; color:${onAccent}; font-weight:800; font-size:16px; }
        .sign { margin-top:40px; display:flex; justify-content:space-between; gap:40px; }
        .sign-col { text-align:center; flex:1; }
        .sign-line { border-top:1px solid #94a3b8; padding-top:6px; font-size:11px; color:#64748b; }
        .foot { margin-top:34px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }
        @media print { body{padding:16px;} * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } }
      </style></head>
      <body>
        <div class="card">
          <div class="head">
            <div>${companyLogo
              ? `<img src="${companyLogo}" alt="Logo" style="height:66px;width:auto;max-width:230px;object-fit:contain;" />`
              : `<div style="height:60px;width:60px;border-radius:14px;background:${accent};color:${onAccent};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;">${companyName.charAt(0).toUpperCase()}</div>`}</div>
            <div style="text-align:right;">
              <div class="title">PURCHASE ORDER</div>
              <div style="font-size:12px;color:#64748b;margin-top:8px;font-family:monospace;">No. ${poNo}</div>
            </div>
          </div>
          <div class="rule"></div>

          <div class="grid2">
            <div class="box">
              <div class="lbl">Ship To (Pharmacy)</div>
              <div class="val">${companyName}</div>
              <div class="muted">${companyAddress}</div>
              ${cPhone ? `<div class="muted">Phone: ${cPhone}</div>` : ''}
              ${cEmail ? `<div class="muted">Email: ${cEmail}</div>` : ''}
            </div>
            <div class="box">
              <div class="lbl">Vendor (Supplier)</div>
              <div class="val">${supplier?.name || po.supplier_name || po.supplier_id || '—'}</div>
              ${supplier?.phone ? `<div class="muted">Phone: ${supplier.phone}</div>` : ''}
              ${supplier?.email ? `<div class="muted">Email: ${supplier.email}</div>` : ''}
              ${supplier?.address ? `<div class="muted">Address: ${supplier.address}</div>` : ''}
            </div>
          </div>

          <div class="strip">
            <div><div class="mlbl">PO Date</div><div class="mval">${poDate}</div></div>
            <div><div class="mlbl">Expected Delivery</div><div class="mval">${expDate}</div></div>
            <div><div class="mlbl">Status</div><div style="margin-top:3px;"><span class="badge ${statusCls}">${po.status}</span></div></div>
          </div>

          <table>
            <thead><tr>
              <th style="width:70px;">S. No.</th>
              <th>Medicine / Product</th>
              <th class="r">Quantity Ordered</th>
            </tr></thead>
            <tbody>
              ${po.items.map((item, i) => `<tr>
                <td class="mono">${i + 1}</td>
                <td style="font-weight:600;color:#0f172a;">${item.medicine_name || item.medicine_id}</td>
                <td class="r mono" style="font-weight:700;color:#0f172a;">${item.quantity_ordered}</td>
              </tr>`).join('')}
              <tr style="background:#f1f5f9;">
                <td></td>
                <td style="font-weight:800;color:#0f172a;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">Total Quantity</td>
                <td class="r mono" style="font-weight:800;color:#0f172a;">${totalQty} units</td>
              </tr>
            </tbody>
          </table>

          <div class="bottom">
            <div class="note" style="max-width:none;">
              <div class="note-title">Strictly Note — Enterprise SLA</div>
              <div class="note-body">Any stock with less than 12 months expiry will be rejected at the time of delivery. Please supply strictly against this Purchase Order reference. Prices will be settled against your delivered invoice.</div>
            </div>
          </div>

          <div class="sign">
            <div class="sign-col"><div style="height:44px;"></div><div class="sign-line">Authorised By (${companyName})</div></div>
            <div class="sign-col"><div style="height:44px;"></div><div class="sign-line">Supplier Acknowledgement</div></div>
          </div>

          <div class="foot">
            <span>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</span>
            <span style="font-style:italic;">${companyName} — Powered by Pharvix</span>
          </div>
        </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

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
          {['Approved', 'Partially Received', 'Completed'].includes(po.status) && (
            <button
              onClick={handlePrintPO}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <Printer size={16} /> Print PO
            </button>
          )}
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
                    <span className="block text-zinc-500 dark:text-zinc-400">Total Quantity</span>
                    <span className="font-mono font-bold text-lg">{po.items.reduce((s, i) => s + i.quantity_ordered, 0)} units</span>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {po.items.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="p-3 font-medium">{item.medicine_name || item.medicine_id}</td>
                        <td className="p-3 text-right">{item.quantity_ordered}</td>
                        <td className="p-3 text-right font-medium text-blue-600 dark:text-blue-400">{item.quantity_received}</td>
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
