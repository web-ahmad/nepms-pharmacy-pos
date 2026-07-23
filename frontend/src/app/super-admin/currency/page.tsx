'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, Pencil, Trash2, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrencies, useDeleteCurrency, useSetBaseCurrency, type Currency } from '@/features/super-admin/api/useCurrencies';
import { CurrencyModal } from './CurrencyModal';

export default function CurrencyPage() {
  const { data: currencies, isLoading, refetch, isFetching } = useCurrencies();
  const deleteCurrency = useDeleteCurrency();
  const setBaseCurrency = useSetBaseCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const hasBase = !!currencies?.some((c) => c.is_base);
  const openCreate = () => { setEditingCurrency(null); setModalOpen(true); };
  const openEdit = (c: Currency) => { setEditingCurrency(c); setModalOpen(true); };

  const handleSetBase = async (c: Currency) => {
    try {
      await setBaseCurrency.mutateAsync(c.id);
      toast.success(`${c.code} is now the base currency`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to set base currency');
    }
  };

  const handleDelete = async (c: Currency) => {
    if (!confirm(`Remove ${c.code} — ${c.name}?`)) return;
    try {
      await deleteCurrency.mutateAsync(c.id);
      toast.success('Currency removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to remove currency');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-7 sa-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Currency</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Currencies supported for pharmacy billing across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--sa-accent)' }}>
            <Plus className="w-4 h-4" />
            Add Currency
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="sa-skeleton h-14" />)}
        </div>
      ) : !currencies || currencies.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center sa-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--sa-success-muted)' }}>
              <DollarSign className="w-7 h-7" style={{ color: 'var(--sa-success)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--sa-text)' }}>No currencies configured</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--sa-text-muted)' }}>Add your first currency — it will become the platform base currency.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--sa-accent)' }}>
              <Plus className="w-4 h-4" />
              Add Currency
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sa-border)' }}>
                {['Currency', 'Symbol', 'Exchange Rate', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--sa-text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currencies.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid var(--sa-border)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold" style={{ color: 'var(--sa-text)' }}>{c.code}</span>
                      <span style={{ color: 'var(--sa-text-muted)' }}>{c.name}</span>
                      {c.is_base && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--sa-accent-muted)', color: 'var(--sa-accent)' }}>
                          <Star className="w-2.5 h-2.5" /> Base
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>{c.symbol}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--sa-text-muted)' }}>{c.exchange_rate}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: c.is_active ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)', color: c.is_active ? 'var(--sa-success)' : 'var(--sa-danger)' }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!c.is_base && (
                        <button onClick={() => handleSetBase(c)} className="text-xs font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--sa-accent)' }} title="Set as base currency">
                          Set Base
                        </button>
                      )}
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
        {modalOpen && <CurrencyModal currency={editingCurrency} hasBase={hasBase} onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
