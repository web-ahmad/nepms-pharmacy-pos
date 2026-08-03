'use client';

import { useState } from 'react';
import { HandCoins, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyAdvances, useRequestAdvance } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill, rs,
  Overlay, ModalPanel, inputCls, labelCls, primaryBtn, ghostBtn, noteCls, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

export default function MyAdvancesPage() {
  const { data, isLoading } = useMyAdvances();
  const [open, setOpen] = useState(false);

  const rows = data ?? [];
  const pending = rows.filter((a) => a.status === 'Pending');
  const approved = rows.filter((a) => a.status === 'Approved' || a.status === 'Paid');

  return (
    <div className="space-y-6">
      <EssHeader
        icon={HandCoins}
        title="My Advances"
        subtitle="Your advance salary requests"
        action={
          <button onClick={() => setOpen(true)} className={primaryBtn}>
            <Plus size={16} /> Request Advance
          </button>
        }
      />

      <StatCards
        items={[
          { label: 'Total Requests', value: rows.length },
          { label: 'Pending', value: pending.length },
          { label: 'Approved Amount', value: rs(approved.reduce((s, a) => s + (a.amount || 0), 0)) },
        ]}
      />

      <TableShell headers={['Amount', 'Requested On', 'Deduct From', 'Reason', 'Status']}>
        {isLoading ? (
          <LoadingRow colSpan={5} />
        ) : !rows.length ? (
          <EmptyRow colSpan={5} text="You haven't requested any advance yet." />
        ) : (
          rows.map((a) => (
            <tr key={a.id} className={rowCls}>
              <td className={`${cellCls} font-bold text-zinc-900 dark:text-zinc-100`}>{rs(a.amount)}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{a.request_date || '—'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{a.deduction_month || '—'}</td>
              <td className={`${cellCls} max-w-xs truncate text-zinc-500 dark:text-zinc-400`}>{a.reason || '—'}</td>
              <td className={cellCls}>
                <StatusPill value={a.status} />
                {a.status === 'Rejected' && a.rejection_reason && (
                  <p className="mt-1 max-w-[220px] text-xs text-red-500">{a.rejection_reason}</p>
                )}
              </td>
            </tr>
          ))
        )}
      </TableShell>

      {open && <RequestAdvanceModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function RequestAdvanceModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const defaultMonth = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const [form, setForm] = useState({ amount: '', deduction_month: defaultMonth, reason: '' });
  const request = useRequestAdvance();

  const submit = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return; }
    request.mutate(
      { amount, deduction_month: form.deduction_month, reason: form.reason },
      {
        onSuccess: () => { toast.success('Advance request submitted.'); onClose(); },
        onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not submit request.'),
      },
    );
  };

  return (
    <Overlay onClose={onClose}>
      <ModalPanel>
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Request Advance Salary</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Amount (Rs)</label>
            <input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 5000" className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>Deduct from month</label>
            <input value={form.deduction_month} onChange={(e) => setForm({ ...form, deduction_month: e.target.value })}
              placeholder="MM-YYYY" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Why do you need this advance?" className={`${inputCls} resize-none`} />
          </div>
          <p className={noteCls}>Your request goes to HR as <b>Pending</b> — you can&apos;t approve it yourself.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={onClose} className={ghostBtn}>Cancel</button>
          <button onClick={submit} disabled={request.isPending} className={primaryBtn}>
            {request.isPending && <Loader2 size={15} className="animate-spin" />} Submit Request
          </button>
        </div>
      </ModalPanel>
    </Overlay>
  );
}
