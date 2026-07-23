import { useInventoryOverview } from '../services/dashboard.api';
import { Package, Banknote, AlertTriangle, XCircle, Box } from 'lucide-react';
import { StatCard } from './DashboardUI';

export default function InventoryOverview() {
  const { data, isLoading, isError } = useInventoryOverview();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="p-4 text-sm text-red-500 bg-red-50 rounded-xl dark:bg-red-900/20">Failed to load inventory data</div>;
  if (!data) return null;

  const cards = [
    { label: 'Total Items', value: data.total_medicines, icon: Package, accent: 'blue' as const },
    { label: 'Stock Value', value: `Rs ${data.stock_valuation.toFixed(2)}`, icon: Banknote, accent: 'emerald' as const },
    { label: 'Near Expiry Value', value: `Rs ${data.near_expiry_value.toFixed(2)}`, icon: AlertTriangle, accent: 'amber' as const },
    { label: 'Expired Value', value: `Rs ${data.expired_stock_value.toFixed(2)}`, icon: XCircle, accent: 'red' as const },
    { label: 'Dead Stock Items', value: data.dead_stock_count, icon: Box, accent: 'zinc' as const },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <StatCard key={card.label} {...card} delay={idx * 0.05} />
      ))}
    </div>
  );
}
