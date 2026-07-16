'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCustomerDetails } from '@/features/crm/services/crm.api';
import CustomerForm from '@/features/crm/components/CustomerForm';
import CustomerLedger from '@/features/crm/components/CustomerLedger';
import CustomerPaymentModal from '@/features/crm/components/CustomerPaymentModal';
import LoyaltyWidget from '@/features/crm/components/LoyaltyWidget';
import CustomerPrescriptionTab from '@/features/prescriptions/components/CustomerPrescriptionTab';
import CustomerPurchaseHistory from '@/features/crm/components/CustomerPurchaseHistory';
import Link from 'next/link';
import { ChevronLeft, User, CreditCard, ShoppingBag, Award, Activity, DollarSign, Wallet, Tag, Users, Clock, Megaphone, FileText } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'overview' | 'history' | 'ledger' | 'loyalty' | 'prescriptions' | 'wallet' | 'coupons' | 'referrals' | 'timeline' | 'marketing' | 'notes';

export default function CustomerProfilePage() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: customer, isLoading } = useCustomerDetails(id);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (isLoading) return <div className="h-64 flex items-center justify-center animate-pulse">Loading profile...</div>;
  if (!customer) return <div className="text-red-500 p-4">Customer not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/customers"
            className="p-2 -ml-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              {customer.full_name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{customer.phone || 'No phone'}</span>
              <span>•</span>
              <span className={customer.current_balance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
                Balance: Rs {customer.current_balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {customer.current_balance > 0 && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <DollarSign size={16} /> Record Payment
          </button>
        )}
      </div>

      <div className="flex space-x-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'history', label: 'Purchases', icon: ShoppingBag },
          { id: 'prescriptions', label: 'Prescriptions', icon: Activity },
          { id: 'ledger', label: 'Credit Ledger', icon: CreditCard },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'loyalty', label: 'Loyalty', icon: Award },
          { id: 'coupons', label: 'Coupons', icon: Tag },
          { id: 'referrals', label: 'Referrals', icon: Users },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'marketing', label: 'Marketing', icon: Megaphone },
          { id: 'notes', label: 'Notes', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <CustomerForm initialData={customer} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Purchase History</h3>
            <CustomerPurchaseHistory customerId={customer.id} />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <CustomerLedger customerId={customer.id} />
          </div>
        )}

        {activeTab === 'loyalty' && (
          <LoyaltyWidget customer={customer} />
        )}

        {activeTab === 'prescriptions' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <CustomerPrescriptionTab customerId={customer.id} />
          </div>
        )}

        {/* Placeholders for new Enterprise tabs */}
        {activeTab === 'wallet' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Customer Wallet</h3>
            <p className="text-zinc-500">Wallet functionality (balances, transactions, add funds) will be mounted here.</p>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Coupons</h3>
            <p className="text-zinc-500">Customer assigned coupons and stacking rules.</p>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Referral Network</h3>
            <p className="text-zinc-500">Customers referred and rewards earned.</p>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Unified Timeline</h3>
            <p className="text-zinc-500">Merged view of sales, payments, wallet, loyalty, referrals, and prescriptions.</p>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Marketing Campaigns</h3>
            <p className="text-zinc-500">Campaigns this customer is part of (WhatsApp, SMS, etc.).</p>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Customer Notes</h3>
            <p className="text-zinc-500">Internal notes and interaction logs.</p>
          </div>
        )}
      </div>

      <CustomerPaymentModal 
        customer={customer} 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
      />
    </div>
  );
}
