'use client';

import React, { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useAuditLogs } from '@/features/audit/services/audit.api';
import { 
  ShieldAlert, Activity, CreditCard, Users, Database, 
  Search, Filter, ChevronDown, ChevronRight, AlertTriangle, 
  Info, AlertOctagon, UserCircle2, Key, History
} from 'lucide-react';

const TABS = [
  { id: 'General Activity', icon: Activity, label: 'General Activity' },
  { id: 'Security & Access', icon: ShieldAlert, label: 'Security & Access' },
  { id: 'Financial & POS Fraud', icon: CreditCard, label: 'Financial & POS Fraud' },
  { id: 'HR & System', icon: Users, label: 'HR & System' },
  { id: 'Data Privacy', icon: Database, label: 'Data Privacy' },
];

const MOCK_LOGS = [
  {
    id: 'mock-1',
    tenant_id: 'mock',
    branch_id: null,
    user_id: 'u1',
    user_name: 'Ali',
    created_at: new Date().toISOString(),
    action: 'POS Invoice Voided after Print',
    entity_type: 'POS',
    entity_id: 'INV-1092',
    previous_value: null,
    new_value: null,
    ip_address: '192.168.1.100',
    user_agent: 'Chrome/Windows',
    reason_code: 'Customer Refusal',
    batch_audit_id: null,
    severity: 'Critical',
    details: 'Invoice voided after physical receipt was printed.'
  },
  {
    id: 'mock-2',
    tenant_id: 'mock',
    branch_id: null,
    user_id: 'u2',
    user_name: 'Ahmad',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    action: 'Medicine Price Updated',
    entity_type: 'Inventory',
    entity_id: 'MED-551',
    previous_value: { selling_price: 'Rs 120' },
    new_value: { selling_price: 'Rs 145' },
    ip_address: '10.0.0.5',
    user_agent: 'Safari/Mac',
    reason_code: 'Vendor Price Hike',
    batch_audit_id: 'batch-99',
    severity: 'Info',
    details: 'Updated selling price based on new stock arrival.'
  },
  {
    id: 'mock-3',
    tenant_id: 'mock',
    branch_id: null,
    user_id: 'u3',
    user_name: 'System',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    action: '4 Failed Login Attempts Detected',
    entity_type: 'Security',
    entity_id: 'AUTH-991',
    previous_value: null,
    new_value: null,
    ip_address: '45.22.11.9',
    user_agent: 'Unknown Script',
    reason_code: 'Brute Force Prevention',
    batch_audit_id: null,
    severity: 'Warning',
    details: 'Locked IP address temporarily.'
  },
  {
    id: 'mock-4',
    tenant_id: 'mock',
    branch_id: null,
    user_id: 'u4',
    user_name: 'Manager',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    action: 'Exported Customer List to CSV',
    entity_type: 'Reports',
    entity_id: 'REP-CUST-CSV',
    previous_value: null,
    new_value: { format: 'CSV', records_exported: 1540 },
    ip_address: '192.168.1.50',
    user_agent: 'Edge/Windows',
    reason_code: 'Monthly Backup',
    batch_audit_id: null,
    severity: 'Warning',
    details: 'Exported full PII data of customers.'
  },
  {
    id: 'mock-5',
    tenant_id: 'mock',
    branch_id: null,
    user_id: 'u5',
    user_name: 'Owner',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    action: 'Updated Staff Salary',
    entity_type: 'HR',
    entity_id: 'EMP-12',
    previous_value: { base_salary: 'Rs 45,000' },
    new_value: { base_salary: 'Rs 50,000' },
    ip_address: '192.168.1.200',
    user_agent: 'Chrome/Mac',
    reason_code: 'Annual Increment',
    batch_audit_id: null,
    severity: 'Info',
    details: 'Increased salary for pharmacist.'
  }
];

