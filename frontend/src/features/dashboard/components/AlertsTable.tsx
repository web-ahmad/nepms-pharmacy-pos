import { motion } from 'framer-motion';
import { useExpiryAlerts, useLowStockAlerts } from '../services/dashboard.api';
import { AlertTriangle, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react';
import { ChartCard } from './DashboardUI';

export default function AlertsTable() {
  const { data: expiryAlerts, isLoading: expiryLoading } = useExpiryAlerts();
  const { data: lowStockAlerts, isLoading: lowStockLoading } = useLowStockAlerts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard
        title="Expiry Alerts"
        icon={AlertCircle}
        delay={0.2}
        headerExtra={
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {expiryAlerts?.length || 0} batches &le; 90 days
          </span>
        }
      >
        <div className="overflow-x-auto">
          {expiryLoading ? (
            <div className="h-48 animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="p-3 font-medium rounded-tl-lg">Medicine</th>
                  <th className="p-3 font-medium">Batch</th>
                  <th className="p-3 font-medium">Expiry Date</th>
                  <th className="p-3 font-medium text-right rounded-tr-lg">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {expiryAlerts?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-500">No expiring batches found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expiryAlerts?.map((alert: any, idx: number) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{alert.batch_number}</td>
                      <td className="p-3 text-amber-600 dark:text-amber-400">{alert.expiry_date}</td>
                      <td className="p-3 text-right font-mono">{alert.remaining_quantity}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Low Stock Alerts"
        icon={AlertTriangle}
        delay={0.25}
        headerExtra={
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {lowStockAlerts?.length || 0} items low
          </span>
        }
      >
        <div className="overflow-x-auto">
          {lowStockLoading ? (
            <div className="h-48 animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="p-3 font-medium rounded-tl-lg">Medicine</th>
                  <th className="p-3 font-medium text-center">Current</th>
                  <th className="p-3 font-medium text-center">Minimum</th>
                  <th className="p-3 font-medium text-right rounded-tr-lg">Reorder Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {lowStockAlerts?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600">
                        <PackageCheck className="h-7 w-7 text-emerald-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-500">All stock levels are optimal.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lowStockAlerts?.map((alert: any, idx: number) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</td>
                      <td className="p-3 text-center text-red-600 dark:text-red-400 font-bold">{alert.current_quantity}</td>
                      <td className="p-3 text-center text-zinc-500">{alert.minimum_level}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">+{alert.suggested_reorder}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
