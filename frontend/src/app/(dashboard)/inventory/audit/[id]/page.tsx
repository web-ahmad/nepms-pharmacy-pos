'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAuditSession, useAuditSessionSummary, useUpdatePhysicalCount,
  useSubmitAuditSession, useReconcileAuditSession, useSyncAuditSession,
  useReconcileAuditItem
} from '@/features/inventory/services/audit.api';
import {
  ArrowLeft, Search, Save, Send, ShieldCheck, Printer,
  AlertTriangle, Check, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

export default function AuditSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { data: session, isLoading } = useAuditSession(id);
  const { data: summary, isLoading: summaryLoading } = useAuditSessionSummary(id);

  const updateCount = useUpdatePhysicalCount();
  const submitSession = useSubmitAuditSession();
  const reconcileSession = useReconcileAuditSession();
  const syncSession = useSyncAuditSession();
  const reconcileItem = useReconcileAuditItem();

  const [search, setSearch] = useState('');
  const [localCounts, setLocalCounts] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<'dosage_form' | 'none'>('dosage_form');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      const savedCountsStr = localStorage.getItem(`audit_${session.id}_draft`);
      const savedCounts = savedCountsStr ? JSON.parse(savedCountsStr) : {};

      const initialCounts: Record<string, string> = { ...savedCounts };
      session.items.forEach(item => {
        if (item.physical_count !== null) {
          initialCounts[item.id] = item.physical_count.toString();
        }
      });
      setLocalCounts(initialCounts);
    }
  }, [session]);

  const saveDraft = (newCounts: Record<string, string>) => {
    if (session) localStorage.setItem(`audit_${session.id}_draft`, JSON.stringify(newCounts));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  if (isLoading || !session) {
    return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const isPendingApproval = session.status === 'Pending Approval';
  const isCompleted = session.status === 'Completed';
  const isReviewMode = isPendingApproval || isCompleted;

  const handleCountChange = (itemId: string, value: string) => {
    setLocalCounts(prev => {
      const updated = { ...prev, [itemId]: value };
      saveDraft(updated);
      return updated;
    });
  };

  const handleCountBlur = async (itemId: string) => {
    const val = localCounts[itemId];
    if (val !== undefined && val !== '') {
      await updateCount.mutateAsync({ sessionId: session.id, itemId, count: parseInt(val) });
    }
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search) {
      const item = session.items.find(i =>
        (i.sku && i.sku.toLowerCase() === search.toLowerCase()) ||
        (i.medicine_name && i.medicine_name.toLowerCase().includes(search.toLowerCase())) ||
        (i.batch_number && i.batch_number.toLowerCase() === search.toLowerCase())
      );
      if (item) {
        const currentVal = parseInt(localCounts[item.id] || '0');
        const newVal = (currentVal + 1).toString();
        setLocalCounts(prev => {
          const updated = { ...prev, [item.id]: newVal };
          saveDraft(updated);
          return updated;
        });
        await updateCount.mutateAsync({ sessionId: session.id, itemId: item.id, count: parseInt(newVal) });
        setSearch('');
      }
    }
  };

  const handleSubmit = async () => {
    if (confirm("Submit this audit for Admin approval? Auditors will not be able to make further changes.")) {
      await submitSession.mutateAsync(session.id);
      localStorage.removeItem(`audit_${session.id}_draft`);
    }
  };

  const handleReconcileItem = async (itemId: string) => {
    await reconcileItem.mutateAsync({ sessionId: session.id, itemId });
  };

  const handleReconcile = async () => {
    if (confirm("Approve & Finalize Reconciliation?\n\nThis will update the master inventory stock to match the physical counts. This action is IRREVERSIBLE.\n\nProceed?")) {
      await reconcileSession.mutateAsync(session.id);
    }
  };

  const handleForceRefresh = async () => {
    if (confirm("Force Refresh? This will pull any new items that match this session's scope into the list.")) {
      await syncSession.mutateAsync(session.id);
    }
  };

  const filteredItems = session.items.filter(item =>
    item.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.batch_number && item.batch_number.toLowerCase().includes(search.toLowerCase()))
  );

  // Build ordered groups with valuation
  const HIGH_VALUE_THRESHOLD = 50000; // Rs 50,000

  const groupedItems = (() => {
    if (groupBy === 'none' || search) return [{ label: null, items: filteredItems, groupValue: 0 }];
    const map = new Map<string, typeof filteredItems>();
    [...filteredItems]
      .sort((a, b) => {
        const af = (a.dosage_form || 'Unknown').toUpperCase();
        const bf = (b.dosage_form || 'Unknown').toUpperCase();
        if (af !== bf) return af.localeCompare(bf);
        return a.medicine_name.localeCompare(b.medicine_name);
      })
      .forEach(item => {
        const key = item.dosage_form?.trim() || 'Unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });
    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items,
      groupValue: items.reduce((sum, i) => sum + i.system_quantity * i.unit_price, 0),
    }));
  })();

  // Rack-level total capital (all items, not just filtered)
  const rackTotalCapital = session.items.reduce((sum, i) => sum + i.system_quantity * i.unit_price, 0);
  const rackTotalVariance = session.items.reduce((sum, i) => sum + (i.variance ?? 0) * i.unit_price, 0);

  // Dosage form → color mapping
  const dosageColors: Record<string, { bg: string; text: string; border: string; dot: string; headerBg: string }> = {
    Tablet: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', headerBg: 'bg-blue-50/80 dark:bg-blue-900/30' },
    Syrup: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500', headerBg: 'bg-purple-50/80 dark:bg-purple-900/30' },
    Capsule: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', headerBg: 'bg-amber-50/80 dark:bg-amber-900/30' },
    Injection: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-900/30' },
    Drops: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500', headerBg: 'bg-cyan-50/80 dark:bg-cyan-900/30' },
    Cream: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800', dot: 'bg-pink-500', headerBg: 'bg-pink-50/80 dark:bg-pink-900/30' },
    Unknown: { bg: 'bg-zinc-50 dark:bg-zinc-800/50', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700', dot: 'bg-zinc-400', headerBg: 'bg-zinc-50 dark:bg-zinc-800/40' },
  };
  const getColor = (form: string | null) => dosageColors[form || 'Unknown'] || dosageColors['Unknown'];

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      {/* Main UI (Hidden during print) */}
      <div className="space-y-6 max-w-7xl mx-auto pb-10 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <button onClick={() => router.back()} className="flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Audits
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {isCompleted ? 'Audit Report' : isPendingApproval ? 'Pending Admin Approval' : 'Physical Inventory Audit'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                isPendingApproval ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                {session.status}
              </span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
              {session.name} • {session.scope_type}: {session.scope_value}
            </p>
          </div>

          <div className="flex gap-3">
            {isReviewMode && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-10 px-4 py-2 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" /> Print Report
              </button>
            )}

            {session.status === 'In Progress' && (
              <>
                <button
                  onClick={handleForceRefresh}
                  disabled={syncSession.isPending}
                  className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-10 px-4 py-2 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {syncSession.isPending ? 'Syncing...' : 'Force Refresh'}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitSession.isPending}
                  className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 h-10 px-4 py-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitSession.isPending ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </>
            )}

            {isPendingApproval && (
              <button
                onClick={handleReconcile}
                disabled={reconcileSession.isPending}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {reconcileSession.isPending ? 'Finalizing...' : 'Approve & Finalize'}
              </button>
            )}
          </div>
        </div>

        {/* Rack Total Capital — always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <div className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-1"> Rack Total Capital</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{formatCurrency(rackTotalCapital)}</div>
            <div className="text-xs text-zinc-500 mt-1">At purchase price • {session.items.length} SKUs</div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <div className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-1"> Items Counted</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {session.items.filter(i => i.physical_count !== null).length}
              <span className="text-lg text-zinc-400 font-normal"> / {session.items.length}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {Math.round(session.items.filter(i => i.physical_count !== null).length / session.items.length * 100)}% complete
            </div>
          </div>
          <div className={`p-5 rounded-2xl shadow-sm border ${rackTotalVariance < 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' :
            rackTotalVariance > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' :
              'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}>
            <div className={`text-xs uppercase font-bold tracking-wider mb-1 ${rackTotalVariance < 0 ? 'text-red-500' : rackTotalVariance > 0 ? 'text-emerald-600' : 'text-zinc-400'
              }`}> Net Variance Value</div>
            <div className={`text-2xl font-bold ${rackTotalVariance < 0 ? 'text-red-600 dark:text-red-400' :
              rackTotalVariance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
              }`}>
              {rackTotalVariance > 0 ? '+' : ''}{formatCurrency(rackTotalVariance)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Based on counted items only</div>
          </div>
        </div>

        {/* Analytics Summary for Review Mode */}
        {isReviewMode && summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-6 rounded-2xl flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold text-red-500 tracking-wider mb-1 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Total Shrinkage (Lost)</span>
              <span className="text-3xl font-bold text-red-600 dark:text-red-500">-{formatCurrency(summary.total_shrinkage_value)}</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-6 rounded-2xl flex flex-col justify-center items-center">
              <span className="text-xs uppercase font-bold text-emerald-500 tracking-wider mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Total Surplus (Gained)</span>
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">+{formatCurrency(summary.total_surplus_value)}</span>
            </div>
            <div className={`border p-6 rounded-2xl flex flex-col justify-center items-center ${summary.total_variance_value < 0
              ? 'bg-blue-600 border-blue-700 text-white'
              : summary.total_variance_value > 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100'
              }`}>
              <span className="text-xs uppercase font-bold opacity-80 tracking-wider mb-1">Net Financial Impact</span>
              <span className="text-3xl font-bold">
                {summary.total_variance_value < 0 ? '-' : summary.total_variance_value > 0 ? '+' : ''}
                {formatCurrency(Math.abs(summary.total_variance_value))}
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[500px]">

          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan Barcode or Search Medication..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-zinc-200"
              />
            </div>

            {!isReviewMode && (
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {Object.values(localCounts).filter(v => v !== '').length}
                  </span> / {session.items.length} Items Counted
                </div>
                <button
                  onClick={() => setGroupBy(g => g === 'dosage_form' ? 'none' : 'dosage_form')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${groupBy === 'dosage_form'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                    }`}
                >
                  {groupBy === 'dosage_form' ? '⊞ Grouped' : '≡ Flat'}
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-zinc-950 sticky top-0 shadow-sm z-10 text-zinc-500 dark:text-zinc-400 uppercase text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Product Name & SKU</th>
                  <th className="px-6 py-4 text-center">System Qty</th>
                  <th className="px-6 py-4 text-center">{isReviewMode ? 'Physical Count' : 'Enter Count'}</th>
                  <th className="px-6 py-4 text-center">Variance</th>
                  {isReviewMode ? (
                    <>
                      <th className="px-6 py-4 text-right">Financial Impact</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </>
                  ) : (
                    <th className="px-6 py-4 text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {groupedItems.map(({ label, items: groupItems, groupValue }) => (
                  <React.Fragment key={label || '__all__'}>
                    {/* Group header row with valuation */}
                    {label && (() => {
                      const c = getColor(label);
                      const isHighValue = groupValue >= HIGH_VALUE_THRESHOLD;
                      const groupVariance = groupItems.reduce((sum, i) => sum + (i.variance ?? 0) * i.unit_price, 0);
                      return (
                        <tr className={`${c.headerBg} border-y ${c.border}`}>
                          <td colSpan={isReviewMode ? 6 : 5} className="px-6 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                              <span className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>
                                ── {label.toUpperCase()}S ──
                              </span>
                              <span className={`text-xs font-medium ${c.text} opacity-70`}>
                                {groupItems.length} item{groupItems.length !== 1 ? 's' : ''}
                              </span>
                              {/* Group Total Value */}
                              <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                                {formatCurrency(groupValue)}
                              </span>
                              {/* Risk Score Badge */}
                              {isHighValue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 animate-pulse">
                                  ⚠ HIGH VALUE ASSET
                                </span>
                              )}
                              {/* Group variance (only when items have been counted) */}
                              {groupVariance !== 0 && (
                                <span className={`ml-auto text-xs font-semibold ${groupVariance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                  {groupVariance > 0 ? '+' : ''}{formatCurrency(groupVariance)} variance
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Item rows */}
                    {groupItems.map((item) => {
                      const variance = item.variance;
                      const status = variance === 0 ? 'MATCHED' : (variance && variance < 0 ? 'SHRINKAGE' : 'SURPLUS');
                      const impact = variance ? variance * item.unit_price : 0;
                      const c = getColor(item.dosage_form);

                      return (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.medicine_name}</div>
                                <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-2 items-center">
                                  {item.dosage_form && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${c.bg} ${c.text} border ${c.border}`}>
                                      {item.dosage_form}
                                    </span>
                                  )}
                                  {item.strength && (
                                    <span className="text-zinc-500 dark:text-zinc-400">{item.strength}</span>
                                  )}
                                  {item.sku && <span>SKU: {item.sku}</span>}
                                  {item.batch_number && (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">Batch: {item.batch_number}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center font-medium">
                            {isReviewMode || !session.is_blind || item.physical_count !== null ? (
                              <span className="text-zinc-600 dark:text-zinc-400">{item.system_quantity}</span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600 italic">Hidden</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {!isReviewMode ? (
                              <input
                                type="number"
                                value={localCounts[item.id] || ''}
                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                onBlur={() => handleCountBlur(item.id)}
                                className={`w-24 text-center px-3 py-2 bg-white dark:bg-zinc-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-lg dark:text-zinc-100 ${item.variance !== null && item.variance !== 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-zinc-300 dark:border-zinc-700'}`}
                                placeholder="0"
                              />
                            ) : (
                              <span className="font-medium text-lg">{item.physical_count ?? '-'}</span>
                            )}
                          </td>

                          <td className={`px-6 py-4 text-center font-bold text-lg ${variance === 0 || variance === null ? 'text-zinc-400' : variance < 0 ? 'text-red-500' : 'text-emerald-500'
                            }`}>
                            {variance !== null ? `${variance > 0 ? '+' : ''}${variance}` : '-'}
                          </td>

                          {isReviewMode ? (
                            <>
                              <td className={`px-6 py-4 text-right font-medium ${impact === 0 ? 'text-zinc-400' : impact < 0 ? 'text-red-500' : 'text-emerald-500'
                                }`}>
                                {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${status === 'MATCHED' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                                  status === 'SHRINKAGE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  }`}>
                                  {status === 'SHRINKAGE' ? '⚠ SHORTAGE' : status === 'SURPLUS' ? '↑ SURPLUS' : '✓ MATCHED'}
                                </span>
                              </td>
                            </>
                          ) : (
                            <td className="px-6 py-4 text-right">
                              {item.physical_count !== null && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.variance === 0
                                  ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  : (item.variance ?? 0) < 0
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  }`}>
                                  {item.variance === 0 ? '✓ Matched' : (item.variance ?? 0) < 0 ? '⚠ Shortage' : '↑ Surplus'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable Template (Only visible during print) */}
      <div id="print-section" className="hidden print:block bg-white text-black p-8 font-sans w-full min-h-screen text-[13px]">

        {/* ── Page Header ── */}
        <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Physical Audit Report</h1>
            <h2 className="text-base font-semibold text-gray-600 mt-1">{session.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{session.scope_type}: <strong>{session.scope_value}</strong></p>
          </div>
          <div className="text-right text-sm text-black space-y-0.5">
            <p><strong>Session ID:</strong> {session.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> {format(new Date(), 'PPP')}</p>
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Blind Audit:</strong> {session.is_blind ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* ── Rack Capital Summary Boxes ── */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <div className="border-2 border-black p-4 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Rack Total Capital</p>
            <p className="text-xl font-bold text-black mt-1">{formatCurrency(rackTotalCapital)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">At purchase price</p>
          </div>
          <div className="border border-gray-300 p-4 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total SKUs</p>
            <p className="text-xl font-bold text-black mt-1">{session.items.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Items in scope</p>
          </div>
          <div className="border border-gray-300 p-4 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Items Counted</p>
            <p className="text-xl font-bold text-black mt-1">
              {session.items.filter((i: any) => i.physical_count !== null).length}
              <span className="text-sm font-normal text-gray-500"> / {session.items.length}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {Math.round(session.items.filter((i: any) => i.physical_count !== null).length / session.items.length * 100)}% complete
            </p>
          </div>
          <div className={`border-2 p-4 rounded-lg ${rackTotalVariance < 0 ? 'border-red-600' : rackTotalVariance > 0 ? 'border-green-600' : 'border-gray-300'}`}>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Net Variance Value</p>
            <p className={`text-xl font-bold mt-1 ${rackTotalVariance < 0 ? 'text-red-700' : rackTotalVariance > 0 ? 'text-green-700' : 'text-black'}`}>
              {rackTotalVariance > 0 ? '+' : ''}{formatCurrency(rackTotalVariance)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Counted items only</p>
          </div>
        </div>

        {/* ── Shrinkage / Surplus Summary (Review mode only) ── */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-7">
            <div className="border border-red-300 bg-red-50 p-4 rounded-lg">
              <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Total Shrinkage (Lost)</p>
              <p className="text-xl font-bold text-red-700 mt-1">-{formatCurrency(summary.total_shrinkage_value)}</p>
            </div>
            <div className="border border-green-300 bg-green-50 p-4 rounded-lg">
              <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider">Total Surplus (Gained)</p>
              <p className="text-xl font-bold text-green-700 mt-1">+{formatCurrency(summary.total_surplus_value)}</p>
            </div>
            <div className="border-2 border-black bg-black p-4 rounded-lg">
              <p className="text-[10px] uppercase font-bold text-gray-300 tracking-wider">Net Financial Impact</p>
              <p className="text-xl font-bold text-white mt-1">
                {summary.total_variance_value < 0 ? '-' : summary.total_variance_value > 0 ? '+' : ''}
                {formatCurrency(Math.abs(summary.total_variance_value))}
              </p>
            </div>
          </div>
        )}

        {/* ── Grouped Items Table ── */}
        {(() => {
          // Build print groups (same logic as screen)
          const printMap = new Map<string, typeof session.items>();
          [...session.items]
            .sort((a: any, b: any) => {
              const af = (a.dosage_form || 'Unknown').toUpperCase();
              const bf = (b.dosage_form || 'Unknown').toUpperCase();
              if (af !== bf) return af.localeCompare(bf);
              return a.medicine_name.localeCompare(b.medicine_name);
            })
            .forEach((item: any) => {
              const key = item.dosage_form?.trim() || 'Unknown';
              if (!printMap.has(key)) printMap.set(key, []);
              printMap.get(key)!.push(item);
            });

          const printGroups = Array.from(printMap.entries()).map(([label, items]) => ({
            label,
            items,
            groupValue: items.reduce((s: number, i: any) => s + i.system_quantity * i.unit_price, 0),
          }));

          return (
            <table className="w-full text-left text-xs mb-10 border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 px-1 font-bold text-left w-[32%]">Product / Batch</th>
                  <th className="py-2 px-1 font-bold text-center w-[8%]">Type</th>
                  <th className="py-2 px-1 font-bold text-center w-[9%]">Sys Qty</th>
                  <th className="py-2 px-1 font-bold text-center w-[9%]">Physical</th>
                  <th className="py-2 px-1 font-bold text-center w-[8%]">Variance</th>
                  <th className="py-2 px-1 font-bold text-right w-[14%]">Unit Price</th>
                  <th className="py-2 px-1 font-bold text-right w-[14%]">Fin. Impact</th>
                  <th className="py-2 px-1 font-bold text-center w-[6%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {printGroups.map(({ label, items: gItems, groupValue: gVal }) => (
                  <React.Fragment key={`print-group-${label}`}>
                    {/* Group separator row */}
                    <tr key={`hdr-${label}`} className="bg-gray-100 border-t border-b border-gray-400">
                      <td colSpan={8} className="py-1.5 px-2">
                        <div className="flex items-center gap-3">
                          <span className="font-bold uppercase tracking-widest text-[10px] text-gray-700">
                            ── {label.toUpperCase()}S ──
                          </span>
                          <span className="text-[10px] text-gray-500">{gItems.length} items</span>
                          <span className="text-[10px] font-bold text-gray-700 border border-gray-400 px-1.5 py-0.5 rounded">
                            Group Value: {formatCurrency(gVal)}
                          </span>
                          {gVal >= HIGH_VALUE_THRESHOLD && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 border border-orange-500 text-orange-700 rounded">
                              !! HIGH VALUE ASSET
                            </span>
                          )}
                          {(() => {
                            const gVar = gItems.reduce((s: number, i: any) => s + (i.variance ?? 0) * i.unit_price, 0);
                            return gVar !== 0 ? (
                              <span className={`ml-auto text-[10px] font-bold ${gVar < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {gVar > 0 ? '+' : ''}{formatCurrency(gVar)} variance
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    </tr>

                    {/* Item rows */}
                    {gItems.map((item: any) => {
                      const variance = item.variance ?? 0;
                      const impact = variance * item.unit_price;
                      const status = variance === 0 ? 'Matched' : variance < 0 ? 'Shortage' : 'Surplus';
                      return (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-1.5 px-1">
                            <div className="font-medium">{item.medicine_name}</div>
                            <div className="text-[10px] text-gray-500">
                              {item.strength && <span>{item.strength} </span>}
                              {item.batch_number && <span>| Batch: {item.batch_number}</span>}
                              {item.sku && <span> | SKU: {item.sku}</span>}
                            </div>
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <span className="text-[9px] font-bold uppercase border border-gray-400 px-1 py-0.5 rounded text-gray-600">
                              {item.dosage_form || '—'}
                            </span>
                          </td>
                          <td className="py-1.5 px-1 text-center font-medium">{item.system_quantity}</td>
                          <td className="py-1.5 px-1 text-center font-bold">{item.physical_count ?? '—'}</td>
                          <td className={`py-1.5 px-1 text-center font-bold ${variance < 0 ? 'text-red-700' : variance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                            {variance !== 0 ? (variance > 0 ? '+' : '') + variance : '—'}
                          </td>
                          <td className="py-1.5 px-1 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                          <td className={`py-1.5 px-1 text-right font-medium ${impact < 0 ? 'text-red-700' : impact > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                            {impact !== 0 ? (impact > 0 ? '+' : '') + formatCurrency(Math.abs(impact)) : '—'}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${
                              status === 'Shortage' ? 'border-red-500 text-red-700' :
                              status === 'Surplus'  ? 'border-green-600 text-green-700' :
                              'border-gray-300 text-gray-500'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Grand Total row */}
                <tr className="border-t-2 border-black bg-gray-50 font-bold">
                  <td colSpan={2} className="py-2 px-1">TOTAL</td>
                  <td className="py-2 px-1 text-center">{session.items.reduce((s: number, i: any) => s + i.system_quantity, 0)}</td>
                  <td className="py-2 px-1 text-center">
                    {session.items.filter((i: any) => i.physical_count !== null).reduce((s: number, i: any) => s + (i.physical_count ?? 0), 0) || '—'}
                  </td>
                  <td className={`py-2 px-1 text-center ${rackTotalVariance < 0 ? 'text-red-700' : rackTotalVariance > 0 ? 'text-green-700' : ''}`}>
                    {session.items.reduce((s: number, i: any) => s + (i.variance ?? 0), 0) || '—'}
                  </td>
                  <td className="py-2 px-1 text-right">{formatCurrency(rackTotalCapital)}</td>
                  <td className={`py-2 px-1 text-right ${rackTotalVariance < 0 ? 'text-red-700' : rackTotalVariance > 0 ? 'text-green-700' : ''}`}>
                    {rackTotalVariance !== 0 ? (rackTotalVariance > 0 ? '+' : '') + formatCurrency(Math.abs(rackTotalVariance)) : '—'}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          );
        })()}

        {/* ── Footer / Signatures ── */}
        <div className="flex justify-between items-end mt-16 pt-6 border-t border-gray-300">
          <div className="text-center w-56">
            <div className="border-t-2 border-black pt-2 font-bold text-black text-sm">Auditor Signature</div>
            <div className="text-xs text-gray-500 mt-2">Name: _________________________</div>
            <div className="text-xs text-gray-500 mt-1">Date: _________________________</div>
          </div>
          <div className="text-center text-[10px] text-gray-400 flex flex-col items-center gap-1">
            <p>Generated: {format(new Date(), 'PPP p')}</p>
            <p>NEPMS Pharmacy POS — Confidential</p>
          </div>
          <div className="text-center w-56">
            <div className="border-t-2 border-black pt-2 font-bold text-black text-sm">Manager / Super Admin</div>
            <div className="text-xs text-gray-500 mt-2">Name: _________________________</div>
            <div className="text-xs text-gray-500 mt-1">Date: _________________________</div>
          </div>
        </div>
      </div>
    </>
  );
}
