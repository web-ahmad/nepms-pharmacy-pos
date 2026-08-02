'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import { format } from 'date-fns';
import { useForecast } from '../services/autopilot.api';

const rs = (n: number) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

export default function ForecastChart() {
  const { data, isLoading } = useForecast(14);
  const merged = useMemo(() => {
    if (!data) return [];
    const hist = data.history.map((h) => ({ date: h.date, actual: h.sales as number | null, predicted: null as number | null }));
    const last = data.history[data.history.length - 1];
    const fc = data.forecast.map((f) => ({ date: f.date, actual: null as number | null, predicted: f.sales as number | null }));
    if (last && fc.length) fc.unshift({ date: last.date, actual: null, predicted: last.sales });
    return [...hist, ...fc];
  }, [data]);
  const firstForecast = data?.forecast?.[0]?.date;
  const trend = data?.trend;
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'rising' ? 'text-emerald-500' : trend === 'declining' ? 'text-red-500' : 'text-zinc-400';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white"><LineChart size={18} /></div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Sales ka Andaza (Forecast)</h3>
            <p className="text-xs text-zinc-400">60 din ka record · AI ke mutabiq agle 14 din</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">14 din ka andaza</p>
            <p className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">{rs(data?.predicted_total || 0)}</p>
          </div>
          {trend && <span className={`inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold dark:bg-zinc-800 ${trendColor}`}><TrendIcon size={13} /> {trend === 'rising' ? 'barh rahi' : trend === 'declining' ? 'kam ho rahi' : 'stable'}</span>}
        </div>
      </div>
      {isLoading ? <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        : merged.length === 0 ? <div className="flex h-64 items-center justify-center text-center text-sm text-zinc-400">Forecast ke liye abhi kaafi sales record nahi hai.</div>
        : (
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={merged} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="apActual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                <linearGradient id="apPred" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} /><stop offset="100%" stopColor="#d946ef" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => format(new Date(d), 'd MMM')} minTickGap={28} stroke="currentColor" className="text-zinc-400" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={42} stroke="currentColor" className="text-zinc-400" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }}
                formatter={(v: any, n: any) => [rs(v), n === 'actual' ? 'Asal' : 'Andaza']}
                labelFormatter={(d) => format(new Date(d), 'EEE, d MMM')} />
              {firstForecast && <ReferenceLine x={firstForecast} stroke="#d946ef" strokeDasharray="4 4" />}
              <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} fill="url(#apActual)" connectNulls dot={false} />
              <Area type="monotone" dataKey="predicted" stroke="#d946ef" strokeWidth={2} strokeDasharray="5 4" fill="url(#apPred)" connectNulls dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
    </motion.div>
  );
}
