'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateCurrency, useUpdateCurrency, type Currency } from '@/features/super-admin/api/useCurrencies';

export function CurrencyModal({ currency, hasBase, onClose }: { currency: Currency | null; hasBase: boolean; onClose: () => void }) {
  const isEdit = !!currency;
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();

  const [code, setCode] = useState(currency?.code ?? '');
  const [name, setName] = useState(currency?.name ?? '');
  const [symbol, setSymbol] = useState(currency?.symbol ?? '');
  const [exchangeRate, setExchangeRate] = useState(String(currency?.exchange_rate ?? '1'));
  const [error, setError] = useState('');

  const isBaseCurrency = currency?.is_base ?? false;
  const saving = createCurrency.isPending || updateCurrency.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !name.trim() || !symbol.trim()) {
      setError('Code, name and symbol are required.');
      return;
    }

    const body = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      symbol: symbol.trim(),
      exchange_rate: Number(exchangeRate) || 1,
      is_base: !hasBase,
    };

    try {
      if (isEdit) {
        await updateCurrency.mutateAsync({ id: currency.id, body });
        toast.success('Currency updated');
      } else {
        await createCurrency.mutateAsync(body);
        toast.success('Currency added');
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
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--sa-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--sa-text)' }}>{isEdit ? 'Edit Currency' : 'Add Currency'}</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PKR"
                maxLength={3}
                disabled={isEdit}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase disabled:opacity-60"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Rs"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pakistani Rupee"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>
              Exchange Rate {isBaseCurrency && <span style={{ color: 'var(--sa-text-faint)' }}>(base currency is always 1)</span>}
            </label>
            <input
              type="number" step="0.000001" min="0"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              disabled={isBaseCurrency || !hasBase}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-60"
              style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
            />
            {!hasBase && !isEdit && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--sa-text-faint)' }}>This will become the base currency (rate = 1).</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--sa-surface-raised)', color: 'var(--sa-text-muted)', border: '1px solid var(--sa-border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--sa-accent)' }}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Currency'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
