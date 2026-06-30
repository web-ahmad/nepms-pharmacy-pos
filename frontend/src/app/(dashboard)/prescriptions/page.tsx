'use client';

import PrescriptionTable from '@/features/prescriptions/components/PrescriptionTable';
import { usePrescriptions } from '@/features/prescriptions/services/prescription.api';
import { FileText, CheckCircle2, XCircle, Activity } from 'lucide-react';
import Link from 'next/link';

export default function PrescriptionsPage() {
  const { data: prescriptionsData } = usePrescriptions();
  const prescriptions = prescriptionsData?.items || [];

  const totalPrescriptions = prescriptionsData?.total || 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePrescriptions = prescriptions.filter(p => p.status === 'Active' && (!p.valid_until || new Date(p.valid_until) >= today)).length || 0;
  const expiredPrescriptions = prescriptions.filter(p => (p.status === 'Expired') || (p.status === 'Active' && p.valid_until && new Date(p.valid_until) < today)).length || 0;
  const dispensedToday = prescriptions.filter(p => p.status === 'Fulfilled' && new Date(p.updated_at) >= today).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Prescription Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage digital Rx, monitor expiries, and process prescription fulfillment.
          </p>
        </div>
        <Link
          href="/prescriptions/create"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Add Prescription
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Prescriptions</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalPrescriptions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Prescriptions</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activePrescriptions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Expired</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{expiredPrescriptions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Dispensed Today</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{dispensedToday}</p>
            </div>
          </div>
        </div>
      </div>

      <PrescriptionTable />
    </div>
  );
}
