"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { TrendingUp, BarChart3, Users, Tag, Ban, RotateCcw, Star, Clock, CalendarDays, CreditCard, FlaskConical, Crown, Percent, Pill } from 'lucide-react';

const TABS = [
  { id: 'sales_daily',           label: 'Daily Sales',        icon: CalendarDays,  description: 'Day-wise revenue, cash vs credit breakdown' },
  { id: 'sales_monthly',         label: 'Monthly',            icon: BarChart3,     description: 'Month-over-month revenue summary' },
  { id: 'sales_hourly',          label: 'Hourly Analysis',    icon: Clock,         description: 'Identify peak selling hours' },
  { id: 'sales_category',        label: 'By Category',        icon: Tag,           description: 'Revenue grouped by medicine category' },
  { id: 'sales_cashier',         label: 'By Cashier',         icon: Users,         description: 'Salesperson performance breakdown' },
  { id: 'sales_by_medicine',     label: 'By Medicine',        icon: TrendingUp,    description: 'Per-medicine revenue, qty, profit' },
  { id: 'sales_best_sellers',    label: 'Best Sellers',       icon: Star,          description: 'Top 50 medicines by quantity sold' },
  { id: 'sales_payment_methods', label: 'Payment Methods',    icon: CreditCard,    description: 'Revenue split by Cash, Card, Credit, etc.' },
  { id: 'sales_by_generic',      label: 'By Generic Name',    icon: FlaskConical,  description: 'Sales grouped by active ingredient / generic' },
  { id: 'high_value_transactions',label: 'High Value Bills',  icon: Crown,         description: 'Top 100 highest-value transactions' },
  { id: 'discount_impact',       label: 'Discount Impact',    icon: Percent,       description: 'Daily discount analysis — % revenue lost' },
  { id: 'prescription_sales',    label: 'Rx Medicines',       icon: Pill,          description: 'Prescription-only medicines sales register' },
  { id: 'sales_discounts',       label: 'Discounts Given',    icon: Tag,           description: 'All discount transactions by type' },
  { id: 'sales_voided',          label: 'Voided Bills',       icon: Ban,           description: 'Cancelled / voided transactions' },
  { id: 'sales_returns',         label: 'Returns & Refunds',  icon: RotateCcw,     description: 'Sales returns analysis' },
];

export default function SalesReportPage() {
  return <ReportPageShell title="Sales Reports" icon={TrendingUp} accent="emerald" tabs={TABS} />;
}
