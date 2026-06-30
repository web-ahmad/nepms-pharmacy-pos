import { useExpiryAlerts, useLowStockAlerts } from '../services/dashboard.api';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function AlertsTable() {
  const { data: expiryAlerts, isLoading: expiryLoading } = useExpiryAlerts();
  const { data: lowStockAlerts, isLoading: lowStockLoading } = useLowStockAlerts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Expiry Alerts */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <AlertCircle className="text-amber-500" />
            Expiry Alerts
          </h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {expiryAlerts?.length || 0} batches &le; 90 days
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {expiryLoading ? (
            <div className="h-48 animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>
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
                    <td colSpan={4} className="p-8 text-center text-zinc-500">No expiring batches found.</td>
                  </tr>
                ) : (
                  expiryAlerts?.map((alert: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{alert.batch_number}</td>
                      <td className="p-3 text-amber-600 dark:text-amber-400">{alert.expiry_date}</td>
                      <td className="p-3 text-right font-mono">{alert.remaining_quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            <AlertTriangle className="text-red-500" />
            Low Stock Alerts
          </h3>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {lowStockAlerts?.length || 0} items low
          </span>
        </div>

        <div className="overflow-x-auto">
          {lowStockLoading ? (
            <div className="h-48 animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>
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
                    <td colSpan={4} className="p-8 text-center text-zinc-500">All stock levels are optimal.</td>
                  </tr>
                ) : (
                  lowStockAlerts?.map((alert: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</td>
                      <td className="p-3 text-center text-red-600 dark:text-red-400 font-bold">{alert.current_quantity}</td>
                      <td className="p-3 text-center text-zinc-500">{alert.minimum_level}</td>
                      <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">+{alert.suggested_reorder}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
