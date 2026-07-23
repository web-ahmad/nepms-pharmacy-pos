'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Pencil, Trash2, Users, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlans, useDeletePlan, type Plan } from '@/features/super-admin/api/usePlans';
import { PlanModal } from './PlanModal';
import { ConfirmDialog } from './ConfirmDialog';

const successToast = (msg: string) =>
  toast.success(msg, {
    iconTheme: { primary: '#10b981', secondary: '#fff' },
    style: { borderRadius: '12px', fontWeight: 600, fontSize: '13px' },
  });

const errorToast = (msg: string) =>
  toast.error(msg, {
    style: { borderRadius: '12px', fontWeight: 600, fontSize: '13px' },
  });

function PlanCard({ plan, index, onEdit, onDelete }: { plan: Plan; index: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.32, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-5 flex flex-col overflow-hidden group"
      style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(90deg, var(--sa-accent), var(--sa-accent-hover))' }}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ background: 'var(--sa-accent-muted)' }}
          >
            <CreditCard className="w-4 h-4" style={{ color: 'var(--sa-accent)' }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--sa-text)' }}>{plan.name}</h3>
            <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--sa-text-faint)' }}>{plan.billing_cycle}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
          style={{
            background: plan.is_active ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)',
            color: plan.is_active ? 'var(--sa-success)' : 'var(--sa-danger)',
          }}
        >
          {plan.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-bold" style={{ color: 'var(--sa-text)' }}>${plan.price.toFixed(2)}</span>
        <span className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>/ {plan.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span>
      </div>

      <div className="space-y-1.5 mb-4 flex-1">
        {plan.features_limits?.max_branches !== undefined && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--sa-text-muted)' }}>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--sa-accent)' }} />
            Up to {plan.features_limits.max_branches} branches
          </p>
        )}
        {plan.features_limits?.max_staff !== undefined && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--sa-text-muted)' }}>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--sa-accent)' }} />
            Up to {plan.features_limits.max_staff} staff
          </p>
        )}
        {!plan.features_limits?.max_branches && !plan.features_limits?.max_staff && (
          <p className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>No usage limits set</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--sa-border)' }}>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sa-text-muted)' }}>
          <Users className="w-3.5 h-3.5" />
          {plan.active_pharmacy_count} subscribed
        </span>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)' }} title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-danger)' }} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PlansPage() {
  const { data: plans, isLoading, refetch, isFetching } = usePlans();
  const deletePlan = useDeletePlan();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Plan | null>(null);

  const openCreate = () => { setEditingPlan(null); setModalOpen(true); };
  const openEdit = (plan: Plan) => { setEditingPlan(plan); setModalOpen(true); };

  const handleDelete = async () => {
    if (!confirmTarget) return;
    try {
      await deletePlan.mutateAsync(confirmTarget.id);
      successToast(`"${confirmTarget.name}" deleted`);
      setConfirmTarget(null);
    } catch (err: any) {
      errorToast(err?.response?.data?.detail ?? 'Failed to delete plan');
    }
  };

  return (
    <div className="sa-theme-green p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-7 sa-fade-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Subscription Plans</h1>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--sa-accent)' }} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Manage the plans pharmacies can subscribe to.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => refetch()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="sa-glow flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-shadow"
            style={{ background: 'var(--sa-accent)' }}
          >
            <Plus className="w-4 h-4" />
            New Plan
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="sa-skeleton h-56" />)}
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--sa-accent-muted)' }}
            >
              <CreditCard className="w-7 h-7" style={{ color: 'var(--sa-accent)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--sa-text)' }}>No plans yet</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--sa-text-muted)' }}>Create your first subscription plan to get started.</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openCreate}
              className="sa-glow inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--sa-accent)' }}
            >
              <Plus className="w-4 h-4" />
              New Plan
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} index={i} onEdit={() => openEdit(plan)} onDelete={() => setConfirmTarget(plan)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <PlanModal plan={editingPlan} onClose={() => setModalOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmTarget && (
          <ConfirmDialog
            title="Delete this plan?"
            message={`"${confirmTarget.name}" will be permanently deleted. This cannot be undone.`}
            confirmLabel="Delete Plan"
            danger
            loading={deletePlan.isPending}
            onConfirm={handleDelete}
            onClose={() => setConfirmTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
