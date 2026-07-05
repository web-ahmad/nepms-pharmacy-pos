import { useStockMovements } from '../services/inventory.api';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface StockMovementsListProps {
  medicineId: string;
}

export default function StockMovementsList({ medicineId }: StockMovementsListProps) {
  const { data: movements, isLoading, isError } = useStockMovements(medicineId);

  if (isLoading) return <div className="animate-pulse h-32 bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>;
  if (isError) return <div className="text-red-500 text-sm">Failed to load movements.</div>;

  if (!movements || movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-500 border rounded-lg dark:border-zinc-800">
        <Activity className="h-10 w-10 text-zinc-300 mb-3" />
        <p>No stock movements recorded.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
          <tr>
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium text-right">Quantity Change</th>
            <th className="p-3 font-medium">Reference / Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="p-3 text-zinc-600 dark:text-zinc-400">
                {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
              </td>
              <td className="p-3 text-zinc-900 dark:text-zinc-100">{movement.movement_type}</td>
              <td className="p-3 text-right font-mono font-bold">
                <span className={movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                </span>
              </td>
              <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">
                {movement.movement_type === 'Sale' && movement.reference_id ? (
                  <Link href={`/sales?view_id=${movement.reference_id}`} className="font-mono text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 block">
                    {movement.notes || movement.reference_id}
                  </Link>
                ) : (
                  <>
                    {movement.reference_id && <div className="font-mono text-zinc-400 text-[10px] truncate w-32">{movement.reference_id}</div>}
                    {movement.notes && <div className="mt-0.5">{movement.notes}</div>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
