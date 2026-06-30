import { useBatches } from '../services/inventory.api';
import { PackageX } from 'lucide-react';

interface BatchDetailsProps {
  medicineId: string;
}

export default function BatchDetails({ medicineId }: BatchDetailsProps) {
  const { data: batches, isLoading, isError } = useBatches(medicineId);

  if (isLoading) return <div className="animate-pulse h-32 bg-zinc-50 dark:bg-zinc-900 rounded-lg"></div>;
  if (isError) return <div className="text-red-500 text-sm">Failed to load batches.</div>;

  if (!batches || batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-500 border rounded-lg dark:border-zinc-800">
        <PackageX className="h-10 w-10 text-zinc-300 mb-3" />
        <p>No batches found for this medicine.</p>
        <p className="text-xs mt-1">Batches are automatically created when processing a Purchase Order (GRN).</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
          <tr>
            <th className="p-3 font-medium">Batch Number</th>
            <th className="p-3 font-medium">Expiry Date</th>
            <th className="p-3 font-medium text-right">Purchase Price</th>
            <th className="p-3 font-medium text-right">Selling Price</th>
            <th className="p-3 font-medium text-right">Qty</th>
            <th className="p-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950">
          {batches.map((batch) => (
            <tr key={batch.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="p-3 font-mono text-zinc-900 dark:text-zinc-100">{batch.batch_number}</td>
              <td className="p-3 text-zinc-600 dark:text-zinc-400">{batch.expiry_date}</td>
              <td className="p-3 text-right font-mono">Rs {batch.purchase_price.toFixed(2)}</td>
              <td className="p-3 text-right font-mono">Rs {batch.selling_price.toFixed(2)}</td>
              <td className="p-3 text-right font-mono font-medium">{batch.current_quantity}</td>
              <td className="p-3 text-center">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  batch.status === 'Active' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {batch.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
