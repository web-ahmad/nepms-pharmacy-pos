'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useExpiryAlerts } from '@/features/dashboard/services/dashboard.api';
import { useLowStockAlerts, LowStockAlert } from '@/features/inventory/services/alerts.api';
import { LogOut, User as UserIcon, Moon, Sun, X, ChevronRight, Package, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtCount = (n: number) => (n > 99 ? '99+' : String(n));

function getDaysLeft(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
}

// ── Low Stock Tray ────────────────────────────────────────────────────────
interface LowStockTrayProps {
  open: boolean;
  onClose: () => void;
  items: LowStockAlert[];
}

function LowStockTray({ open, onClose, items }: LowStockTrayProps) {
  const router = useRouter();
  const top5 = items.slice(0, 5);

  if (!open) return null;

  return (
    <div
      className="absolute top-full right-0 mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
      style={{ animation: 'tray-drop 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-50 to-white px-4 py-3 border-b border-orange-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[13px] font-bold text-orange-600"> Low Stock Alerts</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            {items.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        ><X size={13} /></button>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
        {top5.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
            <Package size={28} className="text-gray-300" />
            <p className="text-[12px] italic">All stock levels are healthy</p>
          </div>
        ) : (
          top5.map((item, i) => {
            const isCritical = item.severity === 'Critical';
            const stockPct = item.min_stock_level > 0
              ? Math.round((item.current_stock / item.min_stock_level) * 100)
              : 0;

            return (
              <button
                key={item.medicine_id}
                onClick={() => { router.push(`/inventory/${item.medicine_id}`); onClose(); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center gap-3"
                style={{ animation: `tray-row 0.25s ease-out both ${i * 0.04}s` }}
              >
                {/* Icon */}
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isCritical ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                  }`}>
                  <TrendingDown size={15} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-[#006a43] transition-colors">
                    {item.medicine_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category_name && (
                      <span className="text-[10px] text-gray-400">{item.category_name}</span>
                    )}
                    {item.supplier_name && (
                      <>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-400 truncate">{item.supplier_name}</span>
                      </>
                    )}
                  </div>
                  {/* Mini stock bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${Math.min(stockPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{stockPct}%</span>
                  </div>
                </div>

                {/* Stock badge */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCritical
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                    {isCritical ? '🚨 Critical' : '⚠️ Warning'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {item.current_stock} / {item.min_stock_level}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <button
          onClick={() => { router.push('/inventory/low-stock'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-orange-200 text-orange-600 text-[12px] font-bold hover:bg-orange-50 transition-colors"
        >
          See all {items.length} low stock items
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ── Near-Expiry Tray ──────────────────────────────────────────────────────
interface ExpiryTrayItem {
  medicine_id?: string;
  id?: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  remaining_quantity: number;
}

interface ExpiryTrayProps {
  open: boolean;
  onClose: () => void;
  items: ExpiryTrayItem[];
}

function NearExpiryTray({ open, onClose, items }: ExpiryTrayProps) {
  const router = useRouter();
  const top5 = items.slice(0, 5);

  if (!open) return null;

  return (
    <div
      className="absolute top-full right-0 mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
      style={{ animation: 'tray-drop 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-50 to-white px-4 py-3 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[13px] font-bold text-amber-600">Near-Expiry Medicines</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {items.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        ><X size={13} /></button>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
        {top5.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
            <Package size={28} className="text-gray-300" />
            <p className="text-[12px] italic">No near-expiry items</p>
          </div>
        ) : (
          top5.map((item, i) => {
            const days = getDaysLeft(item.expiry_date);
            const urgency = days <= 30
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-teal-50 text-teal-700 border-teal-200';
            const daysLabel = days === 0 ? 'Today' : `${days}d left`;

            return (
              <button
                key={i}
                onClick={() => {
                  const mid = item.medicine_id || item.id;
                  if (mid) router.push(`/inventory/${mid}`);
                  else router.push('/inventory?view=near-expiry');
                  onClose();
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center gap-3"
                style={{ animation: `tray-row 0.25s ease-out both ${i * 0.04}s` }}
              >
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500">
                  <Clock size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-[#006a43] transition-colors">
                    {item.medicine_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-mono">{item.batch_number}</span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400">Qty: {item.remaining_quantity}</span>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency}`}>
                    {daysLabel}
                  </span>
                  <span className="text-[10px] text-gray-300">{item.expiry_date}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <button
          onClick={() => { router.push('/inventory?view=near-expiry'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-amber-200 text-amber-600 text-[12px] font-bold hover:bg-amber-50 transition-colors"
        >
          See all {items.length} near-expiry medicines
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}



// ── Generic Icon Button with Badge ────────────────────────────────────────
function AlertIconButton({
  count, type, active, onClick,
}: {
  count: number;
  type: 'low-stock' | 'near-expiry';
  active: boolean;
  onClick: () => void;
}) {
  const hasAlerts = count > 0;
  const isLowStock = type === 'low-stock';

  const iconColor = hasAlerts
    ? (isLowStock ? 'text-orange-500' : 'text-amber-500')
    : 'text-gray-400';
  const pulseClass = hasAlerts ? 'animate-pulse' : '';
  const badgeBg = isLowStock ? 'bg-orange-500' : 'bg-amber-500';
  const activeBg = active
    ? (isLowStock ? 'bg-orange-50' : 'bg-amber-50')
    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800';

  return (
    <button
      onClick={onClick}
      title={isLowStock ? 'Low Stock Alerts' : 'Near-Expiry Medicines'}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeBg}`}
    >
      {isLowStock ? (
        /* Alert / Low-stock: shield-alert style icon */
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 stroke-current ${iconColor} ${pulseClass} transition-all`}>
          <path d="M12 2L3 7v7c0 5 4 9 9 9s9-4 9-9V7L12 2z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        /* Calendar / Near-expiry */
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 stroke-current ${iconColor} ${pulseClass} transition-all`}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="9 16 12 13 15 16" />
          <line x1="12" y1="13" x2="12" y2="18" />
        </svg>
      )}

      {hasAlerts && (
        <span className={`absolute -top-1 -right-1 ${badgeBg} text-white text-[8px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-[3px] leading-none shadow-sm`}>
          {fmtCount(count)}
        </span>
      )}
    </button>
  );
}

import { BranchSwitcher } from './BranchSwitcher';

// ── TopNavigation ─────────────────────────────────────────────────────────
export function TopNavigation() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { data: expiryAlerts } = useExpiryAlerts();
  const { data: lowStockData } = useLowStockAlerts({ skip: 0, limit: 100 });
  const [openTray, setOpenTray] = useState<'low-stock' | 'near-expiry' | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) {
        setOpenTray(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Near-expiry: 0–90 days from today
  const nearExpiryItems = ((expiryAlerts as any[]) || []).filter((a: any) => {
    const d = new Date(a.expiry_date ?? '');
    if (isNaN(d.getTime())) return false;
    const diff = (d.getTime() - today.getTime()) / 86_400_000;
    return diff >= 0 && diff <= 90;
  });

  // Low stock items (already paginated to 100)
  const lowStockItems: LowStockAlert[] = lowStockData?.items || [];

  const toggleTray = (type: 'low-stock' | 'near-expiry') =>
    setOpenTray(prev => prev === type ? null : type);

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-1 items-center gap-4">
        <BranchSwitcher />
      </div>

      <div className="flex items-center gap-1">

        {/* ── Alert icon buttons + trays ── */}
        <div ref={trayRef} className="flex items-center gap-1 relative">

          {/* 1. Low Stock Alert */}
          <div className="relative">
            <AlertIconButton
              count={lowStockItems.length}
              type="low-stock"
              active={openTray === 'low-stock'}
              onClick={() => toggleTray('low-stock')}
            />
            <LowStockTray
              open={openTray === 'low-stock'}
              onClose={() => setOpenTray(null)}
              items={lowStockItems}
            />
          </div>

          {/* 2. Near-Expiry */}
          <div className="relative">
            <AlertIconButton
              count={nearExpiryItems.length}
              type="near-expiry"
              active={openTray === 'near-expiry'}
              onClick={() => toggleTray('near-expiry')}
            />
            <NearExpiryTray
              open={openTray === 'near-expiry'}
              onClose={() => setOpenTray(null)}
              items={nearExpiryItems}
            />
          </div>
        </div>



        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* User + logout */}
        <div className="flex items-center gap-3 pl-3 ml-1 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006a43]/10 text-[#006a43] font-bold text-sm shrink-0">
            <UserIcon size={15} />
          </div>
          <div className="hidden md:block text-sm text-right">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">{user?.username || 'Guest'}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.role || 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-1 flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
            title="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes tray-drop {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes tray-row {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      ` }} />
    </header>
  );
}
