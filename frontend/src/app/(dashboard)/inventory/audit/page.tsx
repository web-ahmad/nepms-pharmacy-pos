'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditSessions, useAvailableRacks } from '@/features/inventory/services/audit.api';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { Plus, Search, ClipboardList, ChevronRight, Activity, MapPin, CheckSquare, Square, LayoutGrid } from 'lucide-react';

export default function AuditSessionsPage() {
  const router = useRouter();
  const { data: sessions, isLoading } = useAuditSessions();
  const { data: availableRacks, isLoading: racksLoading } = useAvailableRacks();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    name: '',
    scope_type: 'Category',
    scope_value: '',
    is_blind: false,
  });
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [rackSearch, setRackSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleRack = (rack: string) => {
    setSelectedRacks(prev =>
      prev.includes(rack) ? prev.filter(r => r !== rack) : [...prev, rack]
    );
  };

  const toggleSelectAll = () => {
    const filtered = filteredRacks;
    const allSelected = filtered.every(r => selectedRacks.includes(r));
    if (allSelected) {
      setSelectedRacks(prev => prev.filter(r => !filtered.includes(r)));
    } else {
      setSelectedRacks(prev => [...new Set([...prev, ...filtered])]);
    }
  };

  const filteredRacks = (availableRacks || []).filter(r =>
    r.toLowerCase().includes(rackSearch.toLowerCase())
  );

  const handleScopeTypeChange = (type: string) => {
    setNewSessionData({ ...newSessionData, scope_type: type, scope_value: '' });
    setSelectedRacks([]);
    setRackSearch('');
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      let finalScopeValue = newSessionData.scope_value;
      if (newSessionData.scope_type === 'Location') {
        finalScopeValue = selectedRacks.join(',');
      }

      const payload = {
        name: newSessionData.name,
        scope_type: newSessionData.scope_type,
        scope_value: finalScopeValue,
        is_blind: newSessionData.is_blind,
      };
      const response = await api.post('/api/v1/inventory-audit/sessions', payload);
      if (response.status === 201 || response.status === 200) {
        window.location.href = `/inventory/audit/${response.data.id}`;
      }
    } catch (error) {
      console.error('Audit Creation Failed:', error);
      alert('Failed to create session. Check console.');
    } finally {
      setIsCreating(false);
    }
  };

  const isCreateDisabled =
    !newSessionData.name ||
    (newSessionData.scope_type === 'Location'
      ? selectedRacks.length === 0
      : !newSessionData.scope_value);

  const allFilteredSelected =
    filteredRacks.length > 0 && filteredRacks.every(r => selectedRacks.includes(r));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
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
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Audit Session
        </button>
      </div>

      {/* Sessions Table */}
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
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
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
                {sessions.map(session => (
                  <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{session.name}</div>
                      <div className="text-xs text-zinc-500">
                        {session.id.split('-')[0].toUpperCase()}-{session.id.split('-')[1]}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {format(new Date(session.start_date), 'MMM dd, yyyy • hh:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{session.scope_value}</div>
                      <div className="text-xs text-zinc-500">{session.scope_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          session.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                            : session.status === 'Pending Approval'
                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/inventory/audit/${session.id}`)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        {session.status === 'Completed'
                          ? 'View Report'
                          : session.status === 'Pending Approval'
                          ? '⚡ Review & Approve'
                          : 'Continue Audit'}
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

      {/* Create Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Create New Audit Session</h2>
              <p className="text-sm text-zinc-500 mt-1">Fill in the details below to start a new physical audit.</p>
            </div>

            {/* Modal Body — scrollable */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Session Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Session Name</label>
                <input
                  type="text"
                  value={newSessionData.name}
                  onChange={e => setNewSessionData({ ...newSessionData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Quarterly Blind Audit - Rack A"
                />
              </div>

              {/* Scope Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Scope Type</label>
                <select
                  value={newSessionData.scope_type}
                  onChange={e => handleScopeTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Category">Category</option>
                  <option value="Location">Location / Rack</option>
                </select>
              </div>

              {/* Scope Value */}
              {newSessionData.scope_type === 'Location' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Select Racks / Locations
                    </label>
                    {selectedRacks.length > 0 && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                        {selectedRacks.length} selected
                      </span>
                    )}
                  </div>

                  {/* Search racks */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={rackSearch}
                      onChange={e => setRackSearch(e.target.value)}
                      placeholder="Search racks..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {racksLoading ? (
                    <div className="flex items-center justify-center py-6 text-zinc-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                      Loading racks...
                    </div>
                  ) : filteredRacks.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                      <LayoutGrid className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                      {availableRacks?.length === 0
                        ? 'No racks/locations found in inventory. Add shelf/location to medicines first.'
                        : 'No racks match your search.'}
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                      {/* Select All row */}
                      <button
                        onClick={toggleSelectAll}
                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        )}
                        Select All ({filteredRacks.length})
                      </button>

                      {/* Rack list */}
                      <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredRacks.map(rack => {
                          const isSelected = selectedRacks.includes(rack);
                          return (
                            <button
                              key={rack}
                              onClick={() => toggleRack(rack)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                              )}
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                              {rack}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected tags preview */}
                  {selectedRacks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedRacks.map(r => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                        >
                          {r}
                          <button onClick={() => toggleRack(r)} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Scope Value</label>
                  <input
                    type="text"
                    value={newSessionData.scope_value}
                    onChange={e => setNewSessionData({ ...newSessionData, scope_value: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Tablets, Syrups, Antibiotics"
                  />
                </div>
              )}

              {/* Blind Audit Toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={newSessionData.is_blind}
                    onChange={e => setNewSessionData({ ...newSessionData, is_blind: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enable Blind Audit</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Hide system quantities from auditors to ensure an accurate physical count.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedRacks([]);
                  setRackSearch('');
                  setNewSessionData({ name: '', scope_type: 'Category', scope_value: '', is_blind: false });
                }}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreateDisabled || isCreating}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {isCreating && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>}
                {isCreating ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
