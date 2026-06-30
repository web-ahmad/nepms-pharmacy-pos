import { useCustomerLedger } from '../services/crm.api';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

export default function CustomerLedger({ customerId }: { customerId: string }) {
  const { data: ledgerEntries, isLoading, isError } = useCustomerLedger(customerId);

  if (isLoading) return <div className="h-48 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading ledger...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load ledger</div>;

  const handleExport = () => {
    if (!ledgerEntries?.length) return;
    const headers = ['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance', 'Notes'];
    const rows = ledgerEntries.map(e => [
      format(new Date(e.transaction_date), 'yyyy-MM-dd HH:mm'),
      e.transaction_type,
      e.reference_id,
      e.debit.toFixed(2),
      e.credit.toFixed(2),
      e.balance_after.toFixed(2),
      e.notes || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_ledger_${customerId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Ref ID</th>
              <th className="p-3 font-medium text-right text-red-600 dark:text-red-400">Debit (You Owe)</th>
              <th className="p-3 font-medium text-right text-green-600 dark:text-green-400">Credit (Paid)</th>
              <th className="p-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!ledgerEntries || ledgerEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No ledger entries found.</td>
              </tr>
            ) : (
              ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{format(new Date(entry.transaction_date), 'yyyy-MM-dd HH:mm')}</td>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.transaction_type}</td>
                  <td className="p-3 text-zinc-500 font-mono text-xs">{entry.reference_id}</td>
                  <td className="p-3 text-right font-mono text-red-600 dark:text-red-400">
                    {entry.debit > 0 ? `Rs ${entry.debit.toFixed(2)}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono text-green-600 dark:text-green-400">
                    {entry.credit > 0 ? `Rs ${entry.credit.toFixed(2)}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    Rs {entry.balance_after.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
