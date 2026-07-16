'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePurchaseRequests } from '../services/purchase.api';
import {
  Eye, Plus, Search, ClipboardList, Package, Clock,
  CheckCircle2, XCircle, FileText, AlertCircle,
  ArrowUpRight, Hash, ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { PurchaseRequest } from '../types/purchase';

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  className: string;
  dot: string;
}> = {
  Draft:        { label: 'Draft',      icon: FileText,      className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',      dot: 'bg-slate-400'   },
  Submitted:    { label: 'Submitted',  icon: ClipboardList, className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',          dot: 'bg-blue-500'    },
  Pending:      { label: 'Pending',    icon: Clock,         className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-500'   },
  Approved:     { label: 'Approved',   icon: CheckCircle2,  className: 'bg-green-50 text-green-700 ring-1 ring-green-200',       dot: 'bg-green-500'   },
  'PO Created': { label: 'PO Created', icon: Package,       className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',    dot: 'bg-violet-500'  },
  Completed:    { label: 'Completed',  icon: CheckCircle2,  className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  Rejected:     { label: 'Rejected',   icon: XCircle,       className: 'bg-red-50 text-red-700 ring-1 ring-red-200',             dot: 'bg-red-500'     },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['Draft'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.06 }}
      className="border-b border-slate-100"
    >
      {[220, 140, 70, 100].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3.5 rounded-full bg-slate-100 animate-pulse" style={{ width: w }} />
        </td>
      ))}
      <td className="px-5 py-4">
        <div className="h-3.5 w-14 rounded-full bg-slate-100 animate-pulse ml-auto" />
      </td>
    </motion.tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <td colSpan={5} className="py-20 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 flex items-center justify-center">
            {hasSearch
              ? <Search size={22} className="text-blue-400" />
              : <ShoppingCart size={22} className="text-blue-400" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {hasSearch ? 'No requests match your search' : 'No purchase requests yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {hasSearch ? 'Try a different request number' : 'Create your first purchase request to get started'}
            </p>
          </div>
          {!hasSearch && (
            <Link
              href="/purchase/requests/create"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:shadow-blue-300 hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
            >
              <Plus size={13} /> Create Request
            </Link>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({ req, index }: { req: PurchaseRequest; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, delay: index * 0.035 }}
      className="group border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors duration-150"
    >
      {/* Request Number */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-violet-100 border border-blue-200/60 flex items-center justify-center flex-shrink-0">
            <Hash size={12} className="text-blue-500" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
            {req.request_number}
          </span>
        </div>
      </td>

      {/* Requested By */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-white">
              {req.requested_by_name
                ? req.requested_by_name.substring(0, 2).toUpperCase()
                : req.requested_by
                  ? req.requested_by.substring(0, 2).toUpperCase()
                  : '??'}
            </span>
          </div>
          <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">
            {req.requested_by_name ?? (req.requested_by ? req.requested_by.substring(0, 8) + '…' : '—')}
          </span>
        </div>
      </td>


      {/* Items Count */}
      <td className="px-5 py-3.5 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
          <Package size={10} className="text-slate-400" />
          {req.items.length}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5 text-center">
        <StatusBadge status={req.status} />
      </td>

      {/* Action */}
      <td className="px-5 py-3.5 text-right">
        <Link
          href={`/purchase/requests/${req.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150"
          title="View Details"
        >
          <Eye size={12} />
          View
          <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseRequestTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: requests, isLoading, isError } = usePurchaseRequests();

  const filtered = (requests ?? []).filter(req =>
    req.request_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total',    value: requests?.length ?? 0,                                                       icon: ClipboardList, color: 'from-blue-500 to-blue-600',   shadow: 'shadow-blue-100',   bg: 'bg-blue-50',   ring: 'ring-blue-100',   text: 'text-blue-600' },
    { label: 'Pending',  value: requests?.filter(r => r.status === 'Submitted' || r.status === 'Pending').length ?? 0, icon: Clock,         color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-100',  bg: 'bg-amber-50',  ring: 'ring-amber-100',  text: 'text-amber-600' },
    { label: 'Approved', value: requests?.filter(r => r.status === 'Approved').length ?? 0,                  icon: CheckCircle2,  color: 'from-emerald-500 to-green-500',shadow: 'shadow-emerald-100',bg: 'bg-emerald-50',ring: 'ring-emerald-100',text: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Stats Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-3 gap-4"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm ${stat.shadow} flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 leading-none">
                  {isLoading
                    ? <span className="inline-block w-6 h-5 rounded bg-slate-100 animate-pulse" />
                    : stat.value}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by request number…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 h-9 text-sm border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
            />
          </div>
          <Link
            href="/purchase/requests/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:shadow-blue-300 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 flex-shrink-0"
          >
            <Plus size={13} />
            New Request
          </Link>
        </div>

        {/* Error Banner */}
        {isError && (
          <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-100">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">Failed to load purchase requests. Please refresh.</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  { label: 'Request #', align: 'text-left' },
                  { label: 'Requested By', align: 'text-left' },
                  { label: 'Items', align: 'text-center' },
                  { label: 'Status', align: 'text-center' },
                  { label: '', align: 'text-right' },
                ].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${h.align}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                  : filtered.length === 0
                  ? <EmptyState hasSearch={searchTerm.length > 0} />
                  : filtered.map((req, i) => <TableRow key={req.id} req={req} index={i} />)
                }
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{' '}
              <span className="font-semibold text-slate-600">{requests?.length ?? 0}</span> requests
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
