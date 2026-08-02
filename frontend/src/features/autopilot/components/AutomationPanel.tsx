'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Loader2, Clock3, Percent, TicketPercent, CheckCircle2, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useBriefingPreview, useSendBriefing,
  useExpiryDiscountPreview, useApplyExpiryDiscount,
} from '../services/autopilot.api';

const rs = (n: number) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

// ── WhatsApp Rozana Briefing ─────────────────────────────────────────────────────
function BriefingCard() {
  const { data, isLoading } = useBriefingPreview();
  const send = useSendBriefing();
  const [phone, setPhone] = useState('');

  const doSend = () => {
    toast.promise(send.mutateAsync(phone || undefined), {
      loading: 'WhatsApp par bhej rahe hain…',
      success: (r) => r.sent ? `Bhej diya (${r.number || phone}) ✅` : (r.reason || 'Number set nahi hai.'),
      error: 'Bhejne me masla hua — WhatsApp service (scan) online hai?',
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white"><MessageCircle size={18} /></div>
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Rozana WhatsApp Report</h3>
          <p className="text-xs text-zinc-400">Har subah 9 baje khud chali jaayegi · scan-wala WhatsApp</p>
        </div>
      </div>

      <div className="mb-3 flex-1 overflow-y-auto rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50" style={{ maxHeight: 220 }}>
        {isLoading ? <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          : <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{data?.text || 'Preview nahi bana.'}</pre>}
      </div>

      <div className="flex items-center gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder={data?.number ? `Default: ${data.number}` : '+92300...'}
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800" />
        <button onClick={doSend} disabled={send.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60">
          {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Abhi bhejein
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-400"><Clock3 size={12} /> Number Audit Center ki WhatsApp setting se aata hai.</p>
    </motion.div>
  );
}

// ── Expiry Auto-Discount ─────────────────────────────────────────────────────────
function ExpiryDiscountCard() {
  const { data, isLoading } = useExpiryDiscountPreview();
  const apply = useApplyExpiryDiscount();
  const items = data?.items ?? [];

  const doApply = () => {
    toast.promise(apply.mutateAsync(), {
      loading: 'Discount laga rahe hain…',
      success: (r) => r.message || 'Discount laga diya.',
      error: 'Apply karne me masla hua.',
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white"><TicketPercent size={18} /></div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Expiry Auto-Discount</h3>
            <p className="text-xs text-zinc-400">Expiry qareeb → khud markdown · rozana chalta hai</p>
          </div>
        </div>
        {items.length > 0 && (
          <button onClick={doApply} disabled={apply.isPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60">
            {apply.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />} Apply karein
          </button>
        )}
      </div>

      {/* Rule chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(data?.rules ?? [[15, 35], [30, 20], [45, 10]]).map(([d, p], i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/15 dark:text-amber-300 dark:ring-amber-800">
            <Percent size={10} /> ≤{d} din → {p}%
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 220 }}>
        {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          : items.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-zinc-400">
              <CheckCircle2 size={22} className="text-emerald-500" />
              <p className="text-sm">Abhi koi batch near-expiry nahi — koi discount zaroori nahi.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((it) => (
                <div key={it.batch_id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{it.medicine}</p>
                    <p className="text-[11px] text-zinc-400">Batch {it.batch} · {it.qty} units · {it.days_left} din baqi</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">-{it.discount_pct}%</p>
                    <p className="text-[11px] text-zinc-400"><span className="line-through">{rs(it.old_price)}</span> → <b className="text-emerald-600 dark:text-emerald-400">{rs(it.new_price)}</b></p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  );
}

export default function AutomationPanel() {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-xs">⚙️</span>
        Automation
      </h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BriefingCard />
        <ExpiryDiscountCard />
      </div>
    </section>
  );
}
