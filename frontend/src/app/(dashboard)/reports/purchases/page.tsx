"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { FileText, Users, AlertCircle, RotateCcw, TrendingUp, ClipboardList } from 'lucide-react';

const TABS = [
  { id: 'purchases_register',  label: 'Purchase Register',     icon: FileText,      description: 'All purchase invoices with supplier, amount and status' },
  { id: 'po_status_tracker',   label: 'PO Status Tracker',     icon: ClipboardList, description: 'Track approval, delivery, and payment status of all POs' },
  { id: 'supplier_ledger',     label: 'Supplier Ledger',       icon: Users,         description: 'Chronological ledger entries per supplier' },
  { id: 'supplier_outstanding',label: 'Outstanding Payables',  icon: AlertCircle,   description: 'Suppliers with pending balance you owe' },
  { id: 'purchases_returns',   label: 'Purchase Returns',      icon: RotateCcw,     description: 'All returns to suppliers with reasons' },
  { id: 'price_variation',     label: 'Price Analysis',        icon: TrendingUp,    description: 'Price fluctuations per medicine across POs' },
];

export default function PurchasesReportPage() {
  return <ReportPageShell title="Purchases Reports" icon={FileText} accent="orange" tabs={TABS} />;
}
