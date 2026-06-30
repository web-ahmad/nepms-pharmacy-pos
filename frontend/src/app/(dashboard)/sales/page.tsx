'use client';

import React, { useState } from 'react';
import SalesHistory from '@/features/sales/components/SalesHistory';
import ReturnLogs from '@/features/sales/components/ReturnLogs';
import { History, ClipboardList, TrendingUp, DollarSign, ArrowDownRight, Users, Sparkles } from 'lucide-react';
import { useSalesHistory, useReturnLogs } from '@/features/sales/services/sales.api';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'returns'>('history');

  // Load KPI metrics data
  const { data: salesData } = useSalesHistory({ page: 1, limit: 100 });
  const { data: returnsData } = useReturnLogs({});

  const totalSalesCount = salesData?.total || 0;
  const totalRevenue = salesData?.items.reduce((sum, item) => sum + item.total_amount, 0) || 0;
  const totalRefunded = returnsData?.reduce((sum, item) => sum + item.total_amount, 0) || 0;
  const netRevenue = totalRevenue - totalRefunded;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 md:px-6 py-6 text-slate-800 animate-fadeIn bg-slate-50/50 rounded-3xl min-h-screen font-premium-sans">
      
      {/* Decorative Light Radial Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-[100px] pointer-events-none animate-fadeIn" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-50/30 rounded-full blur-[120px] pointer-events-none animate-fadeIn" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <Sparkles size={12} className="text-emerald-500 animate-pulse" />
            <span>Sales & Returns Terminal</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-premium-heading">
            Sales & Returns Manager
          </h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Monitor real-time pharmacy invoices, run item-wise pro-rated returns, and inspect detailed audit trails from a single sleek cockpit.
          </p>
        </div>
      </div>

      {/* KPI Dashboard Cards Section (White Themed) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 relative z-10">
        
        {/* KPI 1: Gross Sales */}
        <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Sales</span>
              <p className="text-2xl font-bold text-slate-950 font-mono tracking-tight">Rs {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform duration-350">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium">
            From last {totalSalesCount} transactions
          </p>
        </div>

        {/* KPI 2: Total Refunds */}
        <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-rose-300">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Refunded</span>
              <p className="text-2xl font-bold text-slate-950 font-mono tracking-tight">Rs {totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform duration-350">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium">
            Processed via return logs
          </p>
        </div>

        {/* KPI 3: Net Revenue */}
        <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-300">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Revenue</span>
              <p className="text-2xl font-bold text-slate-950 font-mono tracking-tight">Rs {netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform duration-350">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium">
            Post-refund net proceeds
          </p>
        </div>

        {/* KPI 4: Transactions */}
        <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-300">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactions</span>
              <p className="text-2xl font-bold text-slate-950 font-mono tracking-tight">{totalSalesCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform duration-350">
              <Users size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium">
            Active and completed orders
          </p>
        </div>

      </div>

      {/* Navigation Tab Bar */}
      <div className="relative z-10 flex gap-2 border-b border-slate-200 pb-0.5">
        <button
          onClick={() => setActiveTab('history')}
          className={`group py-3.5 px-5 font-semibold text-sm flex items-center gap-2 border-b-2 transition duration-300 outline-none select-none ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <History size={16} className="transition-transform duration-300 group-hover:rotate-[-10deg]" />
          Sales History
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`group py-3.5 px-5 font-semibold text-sm flex items-center gap-2 border-b-2 transition duration-300 outline-none select-none ${
            activeTab === 'returns'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ClipboardList size={16} className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
          Return Logs & Audits
        </button>
      </div>

      {/* Active Tab View */}
      <div className="relative z-10 transition-all duration-300">
        {activeTab === 'history' ? (
          <div className="animate-slideUp"><SalesHistory /></div>
        ) : (
          <div className="animate-slideUp"><ReturnLogs /></div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
