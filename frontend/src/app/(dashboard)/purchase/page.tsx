'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Link from 'next/link';
import { ShoppingCart, Users, Receipt, CreditCard, ArrowRight, Package } from 'lucide-react';
import { PurchaseOrder, GRN, PurchaseInvoice } from '@/features/purchase/types/purchase';

export default function PurchaseDashboardPage() {
  // We can fetch data here to summarize, or use dedicated analytics endpoints.
  // Assuming basic endpoint calls to aggregate locally for now
  const { data: pos } = useQuery({ queryKey: ['purchase_orders'], queryFn: async () => (await api.get('/api/v1/purchase/orders')).data as PurchaseOrder[] });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: async () => (await api.get('/api/v1/purchase/invoices')).data as PurchaseInvoice[] });
  
  // Use the new dashboard API for KPIs
  const { data: summary } = useQuery({ queryKey: ['purchase_summary'], queryFn: async () => (await api.get('/api/v1/dashboard/purchase-summary')).data });

  const pendingPOs = pos?.filter(po => po.status === 'Approved' || po.status === 'Draft').length || 0;
  const outstandingPayables = invoices?.filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
    .reduce((acc, inv) => acc + (inv.total_amount - inv.amount_paid), 0) || 0;
  const unpaidInvoices = invoices?.filter(inv => inv.status === 'Unpaid' || inv.status === 'Partially Paid').length || 0;
  
  const pendingRequests = summary?.pending_purchase_requests || 0;
  const pendingApprovals = summary?.pending_approvals || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Purchase & Procurement
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Overview of your supplier network, purchase orders, and accounts payable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending POs</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{pendingPOs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
              <Receipt className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Outstanding Payables</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Rs {outstandingPayables.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{unpaidInvoices}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Suppliers</p>
              <Link href="/purchase/suppliers" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Manage &rarr;</Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/30">
              <ShoppingCart className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Requests</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Approvals</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{pendingApprovals}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Quick Actions</h3>
          </div>
          <div className="p-4 flex-1 grid grid-cols-2 gap-4">
            <Link href="/purchase/requests" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-indigo-500 hover:bg-indigo-50 dark:border-zinc-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20 transition-colors text-center">
              <ShoppingCart className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Requests</span>
            </Link>
            <Link href="/purchase/quotations" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-teal-500 hover:bg-teal-50 dark:border-zinc-800 dark:hover:border-teal-500 dark:hover:bg-teal-900/20 transition-colors text-center">
              <Receipt className="h-8 w-8 text-teal-600 dark:text-teal-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Quotations</span>
            </Link>
            <Link href="/purchase/orders/create" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors text-center">
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Create PO</span>
            </Link>
            <Link href="/purchase/suppliers" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 transition-colors text-center">
              <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Suppliers</span>
            </Link>
            <Link href="/purchase/invoices" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-red-500 hover:bg-red-50 dark:border-zinc-800 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors text-center">
              <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Pay Invoices</span>
            </Link>
            <Link href="/purchase/orders" className="flex flex-col items-center justify-center p-6 rounded-lg border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 dark:border-zinc-800 dark:hover:border-amber-500 dark:hover:bg-amber-900/20 transition-colors text-center">
              <ArrowRight className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-2" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">All POs</span>
            </Link>
            <Link href="/purchase/returns" className="col-span-2 flex flex-col items-center justify-center p-4 rounded-lg border border-zinc-200 hover:border-purple-500 hover:bg-purple-50 dark:border-zinc-800 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 transition-colors text-center">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Manage PO Returns</span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Recent Purchase Orders</h3>
            <Link href="/purchase/orders" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">View All</Link>
          </div>
          <div className="p-0 flex-1">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {pos?.slice(0, 5).map((po) => (
                  <tr key={po.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/purchase/orders/${po.id}`} className="hover:text-blue-600">{po.order_number}</Link>
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{po.status}</td>
                    <td className="p-4 text-right font-mono font-medium">Rs {po.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
