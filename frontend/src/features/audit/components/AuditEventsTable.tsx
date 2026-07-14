'use client';

import { useAuditEvents } from '../hooks/useAuditData';
import { format } from 'date-fns';
import {
  Camera, CheckCircle2, Clock, MessageCircle, XCircle,
  Activity, Scissors, RefreshCw, DollarSign, Package, CalendarX, AlertTriangle,
} from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
  : 'http://localhost:8000';

function resolveSnapshotUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BACKEND}${url}`;
}

const EVENT_STYLE: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  void:           { icon: Scissors,   bg: 'bg-red-100 dark:bg-red-900/20',    text: 'text-red-600 dark:text-red-400',    label: 'Void'          },
  discount:       { icon: RefreshCw,  bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', label: 'Discount'   },
  refund:         { icon: RefreshCw,  bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', label: 'Refund'    },
  cash_variance:  { icon: DollarSign, bg: 'bg-green-100 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-400',  label: 'Cash Var.'  },
  expired:        { icon: Package,    bg: 'bg-red-100 dark:bg-red-900/20',    text: 'text-red-600 dark:text-red-400',    label: 'Expired'       },
  near_expiry:    { icon: CalendarX,  bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Near Exp.' },
};

const SEV_STYLE: Record<string, string> = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  low:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function WaStatus({ alerts }: { alerts: any[] }) {
  const wa = (alerts || []).find((a: any) => a.channel === 'whatsapp');
  if (!wa) return <span className="text-zinc-300 dark:text-zinc-700 text-xs">—</span>;
  if (wa.status === 'sent' || wa.status === 'delivered')
    return <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><CheckCircle2 className="w-3 h-3" />Sent</span>;
  if (wa.status === 'failed')
    return <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3 h-3" />Failed</span>;
  return <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium"><Clock className="w-3 h-3" />Pending</span>;
}

export default function AuditEventsTable({ branchId }: { branchId?: string }) {
  const { data: events, isLoading } = useAuditEvents(branchId);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Recent Activity Log</h3>
            <p className="text-xs text-zinc-400">Live — updates every 5s</p>
          </div>
        </div>
        {!isLoading && events && (
          <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Event</th>
              <th className="px-4 py-3 text-left font-medium">Staff</th>
              <th className="px-4 py-3 text-left font-medium">Severity</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
              <th className="px-4 py-3 text-center font-medium">WhatsApp</th>
              <th className="px-4 py-3 text-center font-medium">Snapshot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded audit-skeleton" style={{ width: `${60 + (j * 7) % 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : !events || events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" />
                  <p className="text-zinc-400 text-sm">No audit events recorded yet.</p>
                  <p className="text-zinc-300 dark:text-zinc-600 text-xs mt-1">Events appear here as transactions are processed.</p>
                </td>
              </tr>
            ) : (
              events.map((event: any, idx: number) => {
                const snapshot = event.camera_snapshots?.[0];
                const style = EVENT_STYLE[event.event_type] || {
                  icon: AlertTriangle, bg: 'bg-zinc-100 dark:bg-zinc-800',
                  text: 'text-zinc-600', label: event.event_type,
                };
                const Icon = style.icon;
                const meta = event.metadata || {};

                return (
                  <tr
                    key={event.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
                    style={{ animation: 'fadeSlideUp 0.3s ease both', animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {format(new Date(event.created_at), 'MMM d')}
                      </p>
                      <p className="text-xs text-zinc-400">{format(new Date(event.created_at), 'h:mm a')}</p>
                    </td>

                    {/* Event type pill */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                        <Icon className="w-3 h-3" />
                        {style.label}
                      </span>
                    </td>

                    {/* Staff */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {meta.staff_name || (event.staff_id === 'system' ? 'System' : event.staff_id?.split('-')[0] + '…')}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${SEV_STYLE[event.severity] || SEV_STYLE.low}`}>
                        {event.severity}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {meta.product_name || meta.staff_name || meta.reason || meta.notes || '—'}
                      </p>
                      {meta.amount && (
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Rs {parseFloat(meta.amount).toFixed(2)}
                        </p>
                      )}
                      {meta.variance && (
                        <p className={`text-xs font-medium ${Number(meta.variance) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {Number(meta.variance) > 0 ? '+' : ''}Rs {Number(meta.variance).toFixed(2)}
                        </p>
                      )}
                    </td>

                    {/* WhatsApp */}
                    <td className="px-4 py-3 text-center">
                      <WaStatus alerts={event.alert_history || []} />
                    </td>

                    {/* Snapshot */}
                    <td className="px-4 py-3 text-center">
                      {snapshot?.image_url ? (
                        <a
                          href={resolveSnapshotUrl(snapshot.image_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-col items-center gap-1 group"
                        >
                          <img
                            src={resolveSnapshotUrl(snapshot.image_url)}
                            alt="Snapshot"
                            className="w-14 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700 group-hover:scale-105 group-hover:shadow-md transition-all duration-200"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="text-blue-500 flex items-center gap-1 text-xs">
                            <Camera className="w-3 h-3" /> View
                          </span>
                        </a>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
