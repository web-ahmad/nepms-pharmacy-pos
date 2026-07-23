"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { Package, AlertTriangle, CalendarX, TrendingDown, Archive, Layers, Zap, BarChart2, ShoppingCart, PieChart, RefreshCw, Calendar } from 'lucide-react';

const TABS = [
  { id: 'inventory_valuation',          label: 'Stock Valuation',     icon: Package,       description: 'Current inventory value at cost and retail price' },
  { id: 'inventory_category_wise',      label: 'By Category',         icon: PieChart,      description: 'Stock value breakdown by medicine category' },
  { id: 'inventory_batch_wise',         label: 'Batch-wise',          icon: Layers,        description: 'All batches with quantity, price, and expiry' },
  { id: 'inventory_abc_analysis',       label: 'ABC Analysis',        icon: BarChart2,     description: 'Classify medicines A/B/C by revenue contribution' },
  { id: 'inventory_turnover',           label: 'Turnover Ratio',      icon: RefreshCw,     description: 'COGS-to-stock ratio per medicine — find slow movers' },
  { id: 'inventory_near_expiry',        label: 'Near Expiry',         icon: AlertTriangle, description: 'Medicines expiring within 90 days' },
  { id: 'inventory_expired',            label: 'Expired Stock',       icon: CalendarX,     description: 'Already expired medicines and financial loss' },
  { id: 'medicine_expiry_calendar',     label: 'Expiry Calendar',     icon: Calendar,      description: 'Monthly view of batches expiring — plan write-offs' },
  { id: 'inventory_low_stock',          label: 'Low Stock',           icon: TrendingDown,  description: 'Items below minimum reorder level' },
  { id: 'inventory_reorder_suggestions',label: 'Reorder Suggestions', icon: ShoppingCart,  description: 'Auto-suggested reorder quantities and cost estimates' },
  { id: 'inventory_dead_stock',         label: 'Dead Stock',          icon: Archive,       description: 'No sales in the last 90 days — locked capital' },
  { id: 'inventory_velocity',           label: 'Stock Velocity',      icon: Zap,           description: 'Fast vs slow moving medicines analysis' },
];

export default function InventoryReportPage() {
  return <ReportPageShell title="Inventory Reports" icon={Package} accent="teal" tabs={TABS} />;
}
