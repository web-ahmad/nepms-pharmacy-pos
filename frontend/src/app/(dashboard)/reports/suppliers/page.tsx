"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { Users, Trophy, BookOpen, CreditCard, Clock, FileText, Truck, Tag, Package } from 'lucide-react';

const TABS = [
  { id: 'supplier_master',          label: 'Supplier Directory',  icon: Users,     description: 'Complete supplier list with contact, region, and balance' },
  { id: 'supplier_ranking',         label: 'Rankings',            icon: Trophy,    description: 'Suppliers ranked by total purchase value' },
  { id: 'supplier_ledger',          label: 'Ledger',              icon: BookOpen,  description: 'Chronological ledger entries — invoices, payments, returns' },
  { id: 'supplier_outstanding',     label: 'Outstanding Payables',icon: CreditCard,description: 'Suppliers you currently owe money to' },
  { id: 'supplier_invoice_aging',   label: 'Invoice Aging',       icon: Clock,     description: 'Overdue invoices by aging bucket (30/60/90+ days)' },
  { id: 'supplier_payment_history', label: 'Payment History',     icon: FileText,  description: 'All payments made — method, reference, amount' },
  { id: 'supplier_grn_summary',     label: 'GRN Summary',         icon: Truck,     description: 'Goods Received Notes by supplier and date' },
  { id: 'purchases_returns',        label: 'Purchase Returns',    icon: Tag,       description: 'Items returned to suppliers with reason and status' },
  { id: 'supplier_medicine_catalog',label: 'Price Catalog',       icon: Package,   description: 'Supplier medicine prices, discounts, bonus schemes, lead times' },
];

export default function SupplierReportsPage() {
  return <ReportPageShell title="Supplier Reports" icon={Users} accent="amber" tabs={TABS} />;
}
