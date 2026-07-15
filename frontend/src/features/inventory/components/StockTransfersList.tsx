'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Search, Eye, ArrowRight, Download, Box, Filter } from 'lucide-react';
import StockTransferModal from './StockTransferModal';

export default function StockTransfersList() {
  const { branchId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers', statusFilter],
    queryFn: async () => {
      let url = '/api/v1/inventory/transfers';
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await api.get(url);
      return res.data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-[#d1fae5] text-[#065f46]';
      case 'Pending': return 'bg-[#fefce8] text-[#574425]';
      case 'In Transit': return 'bg-[#eff4ff] text-[#0058be]';
      case 'Cancelled': return 'bg-[#ffdad6] text-[#ba1a1a]';
      default: return 'bg-[#e2e8f0] text-[#45464d]';
    }
  };

  const filteredTransfers = transfers?.filter((t: any) => 
    t.reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-['Inter']">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-[#0b1c30]">
            Stock Transfers
          </h2>
          <p className="mt-1 text-[14px] text-[#45464d]">
            Manage inter-branch inventory transfers and tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 border border-[#c6c6cd] rounded-[4px] text-[#0b1c30] text-[14px] font-semibold hover:bg-[#eff4ff] transition-colors"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0058be] text-white rounded-[4px] text-[14px] font-semibold hover:bg-[#2170e4] transition-colors shadow-sm"
          >
            <Plus size={16} /> New Transfer
          </button>
        </div>
      </div>

      <div className="rounded-[8px] border border-[#e2e8f0] bg-white shadow-sm overflow-hidden animate-fade-in delay-1">
        <div className="p-4 border-b border-[#e2e8f0] flex flex-wrap items-center gap-4 justify-between">
          <div className="relative w-full max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d]" size={16} />
            <input
              type="text"
              placeholder="Search reference no..."
              className="w-full rounded-[4px] border border-[#c6c6cd] py-2 pl-9 pr-4 text-[14px] focus:border-[#0058be] focus:outline-none focus:ring-1 focus:ring-[#0058be] text-[#0b1c30] placeholder:text-[#76777d] bg-[#f8f9ff]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#76777d]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#c6c6cd] rounded-[4px] text-[14px] focus:outline-none focus:border-[#0058be] text-[#0b1c30]"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8f9ff] text-[#45464d] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Date</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Ref No</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Direction</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px]">Items</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-center">Status</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[12px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#76777d]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-[#0058be]"></div>
                      <span className="text-[14px]">Loading transfers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#76777d]">
                    <Box className="mx-auto h-10 w-10 text-[#c6c6cd] mb-3" />
                    <p className="text-[14px] font-semibold text-[#0b1c30]">No transfers found</p>
                  </td>
                </tr>
              ) : (
                filteredTransfers?.map((transfer: any) => {
                  const isOutbound = transfer.source_branch_id === branchId;
                  
                  return (
                    <tr key={transfer.id} className="hover:bg-[#f1f5f9] transition-colors">
                      <td className="px-4 py-3 text-[#0b1c30] whitespace-nowrap">
                        {new Date(transfer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#0b1c30]">{transfer.reference_no}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold ${isOutbound ? 'text-[#ba1a1a]' : 'text-[#065f46]'}`}>
                            {isOutbound ? 'OUTBOUND' : 'INBOUND'}
                          </span>
                          <ArrowRight size={14} className="text-[#c6c6cd]" />
                          <span className="text-[13px] text-[#45464d] truncate max-w-[150px]">
                            {isOutbound ? 'Destination Branch' : 'Source Branch'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#45464d]">
                        {transfer.items?.length || 0} items
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[11px] font-bold ${getStatusColor(transfer.status)}`}>
                          {transfer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1.5 text-[#0058be] hover:bg-[#eff4ff] rounded-sm transition-colors">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StockTransferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
