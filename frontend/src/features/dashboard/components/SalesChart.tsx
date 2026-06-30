import { useDashboardCharts, DateRange } from '../services/dashboard.api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend 
} from 'recharts';

export default function SalesChart({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading } = useDashboardCharts(dateRange);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800"></div>
        <div className="h-80 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Sales Trend Line Chart */}
      <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">Sales Trend</h3>
        <div className="h-72 w-full">
          {(!data?.sales_trend || data.sales_trend.length === 0) ? (
            <div className="flex h-full items-center justify-center text-zinc-500">No data available for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sales_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#71717a' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getMonth()+1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#71717a' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `Rs ${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`Rs ${Number(value || 0).toFixed(2)}`, 'Sales']}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Medicines Bar Chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">Top Medicines</h3>
        <div className="h-72 w-full">
          {(!data?.top_medicines || data.top_medicines.length === 0) ? (
            <div className="flex h-full items-center justify-center text-zinc-500">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_medicines} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#52525b" opacity={0.2} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
