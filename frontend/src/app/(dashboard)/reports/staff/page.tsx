"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { UserCheck, TrendingUp, Ban, Tag } from 'lucide-react';

const TABS = [
  { id: 'staff_sales',     label: 'Sales Performance', icon: TrendingUp, description: 'Revenue, bills, and avg bill value per staff member' },
  { id: 'staff_voids',     label: 'Void Transactions', icon: Ban,        description: 'Voided bills attributed to each staff member' },
  { id: 'staff_discounts', label: 'Discounts Given',   icon: Tag,        description: 'Total discounts authorised per cashier/pharmacist' },
];

export default function StaffReportPage() {
  return <ReportPageShell title="Staff Performance Reports" icon={UserCheck} accent="indigo" tabs={TABS} />;
}
