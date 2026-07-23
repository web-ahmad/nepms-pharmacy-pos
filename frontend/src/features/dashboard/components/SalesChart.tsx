'use client';

import { useTheme } from 'next-themes';
import { useDashboardCharts, DateRange } from '../services/dashboard.api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, Pill } from 'lucide-react';
import { ChartCard, ChartEmptyState, ChartTooltipCard, CHART_GREEN, CHART_GREEN_SOFT } from './DashboardUI';

// Chart chrome — one step off the surface, per the dataviz reference palette.
const CHROME = {
  light: { grid: '#e1e0d9', axis: '#898781', cursor: 'rgba(5, 150, 105, 0.06)', surface: '#ffffff' },
  dark:  { grid: '#2c2c2a', axis: '#898781', cursor: 'rgba(5, 150, 105, 0.12)', surface: '#09090b' },
};

function SalesTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = new Date(label);
  return (
    <ChartTooltipCard>
      <p className="mb-1 text-zinc-500 dark:text-zinc-400">{date.getMonth() + 1}/{date.getDate()}</p>
      <p className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50">
        <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: CHART_GREEN }} />
        Rs {Number(payload[0]?.value || 0).toFixed(2)}
      </p>
    </ChartTooltipCard>
  );
}

function MedicineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard>
      <p className="mb-1 text-zinc-500 dark:text-zinc-400">{payload[0]?.payload?.name}</p>
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{payload[0]?.value} units sold</p>
    </ChartTooltipCard>
  );
}

export default function SalesChart({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading } = useDashboardCharts(dateRange);
  const { resolvedTheme } = useTheme();
  const chrome = resolvedTheme === 'dark' ? CHROME.dark : CHROME.light;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
        <div className="h-80 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ChartCard title="Sales Trend" icon={TrendingUp} delay={0.1} className="lg:col-span-2">
        <div className="h-72 w-full">
          {(!data?.sales_trend || data.sales_trend.length === 0) ? (
            <ChartEmptyState icon={TrendingUp} message="No data available for this period." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sales_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={chrome.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: chrome.axis }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: chrome.axis }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `Rs ${val}`}
                />
                <Tooltip content={<SalesTooltip />} cursor={{ stroke: CHART_GREEN, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={CHART_GREEN}
                  strokeWidth={2}
                  fill="url(#salesTrendFill)"
                  dot={{ r: 4, fill: CHART_GREEN, stroke: chrome.surface, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: CHART_GREEN, stroke: chrome.surface, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <ChartCard title="Top Medicines" icon={Pill} delay={0.15}>
        <div className="h-72 w-full">
          {(!data?.top_medicines || data.top_medicines.length === 0) ? (
            <ChartEmptyState icon={Pill} message="No data available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_medicines} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="0" horizontal={false} stroke={chrome.grid} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: chrome.axis }}
                  width={80}
                />
                <Tooltip content={<MedicineTooltip />} cursor={{ fill: chrome.cursor }} />
                <Bar dataKey="quantity" fill={CHART_GREEN} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
