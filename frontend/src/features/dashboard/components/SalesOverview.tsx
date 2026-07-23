import { useSalesOverview, DateRange } from '../services/dashboard.api';
import { DollarSign, FileText, ShoppingBag, TrendingUp, Tags } from 'lucide-react';
import { StatCard } from './DashboardUI';

export default function SalesOverview({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading, isError } = useSalesOverview(dateRange);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="p-4 text-sm text-red-500 bg-red-50 rounded-xl dark:bg-red-900/20">Failed to load sales data</div>;
  if (!data) return null;

  const cards = [
    { label: 'Gross Sales', value: `Rs ${data.gross_sales.toFixed(2)}`, icon: DollarSign, accent: 'zinc' as const },
    { label: 'Discounts Given', value: `-Rs ${data.discounts_given.toFixed(2)}`, icon: Tags, accent: 'red' as const },
    { label: 'Net Sales', value: `Rs ${data.net_sales.toFixed(2)}`, icon: TrendingUp, accent: 'emerald' as const },
    { label: 'Total Invoices', value: data.number_of_invoices, icon: FileText, accent: 'blue' as const },
    { label: 'Avg Basket', value: `Rs ${data.average_basket_size.toFixed(2)}`, icon: ShoppingBag, accent: 'zinc' as const },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <StatCard key={card.label} {...card} delay={idx * 0.05} />
      ))}
    </div>
  );
}
