'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Pencil, Trash2, RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCoupons, useDeleteCoupon, type Coupon } from '@/features/super-admin/api/useCoupons';
import { CouponModal } from './CouponModal';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export default function CouponsPage() {
  const { data: coupons, isLoading, refetch, isFetching } = useCoupons();
  const deleteCoupon = useDeleteCoupon();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const openCreate = () => { setEditingCoupon(null); setModalOpen(true); };
  const openEdit = (c: Coupon) => { setEditingCoupon(c); setModalOpen(true); };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await deleteCoupon.mutateAsync(c.id);
      toast.success('Coupon deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to delete coupon');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-7 sa-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Coupons</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Promotional discount codes for pharmacy subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--sa-accent)' }}>
            <Plus className="w-4 h-4" />
            New Coupon
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sa-skeleton h-14" />)}
        </div>
      ) : !coupons || coupons.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center sa-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--sa-warning-muted)' }}>
              <Tag className="w-7 h-7" style={{ color: 'var(--sa-warning)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--sa-text)' }}>No coupons yet</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--sa-text-muted)' }}>Create a discount code to promote pharmacy sign-ups.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--sa-accent)' }}>
              <Plus className="w-4 h-4" />
              New Coupon
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sa-border)' }}>
                {['Code', 'Discount', 'Usage', 'Valid Until', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--sa-text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid var(--sa-border)' }}
                >
                  <td className="px-4 py-3">
                    <button onClick={() => handleCopy(c.code)} className="flex items-center gap-1.5 font-mono font-semibold" style={{ color: 'var(--sa-text)' }}>
                      {c.code}
                      <Copy className="w-3 h-3" style={{ color: 'var(--sa-text-faint)' }} />
                    </button>
                    {c.description && <p className="text-xs mt-0.5" style={{ color: 'var(--sa-text-faint)' }}>{c.description}</p>}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>
                    {c.times_redeemed}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>{formatDate(c.valid_until)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: c.is_active ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)', color: c.is_active ? 'var(--sa-success)' : 'var(--sa-danger)' }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)' }} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-danger)' }} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <CouponModal coupon={editingCoupon} onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
