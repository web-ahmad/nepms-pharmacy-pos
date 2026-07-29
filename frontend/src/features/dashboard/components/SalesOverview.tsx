import { useSalesOverview, DateRange } from '../services/dashboard.api';
import { DollarSign, FileText, ShoppingBag, TrendingUp, Tags } from 'lucide-react';
import { GradientStatCard, fmtRs, fmtInt } from './DashboardUI';

export default function SalesOverview({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading, isError } = useSalesOverview(dateRange);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 dark:bg-red-900/20">Failed to load sales data</div>;
  if (!data) return null;

  const cards = [
    { label: 'Gross Sales', value: data.gross_sales, format: fmtRs, icon: DollarSign, tone: 'emerald' as const },
    { label: 'Discounts Given', value: data.discounts_given, format: (n: number) => `-${fmtRs(n)}`, icon: Tags, tone: 'rose' as const },
    { label: 'Net Sales', value: data.net_sales, format: fmtRs, icon: TrendingUp, tone: 'blue' as const },
    { label: 'Total Invoices', value: data.number_of_invoices, format: fmtInt, icon: FileText, tone: 'violet' as const },
    { label: 'Avg Basket', value: data.average_basket_size, format: fmtRs, icon: ShoppingBag, tone: 'cyan' as const },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, idx) => (
        <GradientStatCard key={card.label} {...card} delay={idx * 0.05} />
      ))}
    </div>
  );
}
