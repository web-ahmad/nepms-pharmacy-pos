"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { TrendingUp, BookOpen, Receipt, Percent, PieChart, CalendarCheck, RotateCcw } from 'lucide-react';

const TABS = [
  { id: 'profit_and_loss',     label: 'Profit & Loss',       icon: TrendingUp,    description: 'Revenue, COGS, Gross Profit, Expenses, Net Profit' },
  { id: 'daily_closing_report',label: 'Daily Closing',       icon: CalendarCheck, description: 'Daily net sales = gross - returns - discounts + tax' },
  { id: 'gross_margin_analysis',label:'Gross Margins',       icon: PieChart,      description: 'Gross margin % breakdown by medicine category' },
  { id: 'cash_book',           label: 'Cash Book',           icon: BookOpen,      description: 'All cash inflows and outflows (daybook)' },
  { id: 'expenses_by_category',label: 'Expenses',            icon: Receipt,       description: 'Operational expenses broken down by category' },
  { id: 'tax_summary',         label: 'Tax Summary (GST)',   icon: Percent,       description: 'Output vs input tax — net liability' },
  { id: 'refund_rate_analysis',label: 'Refund Rate',         icon: RotateCcw,     description: 'Return rate % by category — quality insights' },
];

export default function FinancialReportPage() {
  return <ReportPageShell title="Financial Reports" icon={TrendingUp} accent="violet" tabs={TABS} />;
}
