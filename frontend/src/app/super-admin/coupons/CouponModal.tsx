'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateCoupon, useUpdateCoupon, type Coupon } from '@/features/super-admin/api/useCoupons';

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function CouponModal({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const isEdit = !!coupon;
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const [code, setCode] = useState(coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(coupon?.discount_type ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(String(coupon?.discount_value ?? ''));
  const [maxRedemptions, setMaxRedemptions] = useState(String(coupon?.max_redemptions ?? ''));
  const [validUntil, setValidUntil] = useState(toDateInput(coupon?.valid_until ?? null));
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [error, setError] = useState('');

  const saving = createCoupon.isPending || updateCoupon.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !discountValue) {
      setError('Code and discount value are required.');
      return;
    }

    const body = {
      code: code.trim(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      is_active: isActive,
    };

    try {
      if (isEdit) {
        await updateCoupon.mutateAsync({ id: coupon.id, body });
        toast.success('Coupon updated');
      } else {
        await createCoupon.mutateAsync(body);
        toast.success('Coupon created');
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sa-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--sa-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--sa-text)' }}>{isEdit ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--sa-danger-muted)', color: 'var(--sa-danger)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Coupon Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LAUNCH10"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase"
              style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Launch promo — 10% off first month"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>
                {discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
              </label>
              <input
                type="number" step="0.01" min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Max Redemptions</label>
              <input
                type="number" min="0"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <span className="text-sm" style={{ color: 'var(--sa-text)' }}>Active</span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--sa-surface-raised)', color: 'var(--sa-text-muted)', border: '1px solid var(--sa-border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--sa-accent)' }}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
