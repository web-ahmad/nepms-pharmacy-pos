'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Loader2, FileText, AlertCircle, Users, Scissors, DollarSign,
  Package, CalendarX, TrendingDown, TrendingUp, CheckCircle2, AlertTriangle,
  Clock, BarChart3, RefreshCw
} from 'lucide-react';

const BACKEND = '/api/v1/audit';

const REPORTS = [
  { id: 'staff_risk',          label: 'Staff Risk Report',      icon: Users,       color: 'text-blue-600'   },
  { id: 'void_discount',       label: 'Void/Discount Trend',    icon: Scissors,    color: 'text-purple-600' },
  { id: 'cash_reconciliation', label: 'Cash Reconciliation',    icon: DollarSign,  color: 'text-green-600'  },
  { id: 'inventory_shrinkage', label: 'Inventory Shrinkage',    icon: Package,     color: 'text-orange-600' },
  { id: 'expiry',              label: 'Expiry Report',          icon: CalendarX,   color: 'text-red-600'    },
];

const PERIODS = ['daily', 'weekly', 'monthly'];

export default function PrebuiltReportsSection({ branchId }: { branchId?: string }) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('monthly');

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left: report selector */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Generate Report</CardTitle>
          <CardDescription>Select a pre-built template.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {REPORTS.map(report => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                  activeReport === report.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${report.color}`} />
                {report.label}
              </button>
            );
          })}

          {/* Period selector */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Period</p>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors capitalize ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: report viewer */}
      <div className="md:col-span-3">
        {activeReport ? (
          <ReportViewer reportType={activeReport} branchId={branchId} period={period} />
        ) : (
          <Card className="h-full border-dashed bg-zinc-50/50 dark:bg-zinc-900/10">
            <CardContent className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
              <BarChart3 className="w-14 h-14 mb-4 text-zinc-300 dark:text-zinc-700" />
              <p className="font-medium">Select a report template from the left to view data.</p>
              <p className="text-sm text-zinc-400 mt-1">Reports are generated from live database data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Report Viewer ────────────────────────────────────────────────────────────

function ReportViewer({ reportType, branchId, period }: { reportType: string; branchId?: string; period: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit', 'reports', reportType, branchId, period],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set('branch_id', branchId);
      const res = await api.get(`${BACKEND}/reports/${reportType}?${params}`);
      return res.data;
    },
    retry: false,
  });

  const reportLabel = REPORTS.find(r => r.id === reportType)?.label;

  if (isLoading) return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-500">Generating {reportLabel}…</p>
      </CardContent>
    </Card>
  );

  if (error) return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p className="font-semibold text-lg mb-1">Failed to generate report</p>
        <p className="text-sm opacity-80 text-center max-w-md">
          {error instanceof Error ? error.message : 'Backend error'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{reportLabel} <span className="text-zinc-400 text-sm font-normal capitalize">({period})</span></CardTitle>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-auto">
        <ReportContent type={reportType} data={data} />
      </CardContent>
    </Card>
  );
}

// ── Per-report content renderers ─────────────────────────────────────────────

function ReportContent({ type, data }: { type: string; data: any }) {
  if (!data) return <p className="text-zinc-400 text-sm">No data available.</p>;

  switch (type) {
    case 'staff_risk':          return <StaffRiskContent data={data} />;
    case 'void_discount':       return <VoidDiscountContent data={data} />;
    case 'cash_reconciliation': return <CashReconContent data={data} />;
    case 'inventory_shrinkage': return <ShrinkageContent data={data} />;
    case 'expiry':              return <ExpiryContent data={data} />;
    default:                    return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${color}`}>
      <div className="mt-0.5"><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StaffRiskContent({ data }: { data: any }) {
  const rows: any[] = data.data || [];
  const levelColor = (l: string) =>
    l === 'red' ? 'text-red-600' : l === 'yellow' ? 'text-yellow-600' : 'text-green-600';
  const levelBg = (l: string) =>
    l === 'red' ? 'bg-red-100 dark:bg-red-900/20' : l === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20';
  const icon = (l: string) => l === 'red' ? '🔴' : l === 'yellow' ? '🟡' : '🟢';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Staff Analysed" value={data.total_staff_analysed ?? rows.length} icon={Users}
          color="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400" />
        <StatCard label="High Risk (Red)" value={rows.filter((r: any) => r.risk_level === 'red').length} icon={AlertTriangle}
          color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400" />
        <StatCard label="Medium Risk" value={rows.filter((r: any) => r.risk_level === 'yellow').length} icon={Clock}
          color="bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-400" />
      </div>
      {rows.length === 0
        ? <p className="text-zinc-400 text-sm py-4 text-center">No risk data for this period.</p>
        : <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs">
              <th className="py-2 text-left">Staff</th>
              <th className="py-2 text-right">Voids</th>
              <th className="py-2 text-right">Discounts</th>
              <th className="py-2 text-right">Refunds</th>
              <th className="py-2 text-right">Score</th>
              <th className="py-2 text-center">Level</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r: any) => (
                <tr key={r.staff_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td className="py-2.5 font-medium">{r.staff_name || r.staff_id}</td>
                  <td className="py-2.5 text-right">{r.void_count}</td>
                  <td className="py-2.5 text-right">{r.discount_count}</td>
                  <td className="py-2.5 text-right">{r.refund_count}</td>
                  <td className={`py-2.5 text-right font-bold ${levelColor(r.risk_level)}`}>{r.risk_score}</td>
                  <td className="py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${levelBg(r.risk_level)} ${levelColor(r.risk_level)}`}>
                      {icon(r.risk_level)} {r.risk_level.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      }
    </div>
  );
}

function VoidDiscountContent({ data }: { data: any }) {
  const voids     = data.voids || {};
  const discounts = data.discounts || {};
  const events: any[] = data.raw_events || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Voids" value={voids.count ?? 0}
          sub={`Rs ${(voids.total_value ?? 0).toFixed(2)} total value`} icon={Scissors}
          color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400" />
        <StatCard label="Total Discounts" value={discounts.count ?? 0}
          sub={`Rs ${(discounts.total_value ?? 0).toFixed(2)} total value`} icon={TrendingDown}
          color="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/10 dark:border-purple-800 dark:text-purple-400" />
      </div>
      {events.length === 0
        ? <p className="text-zinc-400 text-sm py-4 text-center">No void/discount events for this period.</p>
        : <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs">
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Staff</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-left">Reason</th>
              <th className="py-2 text-right">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {events.slice(0, 20).map((e: any, i: number) => (
                <tr key={e.id || i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.event_type === 'void' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                      {e.event_type}
                    </span>
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{e.staff_name}</td>
                  <td className="py-2 text-right font-medium">Rs {parseFloat(e.metadata?.amount || 0).toFixed(2)}</td>
                  <td className="py-2 text-zinc-500 text-xs max-w-[160px] truncate">{e.metadata?.reason || '—'}</td>
                  <td className="py-2 text-right text-xs text-zinc-400">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
      }
    </div>
  );
}

function CashReconContent({ data }: { data: any }) {
  const shortages = data.shortages || {};
  const overages  = data.overages  || {};
  const balanced  = data.balanced  || {};
  const rows: any[] = data.data || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Shortages" value={shortages.count ?? 0}
          sub={`Rs ${(shortages.total_value ?? 0).toFixed(2)}`} icon={TrendingDown}
          color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400" />
        <StatCard label="Overages" value={overages.count ?? 0}
          sub={`Rs ${(overages.total_value ?? 0).toFixed(2)}`} icon={TrendingUp}
          color="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800 dark:text-green-400" />
        <StatCard label="Balanced" value={balanced.count ?? 0} icon={CheckCircle2}
          color="bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-900/10 dark:border-zinc-700 dark:text-zinc-400" />
      </div>
      {rows.length === 0
        ? <p className="text-zinc-400 text-sm py-4 text-center">No shift data for this period.</p>
        : <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs">
              <th className="py-2 text-left">Cashier</th>
              <th className="py-2 text-left">Shift Date</th>
              <th className="py-2 text-right">Expected</th>
              <th className="py-2 text-right">Actual</th>
              <th className="py-2 text-right">Variance</th>
              <th className="py-2 text-center">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r: any, i: number) => {
                const v = parseFloat(r.variance || 0);
                return (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 font-medium">{r.staff_name || r.staff_id}</td>
                    <td className="py-2.5 text-zinc-500 text-xs">{r.shift_date}</td>
                    <td className="py-2.5 text-right">Rs {parseFloat(r.expected_cash || 0).toFixed(2)}</td>
                    <td className="py-2.5 text-right">Rs {parseFloat(r.actual_cash || 0).toFixed(2)}</td>
                    <td className={`py-2.5 text-right font-semibold ${v < 0 ? 'text-red-600' : v > 0 ? 'text-green-600' : 'text-zinc-500'}`}>
                      {v > 0 ? '+' : ''}Rs {v.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v < 0 ? 'bg-red-100 text-red-700' : v > 0 ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {v < 0 ? 'SHORT' : v > 0 ? 'OVER' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      }
    </div>
  );
}

function ShrinkageContent({ data }: { data: any }) {
  const products: any[] = data.top_products || [];
  const events: any[]   = data.raw_events   || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Items Flagged" value={data.total_events ?? 0} icon={Package}
          color="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/10 dark:border-orange-800 dark:text-orange-400" />
        <StatCard label="Total Units at Risk" value={data.total_units ?? 0} icon={AlertTriangle}
          color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400" />
      </div>
      {products.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Top Affected Products</p>
          <div className="space-y-1.5">
            {products.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-orange-600 font-bold text-sm">{p.units} units</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {events.length === 0 && products.length === 0 &&
        <p className="text-zinc-400 text-sm py-4 text-center">No shrinkage flags for this period.</p>
      }
    </div>
  );
}

function ExpiryContent({ data }: { data: any }) {
  const expired: any[]    = data.expired    || [];
  const nearExpiry: any[] = data.near_expiry || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Expired Items" value={data.expired_count ?? expired.length} icon={CalendarX}
          color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400" />
        <StatCard label="Nearing Expiry" value={data.near_expiry_count ?? nearExpiry.length} icon={Clock}
          color="bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-400" />
      </div>

      {expired.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Expired — Remove Immediately
          </p>
          <ExpiryTable rows={expired} type="expired" />
        </div>
      )}

      {nearExpiry.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Nearing Expiry — Act Soon
          </p>
          <ExpiryTable rows={nearExpiry} type="near_expiry" />
        </div>
      )}

      {expired.length === 0 && nearExpiry.length === 0 &&
        <p className="text-zinc-400 text-sm py-4 text-center">✅ No expiry issues for this period.</p>
      }
    </div>
  );
}

function ExpiryTable({ rows, type }: { rows: any[]; type: string }) {
  const isExpired = type === 'expired';
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs">
        <th className="py-2 text-left">Product</th>
        <th className="py-2 text-left">Batch</th>
        <th className="py-2 text-right">Expiry</th>
        <th className="py-2 text-right">Days</th>
        <th className="py-2 text-right">Qty</th>
      </tr></thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((r: any, i: number) => (
          <tr key={i} className={`${isExpired ? 'bg-red-50/30 dark:bg-red-900/5' : 'bg-yellow-50/30 dark:bg-yellow-900/5'} hover:opacity-90`}>
            <td className="py-2 font-medium">{r.product_name}</td>
            <td className="py-2 font-mono text-xs text-zinc-500">{r.batch_no || '—'}</td>
            <td className="py-2 text-right text-xs">{r.expiry_date}</td>
            <td className={`py-2 text-right font-semibold text-xs ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
              {isExpired
                ? `${Math.abs(r.days_remaining ?? 0)}d ago`
                : `${r.days_remaining ?? '?'}d left`}
            </td>
            <td className="py-2 text-right">{r.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
