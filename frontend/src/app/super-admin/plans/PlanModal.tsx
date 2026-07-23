'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePlan, useUpdatePlan, type Plan } from '@/features/super-admin/api/usePlans';

const successToast = (msg: string) =>
  toast.success(msg, {
    iconTheme: { primary: '#10b981', secondary: '#fff' },
    style: { borderRadius: '12px', fontWeight: 600, fontSize: '13px' },
  });

const errorToast = (msg: string) =>
  toast.error(msg, {
    style: { borderRadius: '12px', fontWeight: 600, fontSize: '13px' },
  });

type FieldErrors = Partial<Record<'name' | 'price' | 'maxBranches' | 'maxStaff', string>>;

function fieldStyle(hasError: boolean): React.CSSProperties {
  return {
    background: 'var(--sa-surface-raised)',
    border: `1px solid ${hasError ? 'var(--sa-danger)' : 'var(--sa-border)'}`,
    color: 'var(--sa-text)',
  };
}

export function PlanModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const isEdit = !!plan;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const [name, setName] = useState(plan?.name ?? '');
  const [price, setPrice] = useState(String(plan?.price ?? ''));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(plan?.billing_cycle ?? 'monthly');
  const [maxBranches, setMaxBranches] = useState(String(plan?.features_limits?.max_branches ?? ''));
  const [maxStaff, setMaxStaff] = useState(String(plan?.features_limits?.max_staff ?? ''));
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(false);

  const saving = createPlan.isPending || updatePlan.isPending;

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'Plan name is required.';
    else if (name.trim().length < 2) next.name = 'Name must be at least 2 characters.';

    if (!price) next.price = 'Price is required.';
    else if (Number.isNaN(Number(price)) || Number(price) < 0) next.price = 'Enter a valid non-negative price.';

    if (maxBranches && (Number.isNaN(Number(maxBranches)) || Number(maxBranches) < 0 || !Number.isInteger(Number(maxBranches))))
      next.maxBranches = 'Must be a whole number ≥ 0.';

    if (maxStaff && (Number.isNaN(Number(maxStaff)) || Number(maxStaff) < 0 || !Number.isInteger(Number(maxStaff))))
      next.maxStaff = 'Must be a whole number ≥ 0.';

    return next;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      triggerShake();
      return;
    }

    const features_limits: Record<string, number> = {};
    if (maxBranches) features_limits.max_branches = Number(maxBranches);
    if (maxStaff) features_limits.max_staff = Number(maxStaff);

    const body = {
      name: name.trim(),
      price: Number(price),
      billing_cycle: billingCycle,
      features_limits,
      is_active: isActive,
    };

    try {
      if (isEdit) {
        await updatePlan.mutateAsync({ id: plan.id, body });
        successToast('Plan updated');
      } else {
        await createPlan.mutateAsync(body);
        successToast('Plan created');
      }
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
      setFormError(detail);
      errorToast(detail);
      triggerShake();
    }
  };

  return (
    <div
      className="sa-theme-green fixed inset-0 z-50 flex items-center justify-center p-4 sa-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl overflow-hidden ${shake ? 'sa-shake' : ''}`}
        style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--sa-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sa-accent-muted)' }}>
              <CreditCard className="w-4 h-4" style={{ color: 'var(--sa-accent)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--sa-text)' }}>
              {isEdit ? 'Edit Plan' : 'Create Plan'}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'var(--sa-danger-muted)', color: 'var(--sa-danger)' }}
            >
              {formError}
            </motion.div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Plan Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="e.g. Pro"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={fieldStyle(!!errors.name)}
            />
            {errors.name && <p className="text-[11px] mt-1" style={{ color: 'var(--sa-danger)' }}>{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Price</label>
              <input
                type="number" step="0.01" min="0"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: undefined })); }}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={fieldStyle(!!errors.price)}
              />
              {errors.price && <p className="text-[11px] mt-1" style={{ color: 'var(--sa-danger)' }}>{errors.price}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={fieldStyle(false)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Max Branches</label>
              <input
                type="number" min="0"
                value={maxBranches}
                onChange={(e) => { setMaxBranches(e.target.value); setErrors((p) => ({ ...p, maxBranches: undefined })); }}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={fieldStyle(!!errors.maxBranches)}
              />
              {errors.maxBranches && <p className="text-[11px] mt-1" style={{ color: 'var(--sa-danger)' }}>{errors.maxBranches}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Max Staff</label>
              <input
                type="number" min="0"
                value={maxStaff}
                onChange={(e) => { setMaxStaff(e.target.value); setErrors((p) => ({ ...p, maxStaff: undefined })); }}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={fieldStyle(!!errors.maxStaff)}
              />
              {errors.maxStaff && <p className="text-[11px] mt-1" style={{ color: 'var(--sa-danger)' }}>{errors.maxStaff}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: 'var(--sa-accent)' }}
            />
            <span className="text-sm" style={{ color: 'var(--sa-text)' }}>Active</span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--sa-surface-raised)', color: 'var(--sa-text-muted)', border: '1px solid var(--sa-border)' }}
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              type="submit"
              disabled={saving}
              className="sa-glow flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'var(--sa-accent)' }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Plan'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
