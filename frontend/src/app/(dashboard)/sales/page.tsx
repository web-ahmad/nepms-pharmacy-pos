'use client';

import React, { useState } from 'react';
import SalesHistory from '@/features/sales/components/SalesHistory';
import ReturnLogs from '@/features/sales/components/ReturnLogs';
import { History, ClipboardList, TrendingUp, ArrowDownRight, Users, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { useSalesHistory, useReturnLogs } from '@/features/sales/services/sales.api';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'returns'>('history');

  const { data: salesData } = useSalesHistory({ page: 1, limit: 100 });
  const { data: returnsData } = useReturnLogs({});

  const totalSalesCount = salesData?.total || 0;
  const totalRevenue   = salesData?.items.reduce((s, i) => s + i.total_amount, 0) || 0;
  const totalRefunded  = returnsData?.reduce((s, i) => s + i.total_amount, 0) || 0;
  const netRevenue     = totalRevenue - totalRefunded;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpis = [
    {
      label: 'Gross Sales',
      value: `Rs ${fmt(totalRevenue)}`,
      sub: `From ${totalSalesCount} transactions`,
      icon: <BarChart3 size={20} />,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      hoverBorder: 'hover:border-emerald-400',
    },
    {
      label: 'Total Refunded',
      value: `Rs ${fmt(totalRefunded)}`,
      sub: 'Processed via return logs',
      icon: <ArrowDownRight size={20} />,
      color: 'rose',
      gradient: 'from-rose-500 to-pink-500',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      hoverBorder: 'hover:border-rose-400',
    },
    {
      label: 'Net Revenue',
      value: `Rs ${fmt(netRevenue)}`,
      sub: 'Post-refund net proceeds',
      icon: <TrendingUp size={20} />,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      hoverBorder: 'hover:border-blue-400',
    },
    {
      label: 'Transactions',
      value: String(totalSalesCount),
      sub: 'Active and completed orders',
      icon: <Users size={20} />,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      hoverBorder: 'hover:border-amber-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8f6] px-4 md:px-8 py-6 space-y-6 font-sans relative overflow-hidden">

      {/* Background decorative glows */}
      <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-100/40 blur-[140px] -z-0" />
      <div className="pointer-events-none fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-teal-100/30 blur-[120px] -z-0" />

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-gray-200">
        <div className="space-y-2">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#006a43] text-white shadow-sm shadow-emerald-200"
            style={{ animation: 'sh-fadein 0.4s ease-out both' }}>
            <Zap size={11} className="fill-white" />
            Sales &amp; Returns Terminal
          </div>
          <h1 className="text-[28px] md:text-[34px] font-extrabold text-gray-900 tracking-tight leading-none"
            style={{ animation: 'sh-fadein 0.5s ease-out both 0.05s' }}>
            Sales &amp; Returns Manager
          </h1>
          <p className="text-[13px] text-gray-500 max-w-xl leading-relaxed"
            style={{ animation: 'sh-fadein 0.5s ease-out both 0.1s' }}>
            Monitor real-time pharmacy invoices, run item-wise pro-rated returns, and inspect detailed audit trails from a single sleek cockpit.
          </p>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`group relative bg-white rounded-2xl border ${kpi.border} ${kpi.hoverBorder} p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden`}
            style={{ animation: `sh-slideup 0.4s ease-out both ${0.05 * i + 0.1}s` }}
          >
            {/* Top gradient strip */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${kpi.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</span>
                <p className="text-[22px] font-extrabold text-gray-900 font-mono tracking-tight truncate">{kpi.value}</p>
              </div>
              <div className={`ml-3 p-2.5 rounded-xl ${kpi.bg} ${kpi.text} border ${kpi.border} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-3">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ───────────────────────────────────────────────────── */}
      <div className="relative z-10 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        style={{ animation: 'sh-fadein 0.5s ease-out both 0.3s' }}>
        <div className="flex border-b border-gray-100">
          {([
            { id: 'history',  label: 'Sales History',       icon: <History size={15} /> },
            { id: 'returns',  label: 'Return Logs & Audits', icon: <ClipboardList size={15} /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-6 py-4 text-[13px] font-semibold transition-all duration-200 outline-none select-none ${
                activeTab === tab.id
                  ? 'text-[#006a43]'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006a43] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === 'history'
            ? <div key="history" style={{ animation: 'sh-slideup 0.3s ease-out both' }}><SalesHistory /></div>
            : <div key="returns" style={{ animation: 'sh-slideup 0.3s ease-out both' }}><ReturnLogs /></div>
          }
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sh-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sh-slideup {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slideLeft {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />
    </div>
  );
}
