'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useAuditSession, useAuditSessionSummary, useUpdatePhysicalCount, 
  useSubmitAuditSession, useReconcileAuditSession 
} from '@/features/inventory/services/audit.api';
import { 
  ArrowLeft, Search, Save, Send, ShieldCheck, Printer, 
  AlertTriangle, Check, CheckCircle2, XCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function AuditSessionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, isLoading } = useAuditSession(params.id);
  const { data: summary, isLoading: summaryLoading } = useAuditSessionSummary(params.id);
  
  const updateCount = useUpdatePhysicalCount();
  const submitSession = useSubmitAuditSession();
  const reconcileSession = useReconcileAuditSession();

  const [search, setSearch] = useState('');
  const [localCounts, setLocalCounts] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      const initialCounts: Record<string, string> = {};
      session.items.forEach(item => {
        if (item.physical_count !== null) {
          initialCounts[item.id] = item.physical_count.toString();
        }
      });
      setLocalCounts(initialCounts);
    }
  }, [session]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  if (isLoading || !session) {
    return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const isReviewMode = session.status === 'Under Review' || session.status === 'Completed';

  const handleCountChange = (itemId: string, value: string) => {
    setLocalCounts(prev => ({ ...prev, [itemId]: value }));
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
        setLocalCounts(prev => ({ ...prev, [item.id]: newVal }));
        await updateCount.mutateAsync({ sessionId: session.id, itemId: item.id, count: parseInt(newVal) });
        setSearch('');
      }
    }
  };

  const handleSubmit = async () => {
    if (confirm("Submit audit for review? No more counts can be added.")) {
      await submitSession.mutateAsync(session.id);
    }
  };

  const handleReconcile = async () => {
    if (confirm("Approve & Reconcile? This will generate stock adjustments and sync physical counts to the master inventory. This action is irreversible.")) {
      await reconcileSession.mutateAsync(session.id);
    }
  };

  const filteredItems = session.items.filter(item => 
    item.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.batch_number && item.batch_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <button onClick={() => router.back()} className="flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Audits
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isReviewMode ? 'Physical Count Reconciliation' : 'Blind Inventory Audit'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              session.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
              session.status === 'Under Review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
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
            <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-10 px-4 py-2 text-zinc-700 dark:text-zinc-300">
              <Printer className="w-4 h-4 mr-2" /> Print Report
            </button>
          )}
          
          {session.status === 'In Progress' && (
            <button 
              onClick={handleSubmit}
              disabled={submitSession.isPending}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" /> 
              {submitSession.isPending ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
          
          {session.status === 'Under Review' && (
            <button 
              onClick={handleReconcile}
              disabled={reconcileSession.isPending}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> 
              {reconcileSession.isPending ? 'Reconciling...' : 'Approve & Reconcile'}
            </button>
          )}
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
          <div className={`border p-6 rounded-2xl flex flex-col justify-center items-center ${
            summary.total_variance_value < 0 
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
            <div className="text-sm font-medium text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {Object.values(localCounts).filter(v => v !== '').length}
              </span> / {session.items.length} Items Counted
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-zinc-950 sticky top-0 shadow-sm z-10 text-zinc-500 dark:text-zinc-400 uppercase text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">Product Name & SKU</th>
                {isReviewMode && <th className="px-6 py-4 text-center">System Qty</th>}
                <th className="px-6 py-4 text-center">{isReviewMode ? 'Physical Count' : 'Enter Count'}</th>
                {isReviewMode && (
                  <>
                    <th className="px-6 py-4 text-center">Variance</th>
                    <th className="px-6 py-4 text-right">Financial Impact</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredItems.map((item) => {
                const variance = item.variance;
                const status = variance === 0 ? 'MATCHED' : (variance && variance < 0 ? 'SHRINKAGE' : 'SURPLUS');
                const impact = variance ? variance * item.unit_price : 0;
                
                return (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.medicine_name}</div>
                      <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                        {item.sku && <span>SKU: {item.sku}</span>}
                        {item.batch_number && <span className="text-blue-600 dark:text-blue-400 font-medium">Batch: {item.batch_number}</span>}
                      </div>
                    </td>
                    
                    {isReviewMode && (
                      <td className="px-6 py-4 text-center font-medium text-zinc-600 dark:text-zinc-400">
                        {item.system_quantity}
                      </td>
                    )}
                    
                    <td className="px-6 py-4 text-center">
                      {!isReviewMode ? (
                        <input
                          type="number"
                          value={localCounts[item.id] || ''}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          onBlur={() => handleCountBlur(item.id)}
                          className="w-24 text-center px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-lg dark:text-zinc-100"
                          placeholder="0"
                        />
                      ) : (
                        <span className="font-medium text-lg">{item.physical_count ?? '-'}</span>
                      )}
                    </td>
                    
                    {isReviewMode && (
                      <>
                        <td className={`px-6 py-4 text-center font-bold text-lg ${
                          variance === 0 ? 'text-zinc-400' : variance! < 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {variance! > 0 ? '+' : ''}{variance}
                        </td>
                        
                        <td className={`px-6 py-4 text-right font-medium ${
                          impact === 0 ? 'text-zinc-400' : impact < 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            status === 'MATCHED' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                            status === 'SHRINKAGE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