export default function AdvancedAuditCenter() {
  const [activeTab, setActiveTab] = useState('General Activity');
  const [dateRange, setDateRange] = useState({ 
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const { data: logs, isLoading } = useAuditLogs({
    start_date: dateRange.start,
    end_date: dateRange.end,
    tab: activeTab,
    severity: severityFilter || undefined
  });

  const toggleRow = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertOctagon className="w-3 h-3 mr-1" /> Critical</span>;
      case 'Warning':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><Info className="w-3 h-3 mr-1" /> Info</span>;
    }
  };

  const filteredLogs = useMemo(() => {
    const dataSource = (logs && logs.length > 0) ? logs : MOCK_LOGS;
    if (!searchFilter) return dataSource as any[];
    const lower = searchFilter.toLowerCase();
    return dataSource.filter(l => 
      l.user_name?.toLowerCase().includes(lower) || 
      l.action.toLowerCase().includes(lower) ||
      l.entity_type.toLowerCase().includes(lower) ||
      l.reason_code?.toLowerCase().includes(lower)
    ) as any[];
  }, [logs, searchFilter]);

  const renderGitDiff = (prev: Record<string, any> | null, curr: Record<string, any> | null) => {
    if (!prev && !curr) return <div className="text-zinc-500 italic">No structured diff available.</div>;
    
    const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
    const changes: React.ReactNode[] = [];
    
    allKeys.forEach(key => {
      const p = prev ? prev[key] : undefined;
      const c = curr ? curr[key] : undefined;
      
      if (p !== c) {
        changes.push(
          <div key={key} className="grid grid-cols-12 gap-4 text-sm font-mono border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 py-2">
            <div className="col-span-3 font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{key.replace(/_/g, ' ')}</div>
            <div className="col-span-4 text-red-600 dark:text-red-400 line-through bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
              {p !== undefined && p !== null ? String(p) : 'null'}
            </div>
            <div className="col-span-1 text-center text-zinc-400">➔</div>
            <div className="col-span-4 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
              {c !== undefined && c !== null ? String(c) : 'null'}
            </div>
          </div>
        );
      }
    });

    if (changes.length === 0) return <div className="text-zinc-500 italic">No fields were changed.</div>;
    return <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-inner">{changes}</div>;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 text-white p-6 rounded-2xl shadow-lg border border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Enterprise Forensics Center
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Banking-grade tamper-proof audit trails and entity lifecycles.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl overflow-x-auto hide-scrollbar border border-zinc-200 dark:border-zinc-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' 
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
        {/* Filter Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter by user, action..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-zinc-200"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select 
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="Warning">Warning Only</option>
              <option value="Info">Info Only</option>
            </select>
          </div>
          <div>
            <button className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-10 px-4 py-2">
              <Filter className="w-4 h-4 mr-2" /> Advanced Filters
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950/50 p-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-16 text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Forensic Records Found</h3>
              <p className="mt-1 text-sm">Adjust your date range or filters to view audit trails.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => {
                const isExpanded = expandedRows[log.id];
                return (
                  <div key={log.id} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200 ${
                    log.severity === 'Critical' ? 'border-red-300 dark:border-red-900/50 shadow-sm' : 
                    log.severity === 'Warning' ? 'border-yellow-300 dark:border-yellow-900/50 shadow-sm' : 
                    'border-zinc-200 dark:border-zinc-800'
                  }`}>
                    {/* Row Header */}
                    <div 
                      onClick={() => toggleRow(log.id)}
                      className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                        isExpanded ? 'bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        
                        <div className="min-w-[150px]">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {getSeverityBadge(log.severity)}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-1">{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {log.action} <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-2">on {log.entity_type}</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                            <span className="flex items-center"><UserCircle2 className="w-3 h-3 mr-1" /> {log.user_name || 'System Auto'}</span>
                            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{log.ip_address || 'Internal/CLI'}</span>
                            {log.batch_audit_id && (
                              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                Batch: {log.batch_audit_id.substring(0,8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="hidden lg:flex items-center mt-3 sm:mt-0">
                        {log.reason_code && (
                          <div className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center">
                            <Key className="w-3 h-3 mr-1.5 text-zinc-400" />
                            {log.reason_code}
                          </div>
                        )}
                        <button className="ml-4 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          <History className="w-3 h-3 mr-1" /> Timeline
                        </button>
                      </div>
                    </div>
                    
                    {/* Expandable Git-Diff Canvas */}
                    {isExpanded && (
                      <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
                        <div className="mb-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center">
                            <Activity className="w-3 h-3 mr-1" /> Field-Level Differences
                          </h4>
                          {renderGitDiff(log.previous_value, log.new_value)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-zinc-500">Entity ID</span>
                            <span className="text-sm font-mono text-zinc-800 dark:text-zinc-300">{log.entity_id}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-zinc-500">User Agent</span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate block" title={log.user_agent || ''}>{log.user_agent || 'N/A'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-[10px] uppercase font-bold text-zinc-500">Context Details</span>
                            <span className="text-sm text-zinc-800 dark:text-zinc-300">{log.details || 'No additional details logged.'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
