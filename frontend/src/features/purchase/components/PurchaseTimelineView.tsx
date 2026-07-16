'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePurchaseTimeline } from '../services/purchase.api';
import { format } from 'date-fns';
import {
  CheckCircle2, Clock, XCircle, ShoppingCart, FileText,
  Loader2, Activity, User, ClipboardList,
} from 'lucide-react';

// ─── Event config ─────────────────────────────────────────────────────────────

function getEventConfig(action: string) {
  const a = action.toLowerCase();
  if (a.includes('approved')) return {
    icon: CheckCircle2,
    iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
    lineBg: 'bg-emerald-200',
    textColor: 'text-emerald-700',
    badgeBg:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  };
  if (a.includes('rejected')) return {
    icon: XCircle,
    iconBg: 'bg-gradient-to-br from-red-400 to-rose-500',
    lineBg: 'bg-red-200',
    textColor: 'text-red-700',
    badgeBg:  'bg-red-50 text-red-700 ring-1 ring-red-100',
  };
  if (a.includes('submitted')) return {
    icon: ClipboardList,
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    lineBg: 'bg-blue-200',
    textColor: 'text-blue-700',
    badgeBg:  'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  };
  if (a.includes('convert') || a.includes('po')) return {
    icon: ShoppingCart,
    iconBg: 'bg-gradient-to-br from-violet-400 to-violet-600',
    lineBg: 'bg-violet-200',
    textColor: 'text-violet-700',
    badgeBg:  'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  };
  if (a.includes('created') || a.includes('draft')) return {
    icon: FileText,
    iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500',
    lineBg: 'bg-slate-200',
    textColor: 'text-slate-700',
    badgeBg:  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };
  return {
    icon: Clock,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    lineBg: 'bg-amber-200',
    textColor: 'text-amber-700',
    badgeBg:  'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseTimelineView({ referenceId }: { referenceId: string }) {
  const { data: timeline, isLoading } = usePurchaseTimeline(referenceId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
          <Activity size={13} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Activity Timeline</h3>
          <p className="text-[11px] text-slate-500">Audit trail for this purchase request</p>
        </div>
      </div>

      <div className="p-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Loader2 size={16} className="animate-spin text-blue-400" />
            <span className="text-sm">Loading activity…</span>
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!timeline || timeline.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Activity size={20} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500">No activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Events will appear here as the request progresses</p>
            </div>
          </div>
        )}

        {/* Events */}
        {!isLoading && timeline && timeline.length > 0 && (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-100" />

            <div className="space-y-0">
              <AnimatePresence>
                {timeline.map((event: any, i: number) => {
                  const cfg = getEventConfig(event.action);
                  const Icon = cfg.icon;
                  const isLast = i === timeline.length - 1;

                  return (
                    <motion.div
                      key={event.id || i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.25 }}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {/* Icon node */}
                      <div className="relative flex-shrink-0 z-10">
                        <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center shadow-sm ring-2 ring-white`}>
                          <Icon size={15} className="text-white" strokeWidth={2} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className={`flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 ${isLast ? '' : ''} hover:bg-blue-50/30 transition-colors duration-150`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badgeBg}`}>
                              {event.action}
                            </span>
                          </div>
                          <time className="text-[10px] font-medium text-slate-400 flex-shrink-0">
                            {format(new Date(event.timestamp), 'MMM dd, yyyy · HH:mm')}
                          </time>
                        </div>

                        {event.remarks && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed italic">
                            "{event.remarks}"
                          </p>
                        )}

                        {event.user_id && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center">
                              <User size={8} className="text-white" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {event.user_id.substring(0, 8)}…
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}