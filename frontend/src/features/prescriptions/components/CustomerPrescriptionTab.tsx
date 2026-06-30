import { useCustomerPrescriptions } from '../services/prescription.api';
import { FileText, CheckCircle2, XCircle, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CustomerPrescriptionTab({ customerId }: { customerId: string }) {
  const { data: prescriptionsData, isLoading } = useCustomerPrescriptions(customerId);
  const prescriptions = prescriptionsData?.items;

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse">Loading prescriptions...</div>;

  const getStatusBadge = (status: string, validUntil?: string) => {
    const isExpired = validUntil && new Date(validUntil) < new Date();
    const finalStatus = status === 'Active' && isExpired ? 'Expired' : status;

    switch (finalStatus) {
      case 'Active': return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 size={12} /> Active</span>;
      case 'Expired': return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle size={12} /> Expired</span>;
      case 'Fulfilled': return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle2 size={12} /> Fulfilled</span>;
      default: return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"><Clock size={12} /> {status}</span>;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Prescription History</h3>
        <Link
          href="/prescriptions/create"
          className="rounded-md bg-blue-60 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
        >
          + Add Prescription
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Rx ID</th>
              <th className="p-4 font-medium">Doctor</th>
              <th className="p-4 font-medium">Diagnosis</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Expiry</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!prescriptions || prescriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">No prescriptions found.</td>
              </tr>
            ) : (
              prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-4 font-mono text-xs text-zinc-500">{rx.id.split('-')[0].toUpperCase()}</td>
                  <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">Dr. {rx.doctor_name || 'Unknown'}</td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">{rx.diagnosis || '-'}</td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {rx.prescription_date ? format(new Date(rx.prescription_date), 'MMM dd, yyyy') : '-'}
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {rx.valid_until ? format(new Date(rx.valid_until), 'MMM dd, yyyy') : '-'}
                  </td>
                  <td className="p-4">{getStatusBadge(rx.status, rx.valid_until)}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/prescriptions/${rx.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye size={16} /> View
                    </Link>
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
