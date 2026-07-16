'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import {
  useApprovePurchaseRequest,
  useConvertRequestToPO,
} from '@/features/purchase/services/purchase.api';
import PurchaseTimelineView from '@/features/purchase/components/PurchaseTimelineView';
import { QuotationComparisonView } from '@/features/purchase/components/QuotationComparisonView';
import {
  ArrowLeft, Package, Hash, Calendar, User, AlertTriangle,
  CheckCircle2, XCircle, FileText, Clock, Loader2, ShoppingCart,
  ClipboardList, Zap, Shield, TrendingUp, ArrowRight,
  Pill, BadgeCheck, ChevronRight,
} from 'lucide-react';
import { PurchaseRequest, PurchaseRequestItem } from '@/features/purchase/types/purchase';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { format } from 'date-fns';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; dot: string; description: string }> = {
  Draft:        { label: 'Draft',       icon: FileText,     className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',       dot: 'bg-slate-400',   description: 'Saved but not submitted' },
  Submitted:    { label: 'Submitted',   icon: ClipboardList,className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',           dot: 'bg-blue-500',    description: 'Awaiting review' },
  Pending:      { label: 'Pending',     icon: Clock,        className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',        dot: 'bg-amber-500',   description: 'Under approval review' },
  Approved:     { label: 'Approved',    icon: CheckCircle2, className: 'bg-green-50 text-green-700 ring-1 ring-green-200',        dot: 'bg-green-500',   description: 'Ready to convert to PO' },
  'PO Created': { label: 'PO Created',  icon: ShoppingCart, className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',     dot: 'bg-violet-500',  description: 'Purchase order generated' },
  Completed:    { label: 'Completed',   icon: BadgeCheck,   className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',  dot: 'bg-emerald-500', description: 'Fulfilled' },
  Rejected:     { label: 'Rejected',    icon: XCircle,      className: 'bg-red-50 text-red-700 ring-1 ring-red-200',              dot: 'bg-red-500',     description: 'Not approved' },
};

const PRIORITY_CONFIG: Record<string, { icon: React.ElementType; className: string; gradient: string }> = {
  Low:    { icon: Shield,     className: 'text-slate-600 bg-slate-100 ring-1 ring-slate-200',  gradient: 'from-slate-400 to-slate-500'  },
  Normal: { icon: Hash,       className: 'text-blue-700 bg-blue-50 ring-1 ring-blue-200',      gradient: 'from-blue-400 to-blue-600'    },
  High:   { icon: TrendingUp, className: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200',   gradient: 'from-amber-400 to-orange-500' },
  Urgent: { icon: Zap,        className: 'text-red-700 bg-red-50 ring-1 ring-red-200',         gradient: 'from-red-500 to-rose-600'     },
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-xl" />
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-100 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
        <div className="h-5 w-32 bg-slate-100 rounded-lg" />
        {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value, sub, iconBg }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; iconBg: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseRequestDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [converting, setConverting] = useState(false);

  const { data: req, isLoading } = useQuery<PurchaseRequest>({
    queryKey: ['purchase_requests', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/purchase/requests/${id}`);
      return res.data;
    }
  });

  const approveReq = useApprovePurchaseRequest(id);
  const convertReq = useConvertRequestToPO();

  if (isLoading) return <div className="max-w-4xl mx-auto"><LoadingSkeleton /></div>;
  if (!req) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">Request not found</p>
      <button onClick={() => router.back()} className="text-xs text-blue-600 hover:underline">← Go back</button>
    </div>
  );

  const statusCfg  = STATUS_CONFIG[req.status]  ?? STATUS_CONFIG['Draft'];
  const priorityCfg = PRIORITY_CONFIG[req.priority] ?? PRIORITY_CONFIG['Normal'];
  const StatusIcon   = statusCfg.icon;
  const PriorityIcon = priorityCfg.icon;

  const handleApprove = async () => {
    try {
      await approveReq.mutateAsync({ status: 'Approved', remarks: 'Approved' });
      toast.success('Request approved ✓');
      setConfirmAction(null);
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async () => {
    try {
      await approveReq.mutateAsync({ status: 'Rejected', remarks: 'Rejected' });
      toast.success('Request rejected');
      setConfirmAction(null);
    } catch { toast.error('Failed to reject'); }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await convertReq.mutateAsync(id);
      toast.success('Converted to Purchase Order ✓');
      router.push('/purchase/orders');
    } catch { toast.error('Failed to convert'); setConverting(false); }
  };

  const totalQty = req.items.reduce((s, i) => s + i.quantity_requested, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-8">

      {/* ── Breadcrumb & Back ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer" onClick={() => router.push('/purchase/requests')}>
            Purchase Requests
          </span>
          <ChevronRight size={12} />
          <span className="font-semibold text-slate-700 font-mono">{req.request_number}</span>
        </div>
      </motion.div>

      {/* ── Hero Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Top gradient band */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${priorityCfg.gradient}`} />

        <div className="p-6">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${priorityCfg.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                <ClipboardList size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                    {req.request_number}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusCfg.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    <StatusIcon size={10} strokeWidth={2.5} />
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{statusCfg.description}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {(req.status === 'Submitted' || req.status === 'Pending') && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setConfirmAction('reject')}
                    disabled={approveReq.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all duration-200 disabled:opacity-50"
                  >
                    <XCircle size={13} /> Reject
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setConfirmAction('approve')}
                    disabled={approveReq.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-green-200 hover:shadow-green-300 transition-all duration-200 disabled:opacity-50"
                  >
                    {approveReq.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Approve
                  </motion.button>
                </>
              )}
              {req.status === 'Approved' && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleConvert}
                  disabled={converting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:shadow-blue-300 transition-all duration-200 disabled:opacity-50"
                >
                  {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  Convert to PO
                </motion.button>
              )}
            </div>
          </div>

          {/* Meta info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <InfoCard
              icon={PriorityIcon}
              label="Priority"
              value={req.priority}
              iconBg={`bg-gradient-to-br ${priorityCfg.gradient}`}
            />
            <InfoCard
              icon={Package}
              label="Total Items"
              value={`${req.items.length} medicine${req.items.length !== 1 ? 's' : ''}`}
              sub={`${totalQty} total units`}
              iconBg="bg-gradient-to-br from-blue-400 to-blue-600"
            />
            <InfoCard
              icon={Calendar}
              label="Required By"
              value={req.required_date ? format(new Date(req.required_date), 'MMM dd, yyyy') : '—'}
              iconBg="bg-gradient-to-br from-violet-400 to-violet-600"
            />
            <InfoCard
              icon={User}
              label="Requested By"
              value={req.requested_by_name ?? (req.requested_by ? req.requested_by.substring(0, 12) + '…' : '—')}
              iconBg="bg-gradient-to-br from-slate-400 to-slate-600"
            />
          </div>

          {req.remarks && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <FileText size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700"><span className="font-semibold">Remarks: </span>{req.remarks}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Request Items ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
            <Pill size={13} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Request Items</h3>
            <p className="text-[11px] text-slate-500">{req.items.length} medicine{req.items.length !== 1 ? 's' : ''} · {totalQty} units requested</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">#</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Qty Requested</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Qty Approved</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((item: PurchaseRequestItem, i: number) => (
                <motion.tr
                  key={item.id ?? i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors duration-150"
                >
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-violet-100 border border-blue-200/60 flex items-center justify-center flex-shrink-0">
                        <Pill size={12} className="text-blue-500" />
                      </div>
                      <div>
                        {item.medicine_name ? (
                          <p className="text-xs font-semibold text-slate-800">{item.medicine_name}</p>
                        ) : (
                          <p className="text-xs font-mono text-slate-500 truncate max-w-[200px]" title={item.medicine_id}>
                            {item.medicine_id.substring(0, 8)}…
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold ring-1 ring-blue-100">
                      {item.quantity_requested}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {item.quantity_approved != null ? (
                      <span className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-100">
                        {item.quantity_approved}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.remarks
                      ? <span className="text-xs text-slate-600 italic">"{item.remarks}"</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Quotation Comparison ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <QuotationComparisonView requestId={id} />
      </motion.div>

      {/* ── Timeline ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
      >
        <PurchaseTimelineView referenceId={id} />
      </motion.div>

      {/* ── Confirm Dialog ── */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm"
            >
              <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${confirmAction === 'approve' ? 'bg-green-50' : 'bg-red-50'}`}>
                {confirmAction === 'approve'
                  ? <CheckCircle2 size={22} className="text-green-500" />
                  : <XCircle size={22} className="text-red-500" />}
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">
                {confirmAction === 'approve' ? 'Approve this request?' : 'Reject this request?'}
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1.5">
                {confirmAction === 'approve'
                  ? 'This will mark the request as Approved and allow conversion to a Purchase Order.'
                  : 'This action will reject the request and notify the requester.'}
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction === 'approve' ? handleApprove : handleReject}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200 ${
                    confirmAction === 'approve'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-sm shadow-green-200'
                      : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-sm shadow-red-200'
                  }`}
                >
                  {confirmAction === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}