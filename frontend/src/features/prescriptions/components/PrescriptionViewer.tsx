'use client';

import { usePrescriptionDetails, useDeletePrescription } from '../services/prescription.api';
import { useCustomers } from '@/features/crm/services/crm.api';
import { FileText, Printer, Trash2, Edit, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrescriptionViewer({ id }: { id: string }) {
  const { data: prescription, isLoading } = usePrescriptionDetails(id);
  const { data: customers } = useCustomers();
  const deleteMutation = useDeletePrescription();
  const router = useRouter();

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse">Loading prescription details...</div>;
  if (!prescription) return <div className="p-8 text-center text-zinc-500">Prescription not found</div>;

  const customer = customers?.find(c => c.id === prescription.patient_id);
  const isExpired = prescription.valid_until && new Date(prescription.valid_until) < new Date();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this prescription?')) {
      await deleteMutation.mutateAsync(id);
      router.push('/prescriptions');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Rx {prescription.id.split('-')[0].toUpperCase()}
            </h2>
            <p className="text-zinc-500 text-sm">Created {format(new Date(prescription.created_at), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors">
            <Printer size={16} /> Print
          </button>
          <Link href={`/prescriptions/${id}/edit`} className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 transition-colors">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={handleDelete} className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 transition-colors">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {isExpired && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="font-medium">This prescription has expired. It cannot be used for further dispensing.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Patient & Doctor Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Patient Name</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{customer?.full_name}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{customer?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Doctor Name</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Dr. {prescription.doctor_name}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Diagnosis</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{prescription.diagnosis || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Validity</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-zinc-400" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {prescription.valid_until ? format(new Date(prescription.valid_until), 'MMM dd, yyyy') : 'No Expiry'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Prescribed Medicines ({prescription.items.length})</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 text-zinc-500 dark:bg-zinc-900/20">
                <tr>
                  <th className="p-4 font-medium">Medicine Name</th>
                  <th className="p-4 font-medium">Dosage</th>
                  <th className="p-4 font-medium">Frequency</th>
                  <th className="p-4 font-medium">Duration</th>
                  <th className="p-4 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {prescription.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {item.medicine_name}
                      {item.instructions && <div className="text-xs font-normal text-zinc-500 mt-1 italic">{item.instructions}</div>}
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{item.dosage || '-'}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{item.frequency || '-'}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{item.duration || '-'}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{item.quantity || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {prescription.image_url && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Original Document</h3>
              <a href={prescription.image_url} target="_blank" rel="noreferrer" className="block w-full border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                {prescription.image_url.endsWith('.pdf') ? (
                  <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center text-zinc-500">
                    <FileText size={48} className="mb-2 text-red-400" />
                    <span>View PDF</span>
                  </div>
                ) : (
                  <img src={prescription.image_url} alt="Prescription Scan" className="w-full object-cover" />
                )}
              </a>
            </div>
          )}

          {prescription.notes && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Notes</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{prescription.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
