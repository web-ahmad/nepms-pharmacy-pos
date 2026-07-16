'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreatePurchaseRequest } from '../services/purchase.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Medicine } from '@/features/inventory/types/inventory';
import { MedicineSearchDropdown } from './MedicineSearchDropdown';
import {
  Plus, Trash2, Search, ChevronDown, PackageSearch, Loader2,
  AlertTriangle, Save, Send, Sparkles, Package, ArrowLeft,
  Hash, TrendingUp, Shield, Zap, X, CheckCircle2, FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestRow {
  id: string;
  medicine: Medicine | null;
  quantity_requested: number;
  suggested_qty: number;
  unit: string;
  remarks: string;
}

function makeRow(): RequestRow {
  return {
    id: crypto.randomUUID(),
    medicine: null,
    quantity_requested: 1,
    suggested_qty: 0,
    unit: '',
    remarks: '',
  };
}

// ─── Priority Config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, {
  icon: React.ElementType;
  activeGradient: string;
  activeShadow: string;
  activeText: string;
  inactiveText: string;
  ring: string;
}> = {
  Low:    { icon: Shield,     activeGradient: 'from-slate-500 to-slate-600',    activeShadow: 'shadow-slate-200',  activeText: 'text-white', inactiveText: 'text-slate-500', ring: 'ring-slate-300' },
  Normal: { icon: Hash,       activeGradient: 'from-blue-500 to-blue-600',      activeShadow: 'shadow-blue-100',   activeText: 'text-white', inactiveText: 'text-blue-500',  ring: 'ring-blue-200'  },
  High:   { icon: TrendingUp, activeGradient: 'from-amber-500 to-orange-500',   activeShadow: 'shadow-amber-100',  activeText: 'text-white', inactiveText: 'text-amber-600', ring: 'ring-amber-200' },
  Urgent: { icon: Zap,        activeGradient: 'from-red-500 to-rose-600',       activeShadow: 'shadow-red-100',    activeText: 'text-white', inactiveText: 'text-red-500',   ring: 'ring-red-200'   },
};

// ─── Priority Selector ────────────────────────────────────────────────────────

function PrioritySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map(p => {
        const cfg = PRIORITY_CONFIG[p];
        const Icon = cfg.icon;
        const active = value === p;
        return (
          <motion.button
            key={p}
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(p)}
            className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
              active
                ? `bg-gradient-to-br ${cfg.activeGradient} ${cfg.activeText} border-transparent shadow-md ${cfg.activeShadow}`
                : `bg-white ${cfg.inactiveText} border-slate-200 hover:border-slate-300 hover:bg-slate-50`
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
            <span>{p}</span>
            {active && (
              <motion.div
                layoutId="priority-indicator"
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-70"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSuggestedQty(med: Medicine): number {
  if (!med) return 0;
  const gap = med.reorder_level - med.total_quantity;
  return Math.max(0, gap > 0 ? gap + (med.min_stock_level || 0) : 0);
}

// ─── Read-Only Cell ───────────────────────────────────────────────────────────

type CellVariant = 'default' | 'stock-ok' | 'stock-low' | 'stock-out' | 'suggested';

function ReadCell({ children, variant = 'default' }: { children: React.ReactNode; variant?: CellVariant }) {
  const styles: Record<CellVariant, string> = {
    default:     'bg-slate-50 text-slate-400 border-slate-100',
    'stock-ok':  'bg-emerald-50 text-emerald-700 border-emerald-100',
    'stock-low': 'bg-amber-50 text-amber-700 border-amber-100',
    'stock-out': 'bg-red-50 text-red-700 border-red-100',
    suggested:   'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div className={`h-8 flex items-center justify-center px-2 rounded-lg text-[11px] font-semibold min-w-[52px] border ${styles[variant]}`}>
      {children}
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────────────────

interface RequestRowItemProps {
  row: RequestRow;
  rowIndex: number;
  disabledIds: string[];
  onMedicineChange: (med: Medicine | null) => void;
  onQtyChange: (val: number) => void;
  onRemarksChange: (val: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function RequestRowItem({
  row, rowIndex, disabledIds,
  onMedicineChange, onQtyChange, onRemarksChange,
  onRemove, canRemove,
}: RequestRowItemProps) {
  const med = row.medicine;
  const stockOk  = med && med.total_quantity > med.reorder_level;
  const stockLow = med && med.total_quantity > 0 && med.total_quantity <= med.reorder_level;
  const stockOut = med && med.total_quantity <= 0;

  const stockVariant: CellVariant = stockOut ? 'stock-out' : stockLow ? 'stock-low' : stockOk ? 'stock-ok' : 'default';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.18 }}
      className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors duration-150"
    >
      {/* Index */}
      <td className="pl-4 pr-2 py-2.5 w-8 text-center">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
          {rowIndex + 1}
        </span>
      </td>

      {/* Medicine */}
      <td className="px-2 py-2.5 min-w-[220px]">
        <MedicineSearchDropdown value={row.medicine} onChange={onMedicineChange} disabledIds={disabledIds} />
      </td>

      {/* Unit */}
      <td className="px-2 py-2.5 text-center w-20">
        <ReadCell>{med?.base_unit ?? <span className="text-slate-300">—</span>}</ReadCell>
      </td>

      {/* Current Stock */}
      <td className="px-2 py-2.5 text-center w-28">
        <ReadCell variant={stockVariant}>
          {med != null ? (
            <span className="flex items-center gap-1">
              {stockOut && <AlertTriangle size={10} />}
              {med.total_quantity}
            </span>
          ) : <span className="text-slate-300">—</span>}
        </ReadCell>
      </td>

      {/* Reorder Level */}
      <td className="px-2 py-2.5 text-center w-28">
        <ReadCell>{med != null ? med.reorder_level : <span className="text-slate-300">—</span>}</ReadCell>
      </td>

      {/* Suggested Qty */}
      <td className="px-2 py-2.5 text-center w-28">
        <ReadCell variant="suggested">
          {med != null
            ? (row.suggested_qty > 0
                ? <span className="flex items-center gap-1"><Sparkles size={9} />{row.suggested_qty}</span>
                : <span className="text-blue-300">—</span>)
            : <span className="text-slate-300">—</span>}
        </ReadCell>
      </td>

      {/* Qty to Order */}
      <td className="px-2 py-2.5 text-center w-28">
        <input
          type="number"
          min={1}
          value={row.quantity_requested}
          onChange={e => onQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-center font-bold text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-150 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </td>

      {/* Row Remarks */}
      <td className="px-2 py-2.5 min-w-[140px]">
        <input
          type="text"
          placeholder="Optional note…"
          value={row.remarks}
          onChange={e => onRemarksChange(e.target.value)}
          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 placeholder-slate-300 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-150 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </td>

      {/* Remove */}
      <td className="px-3 py-2.5 text-center w-10">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remove row"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
      {children} {required && <span className="text-red-400 normal-case tracking-normal text-[11px]">*</span>}
    </label>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function PurchaseRequestForm() {
  const router = useRouter();
  const createRequest = useCreatePurchaseRequest();

  const [priority, setPriority] = useState('Normal');
  const [remarks, setRemarks] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [rows, setRows] = useState<RequestRow[]>([makeRow()]);
  const [submittingAs, setSubmittingAs] = useState<'Draft' | 'Submitted' | null>(null);

  const addRow = useCallback(() => setRows(prev => [...prev, makeRow()]), []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const updateRow = useCallback(<K extends keyof RequestRow>(id: string, key: K, value: RequestRow[K]) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
  }, []);

  const handleMedicineChange = useCallback((id: string, med: Medicine | null) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (!med) return { ...r, medicine: null, unit: '', suggested_qty: 0 };
      const suggested = getSuggestedQty(med);
      return {
        ...r,
        medicine: med,
        unit: med.base_unit || '',
        suggested_qty: suggested,
        quantity_requested: suggested > 0 ? suggested : r.quantity_requested,
      };
    }));
  }, []);

  const selectedIds = rows.map(r => r.medicine?.id).filter(Boolean) as string[];

  const validate = () => {
    if (rows.find(r => !r.medicine)) { toast.error('Please select a medicine for all rows.'); return false; }
    if (rows.find(r => r.quantity_requested < 1)) { toast.error('Quantity must be at least 1 for all items.'); return false; }
    return true;
  };

  const buildPayload = (status: 'Draft' | 'Submitted') => ({
    priority,
    status,
    remarks: remarks || undefined,
    required_date: requiredDate || undefined,
    items: rows.map(r => ({
      medicine_id: r.medicine!.id,
      quantity_requested: r.quantity_requested,
      remarks: r.remarks || undefined,
    })),
  });

  const handleAction = async (status: 'Draft' | 'Submitted', e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSubmittingAs(status);
    try {
      await createRequest.mutateAsync(buildPayload(status));
      toast.success(status === 'Draft' ? '✓ Saved as Draft' : '✓ Request Submitted');
      router.push('/purchase/requests');
    } catch (err: any) {
      toast.error(parseApiError(err));
    } finally {
      setSubmittingAs(null);
    }
  };

  const filledRows = rows.filter(r => r.medicine !== null).length;
  const totalQty   = rows.reduce((s, r) => s + r.quantity_requested, 0);

  return (
    <form onSubmit={e => handleAction('Submitted', e)} className="space-y-5">

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-4"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical size={20} className="text-blue-500" />
            New Purchase Request
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Request medicines to replenish your branch inventory</p>
        </div>
      </motion.div>

      {/* ── Config Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Card Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
            <Hash size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Request Configuration</h2>
            <p className="text-[11px] text-slate-500">Set priority, expected date and overall remarks</p>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority */}
          <div className="lg:col-span-1">
            <FieldLabel required>Priority</FieldLabel>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <FieldLabel>Expected Delivery Date</FieldLabel>
            <input
              type="date"
              value={requiredDate}
              onChange={e => setRequiredDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          {/* Remarks */}
          <div>
            <FieldLabel>Overall Remarks</FieldLabel>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Add a note for this request…"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Items Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Items Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <Package size={13} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Request Items</h3>
              <p className="text-[11px] text-slate-500">
                {filledRows} of {rows.length} selected · {totalQty} total units
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={addRow}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:shadow-blue-300 hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
          >
            <Plus size={13} /> Add Medicine
          </motion.button>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-sm" style={{ minWidth: 860 }}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                <th className="pl-4 pr-2 py-3 w-8" />
                <th className="px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 min-w-[220px]">Medicine</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-20">Unit</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28">Current Stock</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28">Reorder Lvl</th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28">
                  <span className="inline-flex items-center gap-1"><Sparkles size={8} className="text-blue-400" />Suggested</span>
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28">Qty to Order</th>
                <th className="px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 min-w-[140px]">Note</th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {rows.map((row, index) => (
                  <RequestRowItem
                    key={row.id}
                    row={row}
                    rowIndex={index}
                    disabledIds={selectedIds.filter(id => id !== row.medicine?.id)}
                    onMedicineChange={(med) => handleMedicineChange(row.id, med)}
                    onQtyChange={(val) => updateRow(row.id, 'quantity_requested', val)}
                    onRemarksChange={(val) => updateRow(row.id, 'remarks', val)}
                    onRemove={() => removeRow(row.id)}
                    canRemove={rows.length > 1}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Summary chips */}
        <AnimatePresence>
          {filledRows > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Summary:</span>
              {rows.filter(r => r.medicine).map(r => (
                <motion.span
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 shadow-sm"
                >
                  <CheckCircle2 size={9} className="text-emerald-500" />
                  {r.medicine!.name}
                  <span className="text-slate-400">×{r.quantity_requested}</span>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Action Buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="flex items-center justify-between gap-3 pt-1 pb-4"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
        >
          <ArrowLeft size={14} />
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => handleAction('Draft')}
            disabled={!!submittingAs}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingAs === 'Draft' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save as Draft
          </button>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!!submittingAs}
            whileHover={{ scale: submittingAs ? 1 : 1.02 }}
            whileTap={{ scale: submittingAs ? 1 : 0.98 }}
            className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 hover:shadow-blue-300 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 overflow-hidden"
          >
            {/* Shimmer on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            {submittingAs === 'Submitted' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit Request
          </motion.button>
        </div>
      </motion.div>
    </form>
  );
}