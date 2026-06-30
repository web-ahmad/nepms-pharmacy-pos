import { useState } from 'react';
import { usePrescriptions } from '../services/prescription.api';
import { useCustomers } from '@/features/crm/services/crm.api';
import { Eye, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PrescriptionTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: prescriptionsData, isLoading, isError } = usePrescriptions(searchTerm);
  const prescriptions = prescriptionsData?.items || [];
  const { data: customers } = useCustomers();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse bg-zinc-50 dark:bg-zinc-900 rounded-lg">Loading...</div>;
  if (isError) return <div className="text-red-500 p-4">Failed to load prescriptions</div>;

  const getStatusBadge = (status: string, validUntil?: string) => {
    // Check if expired based on date if status is Active
    const isExpired = validUntil && new Date(validUntil) < new Date();
    const finalStatus = status === 'Active' && isExpired ? 'Expired' : status;

    switch (finalStatus) {
      case 'Active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 size={12} /> Active</span>;
      case 'Expired':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle size={12} /> Expired</span>;
      case 'Fulfilled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle2 size={12} /> Fulfilled</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"><XCircle size={12} /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"><Clock size={12} /> {status}</span>;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <input
          type="text"
          placeholder="Search prescriptions..."
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Rx ID</th>
              <th className="p-4 font-medium">Patient</th>
              <th className="p-4 font-medium">Doctor / Diagnosis</th>
              <th className="p-4 font-medium">Valid Until</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!prescriptions || prescriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No prescriptions found.</td>
              </tr>
            ) : (
              prescriptions.map((rx) => {
                const customer = customers?.find(c => c.id === rx.patient_id);
                return (
                  <tr key={rx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-zinc-500">
                      {rx.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {customer?.full_name || 'Unknown Patient'}
                      </div>
                      <div className="text-xs text-zinc-500">{customer?.phone || ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-zinc-900 dark:text-zinc-100 font-medium">Dr. {rx.doctor_name || 'Unknown'}</div>
                      <div className="text-xs text-zinc-500">{rx.diagnosis || 'No diagnosis'}</div>
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">
                      {rx.valid_until ? format(new Date(rx.valid_until), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(rx.status, rx.valid_until)}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/prescriptions/${rx.id}`}
                        className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                        title="View Prescription"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
