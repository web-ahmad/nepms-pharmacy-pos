"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { Users, Trophy, CreditCard, Star, Target, UserPlus } from 'lucide-react';

const TABS = [
  { id: 'customer_master',          label: 'Master List',       icon: Users,    description: 'All customers with contact info, tier, and balance' },
  { id: 'customer_top_spenders',    label: 'Top Spenders',      icon: Trophy,   description: 'Highest-value customers ranked by lifetime spend' },
  { id: 'customer_rfm',             label: 'RFM Segmentation',  icon: Target,   description: 'Recency-Frequency-Monetary scoring — Champions, Loyal, At Risk, Lost' },
  { id: 'customer_new_vs_returning',label: 'New vs Returning',  icon: UserPlus, description: 'Monthly breakdown of new registrations vs returning buyers' },
  { id: 'customer_credit_list',     label: 'Credit Customers',  icon: CreditCard, description: 'Customers with outstanding credit balance' },
  { id: 'customer_loyalty',         label: 'Loyalty Points',    icon: Star,     description: 'Points balance by tier and purchase history' },
];

export default function CustomerReportPage() {
  return <ReportPageShell title="Customer Reports" icon={Users} accent="blue" tabs={TABS} />;
}
