'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Boxes, TrendingUp, Receipt, BellRing, Sparkles } from 'lucide-react';
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth-store';
import { NAV_ITEMS } from '@/components/layout/Sidebar';
import { useModules } from '@/lib/modules';
import { resolveRoleHome } from '@/lib/role-home';
import { DateRange } from '@/features/dashboard/services/dashboard.api';
import DashboardFilter from '@/features/dashboard/components/DashboardFilter';
import SalesOverview from '@/features/dashboard/components/SalesOverview';
import InventoryOverview from '@/features/dashboard/components/InventoryOverview';
import AlertsTable from '@/features/dashboard/components/AlertsTable';
import SalesChart from '@/features/dashboard/components/SalesChart';
import RecentReceipts from '@/features/dashboard/components/RecentReceipts';
import SelfClockWidget from '@/features/hr/components/SelfClockWidget';
import { format } from 'date-fns';

// Small animated section wrapper with an icon-led heading.
function SectionHeading({ icon: Icon, title, tint }: { icon: React.ElementType; title: string; tint: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuthStore();
  const router = useRouter();
  const isSuperAdmin = useIsSuperAdmin();
  const { isModuleEnabled } = useModules();
  const hasFullAccess      = (user?.hierarchy_level ?? 4) <= 3;

  const canOpen = (it: (typeof NAV_ITEMS)[number]) =>
    (isSuperAdmin || !it.permission || hasPermission(it.permission)) &&
    (!it.moduleKey || isModuleEnabled(it.moduleKey));

  // Branch staff belong in their own module, not the pharmacy-wide dashboard —
  // a Cashier opening "/" (persisted session, bookmark, logo click) gets the
  // Cashier Portal, exactly as they do straight after login. Only redirect if
  // that module is actually enabled + permitted, so we never strand them on a
  // "module turned off" screen.
  const roleHomeHref = resolveRoleHome(user);
  const roleHomeItem = roleHomeHref ? NAV_ITEMS.find((it) => it.href === roleHomeHref) : undefined;
  const roleHome = roleHomeHref && (!roleHomeItem || canOpen(roleHomeItem)) ? roleHomeHref : undefined;

  // Staff who can't see the main dashboard shouldn't land on an empty page —
  // send them to their first accessible module (e.g. an HR user → HR & Payroll).
  const canSeeDashboard = hasFullAccess || hasPermission('dashboard:view');
  const fallbackLanding = !canSeeDashboard
    ? NAV_ITEMS.find((it) => it.href !== '/' && canOpen(it))?.href
    : undefined;
  const landing = roleHome ?? fallbackLanding;
  useEffect(() => {
    if (user && landing) router.replace(landing);
  }, [user, landing, router]);
  // Full-access owners (L2/L3) are never "just a cashier" or "just inventory".
  const isCashier          = !hasFullAccess && !hasPermission('sales:manage') && hasPermission('pos:view');
  const isInventoryManager = !hasFullAccess && hasPermission('inventory:manage') && !hasPermission('sales:manage');

  const [dateRange, setDateRange] = useState<DateRange>({
    from_date: format(new Date(), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Full-access owners (L2 Pharmacy Owner + L3 Franchise/Branch Owner) always see
  // the complete dashboard — their sales data is branch-scoped on the backend.
  // Staff (L4) still gate on the granular sales:view permission.
  const canSeeSales = !isInventoryManager && (hasFullAccess || hasPermission('sales:view'));
  const canSeeCharts = !isInventoryManager && !isCashier &&
    (hasFullAccess || (hasPermission('sales:view') && hasPermission('reports:view')));
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Redirecting a staff user to their module — don't flash the empty dashboard.
  if (landing) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">

      {/* ── Gradient Hero Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="brand-surface-br brand-shadow relative overflow-hidden rounded-3xl p-6 sm:p-8"
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-lime-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                <Sparkles className="h-3 w-3" />
                {today}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Welcome back, {user?.username}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                Here's your pharmacy's live pulse. Click any receipt or alert to drill in.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <DashboardFilter dateRange={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </motion.div>

      {/* ── Attendance clock (self clock-in/out for linked employees) ─────── */}
      <SelfClockWidget />

      {/* ── Sales KPIs ───────────────────────────────────────────────────── */}
      {canSeeSales && (
        <section>
          <SectionHeading icon={TrendingUp} title="Sales Performance" tint="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
          <SalesOverview dateRange={dateRange} />
        </section>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      {canSeeCharts && (
        <section>
          <SalesChart dateRange={dateRange} />
        </section>
      )}

      {/* ── Recent Receipts (clickable → opens invoice drawer) ───────────── */}
      {canSeeSales && (
        <section>
          <SectionHeading icon={Receipt} title="Latest Transactions" tint="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
          <RecentReceipts />
        </section>
      )}

      {/* ── Inventory Pulse ──────────────────────────────────────────────── */}
      {(hasPermission('inventory:view') || hasFullAccess || isInventoryManager) && (
        <section>
          <SectionHeading icon={Boxes} title="Inventory Pulse" tint="bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" />
          <InventoryOverview />
        </section>
      )}

      {/* ── Alerts (clickable → low-stock / inventory) ───────────────────── */}
      {(hasFullAccess || isInventoryManager) && (
        <section>
          <SectionHeading icon={BellRing} title="Alerts & Actions" tint="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
          <AlertsTable />
        </section>
      )}

    </div>
  );
}
