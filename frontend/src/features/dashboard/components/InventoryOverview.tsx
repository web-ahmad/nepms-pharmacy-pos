import { useInventoryOverview } from '../services/dashboard.api';
import { Package, Banknote, AlertTriangle, XCircle, Box } from 'lucide-react';

export default function InventoryOverview() {
  const { data, isLoading, isError } = useInventoryOverview();

  if (isLoading) return <div className="h-32 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800"></div>;
  if (isError) return <div className="p-4 text-sm text-red-500 bg-red-50 rounded-xl">Failed to load inventory data</div>;
  if (!data) return null;

  const cards = [
    { title: 'Total Items', value: data.total_medicines, icon: Package, color: 'text-blue-500' },
    { title: 'Stock Value', value: `Rs ${data.stock_valuation.toFixed(2)}`, icon: Banknote, color: 'text-green-500' },
    { title: 'Near Expiry Value', value: `Rs ${data.near_expiry_value.toFixed(2)}`, icon: AlertTriangle, color: 'text-amber-500' },
    { title: 'Expired Value', value: `Rs ${data.expired_stock_value.toFixed(2)}`, icon: XCircle, color: 'text-red-500' },
    { title: 'Dead Stock Items', value: data.dead_stock_count, icon: Box, color: 'text-zinc-400' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.title}</p>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
