import { useState } from 'react';
import { X, Package, DollarSign, MapPin, Phone, Mail, FileText, Activity } from 'lucide-react';
import { Supplier } from '../types/purchase';
import { useSupplierMedicines } from '../services/purchase.api';
import SupplierScorecard from './SupplierScorecard';

interface SupplierViewModalProps {
  supplier: Supplier & { region_name?: string };
  onClose: () => void;
}

export default function SupplierViewModal({ supplier, onClose }: SupplierViewModalProps) {
  const { data: medicines, isLoading } = useSupplierMedicines(supplier.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border dark:border-zinc-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-500" />
              {supplier.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                supplier.is_active 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {supplier.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Region: {supplier.region_name || 'N/A'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'performance'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            Performance Analytics
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/30 dark:bg-zinc-950/50">
          
          {activeTab === 'overview' ? (
            <div className="space-y-8">
              {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact Information */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" /> Contact Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Contact Person</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.contact_person || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Phone</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.phone || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Email</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Address</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.address || '-'}</span>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-zinc-400" /> Financial Details
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Tax Number</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.tax_number || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Credit Limit</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">${(supplier.credit_limit || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Opening Balance</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">${(supplier.opening_balance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Current Balance</span>
                  <span className={`font-mono font-bold ${(supplier as any).current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ${((supplier as any).current_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mapped Medicines */}
          <div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Mapped Medicines & Pricing
            </h4>
            
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              {isLoading ? (
                <div className="p-8 text-center text-zinc-500 animate-pulse">Loading mapped medicines...</div>
              ) : !medicines || medicines.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <p className="font-medium">No medicines mapped</p>
                  <p className="text-sm mt-1">This supplier does not have any products linked yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Medicine</th>
                        <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">Trade Price</th>
                        <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">Discount</th>
                        <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">Bonus Thresh.</th>
                        <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">Lead Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {medicines.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            {item.medicine_name || 'Unknown Medicine'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${(item.trade_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">{item.exclusive_discount_percentage || 0}%</td>
                          <td className="px-4 py-3 text-right">{item.bonus_scheme_threshold || 0}</td>
                          <td className="px-4 py-3 text-right">{item.delivery_lead_time_days || 1} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              <SupplierScorecard supplierId={supplier.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
