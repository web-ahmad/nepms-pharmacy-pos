'use client';

import { useState } from 'react';
import { CalendarDays, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyLeaves, useApplyLeave } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  Overlay, ModalPanel, inputCls, labelCls, primaryBtn, ghostBtn, noteCls, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

export default function MyLeavesPage() {
  const { data, isLoading } = useMyLeaves();
  const [open, setOpen] = useState(false);

  const rows = data ?? [];
  const count = (s: string) => rows.filter((l) => l.status === s).length;

  return (
    <div className="space-y-6">
      <EssHeader
        icon={CalendarDays}
        title="My Leaves"
        subtitle="View your leave requests and submit a new one"
        action={
          <button onClick={() => setOpen(true)} className={primaryBtn}>
            <Plus size={16} /> Request Leave
          </button>
        }
      />

      <StatCards
        items={[
          { label: 'Total', value: rows.length },
          { label: 'Pending', value: count('Pending') },
          { label: 'Approved', value: count('Approved') },
          { label: 'Rejected', value: count('Rejected') },
        ]}
      />

      <TableShell headers={['Type', 'From', 'To', 'Reason', 'Status']}>
        {isLoading ? (
          <LoadingRow colSpan={5} />
        ) : !rows.length ? (
          <EmptyRow colSpan={5} text="You haven't submitted any leave requests yet." />
        ) : (
          rows.map((l) => (
            <tr key={l.id} className={rowCls}>
              <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{l.leave_type}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{l.start_date}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{l.end_date}</td>
              <td className={`${cellCls} max-w-xs truncate text-zinc-500 dark:text-zinc-400`}>{l.reason || '—'}</td>
              <td className={cellCls}>
                <StatusPill value={l.status} />
                {l.status === 'Rejected' && l.rejection_reason && (
                  <p className="mt-1 max-w-[220px] text-xs text-red-500">{l.rejection_reason}</p>
                )}
              </td>
            </tr>
          ))
        )}
      </TableShell>

      {open && <ApplyLeaveModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function ApplyLeaveModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
  const apply = useApplyLeave();

  const submit = () => {
    if (!form.start_date || !form.end_date) { toast.error('Please pick start and end dates.'); return; }
    if (form.end_date < form.start_date) { toast.error('End date cannot be before start date.'); return; }
    apply.mutate(form, {
      onSuccess: () => { toast.success('Leave request submitted.'); onClose(); },
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not submit leave request.'),
    });
  };

  return (
    <Overlay onClose={onClose}>
      <ModalPanel>
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Request Leave</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Leave type</label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} className={inputCls}>
              {['Casual', 'Sick', 'Annual', 'Unpaid', 'Emergency'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for leave…" className={`${inputCls} resize-none`} />
          </div>
          <p className={noteCls}>Your request goes to HR as <b>Pending</b> — you can&apos;t approve it yourself.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={onClose} className={ghostBtn}>Cancel</button>
          <button onClick={submit} disabled={apply.isPending} className={primaryBtn}>
            {apply.isPending && <Loader2 size={15} className="animate-spin" />} Submit Request
          </button>
        </div>
      </ModalPanel>
    </Overlay>
  );
}
