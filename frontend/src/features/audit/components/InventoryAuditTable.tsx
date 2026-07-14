'use client';

import { useInventoryFlags } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Camera, AlertTriangle, CheckCircle2, Clock, Wifi } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
  : 'http://localhost:8000';

function resolveUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BACKEND}${url}`;
}

function FlagBadge({ type }: { type: string }) {
  if (type === 'expired')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-3 h-3" /> Expired
      </span>
    );
  if (type === 'near_expiry')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
        <Clock className="w-3 h-3" /> Near Expiry
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 border border-zinc-200">{type}</span>
  );
}

function AlertBadge({ status }: { status: string }) {
  if (status === 'sent')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    );
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
        <AlertTriangle className="w-3 h-3" /> Failed
      </span>
    );
  if (status === 'not_sent')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400 font-medium">
        <Wifi className="w-3 h-3" /> Not Sent
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export default function InventoryAuditTable({ branchId }: { branchId?: string }) {
  const { data, isLoading, error } = useInventoryFlags(branchId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-red-500">
          Failed to load inventory flags.
        </CardContent>
      </Card>
    );
  }

  const expired    = (data || []).filter((r: any) => r.flag_type === 'expired');
  const nearExpiry = (data || []).filter((r: any) => r.flag_type === 'near_expiry');

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">{expired.length} Expired</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{nearExpiry.length} Near Expiry</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventory Flags</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-y border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Expiry Date</th>
                  <th className="px-4 py-3 font-medium text-right">Days</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-center">WhatsApp</th>
                  <th className="px-4 py-3 font-medium text-center">Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {!data || data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      ✅ No expired or near-expiry inventory found.
                    </td>
                  </tr>
                ) : (
                  data.map((row: any) => (
                    <tr
                      key={`${row.id}-${row.flag_type}`}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                        row.flag_type === 'expired'
                          ? 'bg-red-50/40 dark:bg-red-900/10'
                          : 'bg-yellow-50/30 dark:bg-yellow-900/5'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {row.product_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {row.batch_no || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <FlagBadge type={row.flag_type} />
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {row.expiry_date}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold text-xs ${
                        row.flag_type === 'expired'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {row.flag_type === 'expired'
                          ? `${Math.abs(row.days_remaining ?? 0)}d ago`
                          : `${row.days_remaining ?? '?'}d left`}
                      </td>
                      <td className="px-4 py-3 text-right">{row.qty}</td>
                      <td className="px-4 py-3 text-center">
                        <AlertBadge status={row.alert_status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.snapshot_url ? (
                          <a
                            href={resolveUrl(row.snapshot_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1 group"
                          >
                            <img
                              src={resolveUrl(row.snapshot_url)}
                              alt="Snapshot"
                              className="w-12 h-9 object-cover rounded border border-zinc-200 dark:border-zinc-700 group-hover:opacity-80 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="text-blue-500 text-xs flex items-center gap-1">
                              <Camera className="w-3 h-3" /> View
                            </span>
                          </a>
                        ) : (
                          <span className="text-zinc-300 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
