import { useSalesOverview, DateRange } from '../services/dashboard.api';
import { DollarSign, FileText, ShoppingBag, TrendingUp, Tags } from 'lucide-react';

export default function SalesOverview({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading, isError } = useSalesOverview(dateRange);

  if (isLoading) return <div className="h-32 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800"></div>;
  if (isError) return <div className="p-4 text-sm text-red-500 bg-red-50 rounded-xl">Failed to load sales data</div>;
  if (!data) return null;

  const cards = [
    { title: 'Gross Sales', value: `Rs ${data.gross_sales.toFixed(2)}`, icon: DollarSign, color: 'text-zinc-600 dark:text-zinc-400' },
    { title: 'Discounts Given', value: `-Rs ${data.discounts_given.toFixed(2)}`, icon: Tags, color: 'text-red-500' },
    { title: 'Net Sales', value: `Rs ${data.net_sales.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
    { title: 'Total Invoices', value: data.number_of_invoices, icon: FileText, color: 'text-zinc-600 dark:text-zinc-400' },
    { title: 'Avg Basket', value: `Rs ${data.average_basket_size.toFixed(2)}`, icon: ShoppingBag, color: 'text-zinc-600 dark:text-zinc-400' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.title}</h3>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${card.title === 'Net Sales' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
