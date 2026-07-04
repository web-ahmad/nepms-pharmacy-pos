'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditSessions, useCreateAuditSession } from '@/features/inventory/services/audit.api';
import { format } from 'date-fns';
import { Plus, Search, FileText, ClipboardList, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

export default function AuditSessionsPage() {
  const router = useRouter();
  const { data: sessions, isLoading } = useAuditSessions();
  const createSession = useCreateAuditSession();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({ name: '', scope_type: 'Category', scope_value: '' });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  const handleCreate = async () => {
    if (!newSessionData.name || !newSessionData.scope_value) return;
    try {
      const res = await createSession.mutateAsync(newSessionData);
      setIsModalOpen(false);
      router.push(`/inventory/audit/${res.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Audit Sessions
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Manage physical stock taking and reconciliation.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Audit Session
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Audit History & Active Sessions</h3>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-zinc-200"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : sessions && sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Session Name / ID</th>
                  <th className="px-6 py-4">Date Started</th>
                  <th className="px-6 py-4">Scope / Area</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{session.name}</div>
                      <div className="text-xs text-zinc-500">{session.id.split('-')[0].toUpperCase()}-{session.id.split('-')[1]}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {format(new Date(session.start_date), 'MMM dd, yyyy • hh:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{session.scope_value}</div>
                      <div className="text-xs text-zinc-500">{session.scope_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        session.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                        session.status === 'Under Review' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => router.push(`/inventory/audit/${session.id}`)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        {session.status === 'Completed' ? 'View Report' : session.status === 'Under Review' ? 'Review & Reconcile' : 'Continue Audit'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
            <p>No audit sessions found. Create one to begin stock taking.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Create New Audit Session</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Session Name</label>
                <input 
                  type="text" 
                  value={newSessionData.name}
                  onChange={e => setNewSessionData({...newSessionData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Quarterly Blind Audit - Rack A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Scope Type</label>
                <select 
                  value={newSessionData.scope_type}
                  onChange={e => setNewSessionData({...newSessionData, scope_type: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Category">Category</option>
                  <option value="Location">Location/Rack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Scope Value</label>
                <input 
                  type="text" 
                  value={newSessionData.scope_value}
                  onChange={e => setNewSessionData({...newSessionData, scope_value: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={newSessionData.scope_type === 'Category' ? "e.g. Tablets" : "e.g. Rack A-1"}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newSessionData.name || !newSessionData.scope_value || createSession.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createSession.isPending ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
