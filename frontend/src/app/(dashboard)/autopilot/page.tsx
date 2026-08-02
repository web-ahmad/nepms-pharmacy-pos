'use client';

import { motion } from 'framer-motion';
import { Bot, TrendingUp, TrendingDown, Receipt, PackageX, CalendarClock, Activity } from 'lucide-react';
import { usePulse } from '@/features/autopilot/services/autopilot.api';
import AICopilotPanel from '@/features/autopilot/components/AICopilotPanel';
import StockoutRadar from '@/features/autopilot/components/StockoutRadar';
import ForecastChart from '@/features/autopilot/components/ForecastChart';
import SmartActions from '@/features/autopilot/components/SmartActions';
import ExpiryForecastCard from '@/features/autopilot/components/ExpiryForecastCard';
import MarketAnalysis from '@/features/autopilot/components/MarketAnalysis';
import AutomationPanel from '@/features/autopilot/components/AutomationPanel';

const rs = (n: number) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

function PulseTiles() {
  const { data, isLoading } = usePulse();
  const up = (data?.vs_yesterday_pct ?? 0) >= 0;
  const tiles = [
    { label: 'Aaj ki Sales', value: rs(data?.today_sales || 0), icon: Receipt, grad: 'from-indigo-500 to-violet-600',
      sub: data ? `${up ? '▲' : '▼'} ${Math.abs(data.vs_yesterday_pct)}% kal se` : '', subColor: up ? 'text-emerald-200' : 'text-red-200' },
    { label: 'Aaj ke Invoices', value: String(data?.today_invoices ?? 0), icon: Activity, grad: 'from-fuchsia-500 to-pink-600', sub: 'live', subColor: 'text-white/70' },
    { label: 'Kam Stock', value: String(data?.low_stock_items ?? 0), icon: PackageX, grad: 'from-amber-500 to-orange-600', sub: 'reorder se neeche', subColor: 'text-white/70' },
    { label: 'Expiry ≤30 din', value: String(data?.expiring_30d ?? 0), icon: CalendarClock, grad: 'from-rose-500 to-red-600', sub: 'batches', subColor: 'text-white/70' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.grad} p-4 text-white shadow-lg`}>
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">{t.label}</p>
              <p className="mt-1 text-2xl font-extrabold leading-tight">{isLoading ? '—' : t.value}</p>
              {t.sub && <p className={`mt-0.5 text-[11px] font-semibold ${t.subColor}`}>{t.sub}</p>}
            </div>
            <t.icon className="h-6 w-6 text-white/80" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function AutopilotPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-indigo-950 to-violet-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 3 }}
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 ring-1 ring-white/20">
              <Bot className="h-7 w-7" />
              <span className="absolute -inset-1 rounded-2xl bg-fuchsia-500/30 blur-lg" />
            </motion.div>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/15">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live · Real-time
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">AI Autopilot</h1>
              <p className="mt-1 text-sm text-white/80">Aap ki pharmacy ka automation &amp; intelligence center — predictions, alerts aur smart actions, sab aik jagah.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Live pulse */}
      <PulseTiles />

      {/* Smart actions + Stock-out radar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SmartActions />
        <StockoutRadar />
      </div>

      {/* Forecast + Expiry */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ForecastChart />
        <ExpiryForecastCard />
      </div>

      {/* Automation — Auto PO / WhatsApp Briefing / Expiry Auto-Discount */}
      <AutomationPanel />

      {/* AI Copilot */}
      <AICopilotPanel />

      {/* Market Analysis — Pakistan */}
      <MarketAnalysis />
    </div>
  );
}
