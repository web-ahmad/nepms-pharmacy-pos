'use client';

import { useRouter } from 'next/navigation';
import { useInventoryOverview } from '../services/dashboard.api';
import { Package, Banknote, AlertTriangle, XCircle, Box } from 'lucide-react';
import { GradientStatCard, fmtRs, fmtInt } from './DashboardUI';

export default function InventoryOverview() {
  const { data, isLoading, isError } = useInventoryOverview();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 dark:bg-red-900/20">Failed to load inventory data</div>;
  if (!data) return null;

  const cards = [
    { label: 'Total Items', value: data.total_medicines, format: fmtInt, icon: Package, tone: 'blue' as const, onClick: () => router.push('/inventory') },
    { label: 'Stock Value', value: data.stock_valuation, format: fmtRs, icon: Banknote, tone: 'emerald' as const, onClick: () => router.push('/inventory') },
    { label: 'Near Expiry Value', value: data.near_expiry_value, format: fmtRs, icon: AlertTriangle, tone: 'amber' as const },
    { label: 'Expired Value', value: data.expired_stock_value, format: fmtRs, icon: XCircle, tone: 'red' as const },
    { label: 'Dead Stock Items', value: data.dead_stock_count, format: fmtInt, icon: Box, tone: 'indigo' as const },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, idx) => (
        <GradientStatCard key={card.label} {...card} delay={idx * 0.05} />
      ))}
    </div>
  );
}
