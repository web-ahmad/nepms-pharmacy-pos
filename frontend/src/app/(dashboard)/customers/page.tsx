'use client';

import CustomerTable from '@/features/crm/components/CustomerTable';
import { useCustomers } from '@/features/crm/services/crm.api';
import { Users, CreditCard, Award, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const { data: customers } = useCustomers();

  const totalCustomers = customers?.length || 0;
  const activeCustomers = customers?.filter(c => c.current_balance > 0 || c.loyalty_points > 0).length || 0; // rough active proxy
  const creditOutstanding = customers?.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0) || 0;
  const loyaltyMembers = customers?.filter(c => c.loyalty_points > 0 || c.loyalty_tier !== 'Bronze').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Customer Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your patient relationships, credit ledgers, and loyalty programs.
          </p>
        </div>
        <Link
          href="/customers/create"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Add Customer
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Customers</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active (approx)</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
              <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Credit Outstanding</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Rs {creditOutstanding.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loyalty Members</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{loyaltyMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {customers && customers.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Award size={20} className="text-amber-500" /> Top Customers (by Loyalty)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...customers].sort((a, b) => b.loyalty_points - a.loyalty_points).slice(0, 3).map((cust, idx) => (
              <div key={cust.id} className="p-4 rounded-lg border border-amber-100 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-300 font-bold">
                  #{idx + 1}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{cust.full_name}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">{cust.loyalty_points} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CustomerTable />
    </div>
  );
}
