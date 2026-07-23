'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const tone = danger ? 'var(--sa-danger)' : 'var(--sa-accent)';
  const toneMuted = danger ? 'var(--sa-danger-muted)' : 'var(--sa-accent-muted)';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sa-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden p-5"
        style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: toneMuted }}>
            <AlertTriangle className="w-5 h-5" style={{ color: tone }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--sa-text)' }}>{title}</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--sa-text-muted)' }}>{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--sa-surface-raised)', color: 'var(--sa-text-muted)', border: '1px solid var(--sa-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: tone }}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
