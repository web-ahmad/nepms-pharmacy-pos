import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SystemModule } from '../types/settings';
import { useUpdateModule } from '../services/settings.api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, LayoutDashboard, PieChart, Activity, ShoppingCart, Package,
  ShoppingBag, DollarSign, Users, Stethoscope, UserCog, Blocks, Power, CheckCircle2,
  Wallet, FileText, PlusCircle, AlertTriangle, ClipboardList, Megaphone, Bell,
  ShieldAlert, ShieldCheck, Receipt,
} from 'lucide-react';

// ── Per-module presentation (icon, blurb, accent) — keyed by module_key ───────
type Accent = 'blue' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'orange' | 'green' | 'rose' | 'cyan' | 'purple';

const MODULE_META: Record<string, { description: string; icon: any; accent: Accent }> = {
  dashboard:      { description: 'Home overview with KPIs, charts and live alerts.',  icon: LayoutDashboard, accent: 'blue'    },
  reports:        { description: 'Business reports and reporting hub.',               icon: PieChart,        accent: 'indigo'  },
  analytics:      { description: 'Advanced analytics, trends and insights.',          icon: Activity,        accent: 'violet'  },
  pos:            { description: 'Point-of-sale checkout terminal.',                  icon: ShoppingCart,    accent: 'emerald' },
  cashier:        { description: 'Cashier portal and cash register sessions.',        icon: Wallet,          accent: 'green'   },
  sales:          { description: 'Sales history and invoices.',                       icon: FileText,        accent: 'cyan'    },
  add_medicine:   { description: 'Add and edit medicines in the catalog.',            icon: PlusCircle,      accent: 'amber'   },
  inventory:      { description: 'Stock, batches and inventory management.',          icon: Package,         accent: 'amber'   },
  low_stock:      { description: 'Low-stock and reorder alerts.',                     icon: AlertTriangle,   accent: 'orange'  },
  physical_audit: { description: 'Physical stock counts and reconciliation.',         icon: ClipboardList,   accent: 'amber'   },
  purchases:      { description: 'Suppliers, purchase orders, GRN and invoices.',     icon: ShoppingBag,     accent: 'orange'  },
  expenses:       { description: 'Petty cash and expense vouchers.',                  icon: Receipt,         accent: 'green'   },
  accounting:     { description: 'Ledgers, journals and financial books.',            icon: DollarSign,      accent: 'green'   },
  customers:      { description: 'Customer CRM, credit ledgers and loyalty.',         icon: Users,           accent: 'rose'    },
  marketing:      { description: 'Campaigns, segments and promotions.',               icon: Megaphone,       accent: 'rose'    },
  prescriptions:  { description: 'Digital prescriptions and Rx uploads.',             icon: Stethoscope,     accent: 'cyan'    },
  hr:             { description: 'HR, employees, attendance and payroll.',            icon: UserCog,         accent: 'purple'  },
  compliance:     { description: 'Compliance logs and retention policies.',           icon: ClipboardList,   accent: 'blue'    },
  audit_center:   { description: 'Audit surveillance, alerts and risk scores.',       icon: ShieldCheck,     accent: 'indigo'  },
  notifications:  { description: 'System notifications and alerts inbox.',            icon: Bell,            accent: 'amber'   },
  users:          { description: 'User accounts and role assignments.',              icon: Users,           accent: 'blue'    },
  roles:          { description: 'RBAC roles and permissions.',                       icon: ShieldAlert,     accent: 'violet'  },
};

const ACCENT: Record<Accent, { tile: string; on: string }> = {
  blue:    { tile: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',          on: 'bg-blue-600'    },
  indigo:  { tile: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',  on: 'bg-indigo-600'  },
  violet:  { tile: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',  on: 'bg-violet-600'  },
  emerald: { tile: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', on: 'bg-emerald-600' },
  amber:   { tile: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',      on: 'bg-amber-500'   },
  orange:  { tile: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',  on: 'bg-orange-500'  },
  green:   { tile: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',       on: 'bg-green-600'   },
  rose:    { tile: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',           on: 'bg-rose-500'    },
  cyan:    { tile: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',           on: 'bg-cyan-600'    },
  purple:  { tile: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',   on: 'bg-purple-600'  },
};

const DEFAULT_META = { description: 'Feature module.', icon: Blocks, accent: 'blue' as Accent };

interface ModuleTableProps {
  data: SystemModule[];
  isLoading: boolean;
}

export default function ModuleTable({ data, isLoading }: ModuleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const activeCount = useMemo(() => data.filter(m => m.is_enabled).length, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1].map(i => (
          <div key={i} className="space-y-3 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const filtered = data.filter(m =>
    m.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.module_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce((acc, mod) => {
    (acc[mod.category] ||= []).push(mod);
    return acc;
  }, {} as Record<string, SystemModule[]>);

  return (
    <div className="space-y-5">
      {/* Toolbar: search + active summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search modules..."
            className="w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {activeCount} of {data.length} active
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, modules], gi) => (
          <motion.section
            key={category}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: gi * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-transparent px-5 py-3.5 dark:border-zinc-800 dark:from-zinc-900/60">
              <Blocks size={15} className="text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">{category}</h3>
              <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {modules.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {modules.map((mod, ri) => (
                <ModuleRow key={mod.id} module={mod} index={ri} />
              ))}
            </div>
          </motion.section>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center dark:border-zinc-800">
            <Blocks className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-500">No modules match “{searchTerm}”.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single module row ─────────────────────────────────────────────────────────
function ModuleRow({ module, index }: { module: SystemModule; index: number }) {
  const meta = MODULE_META[module.module_key] || DEFAULT_META;
  const accent = ACCENT[meta.accent];
  const Icon = meta.icon;
  const updateModule = useUpdateModule(module.id);

  const [enabled, setEnabled] = useState(module.is_enabled);
  useEffect(() => setEnabled(module.is_enabled), [module.is_enabled]);

  const toggle = () => {
    if (updateModule.isPending) return;
    const next = !enabled;
    setEnabled(next); // optimistic
    updateModule.mutate(next, {
      onSuccess: () => {
        toast.success(`${module.module_name} ${next ? 'enabled' : 'disabled'}`, {
          icon: next ? '✅' : '🚫',
        });
      },
      onError: () => {
        setEnabled(!next); // revert
        toast.error(`Couldn't update ${module.module_name}`);
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 ${enabled ? '' : 'opacity-70'}`}
    >
      {/* Icon tile */}
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all ${enabled ? accent.tile : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{module.module_name}</h4>
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{module.module_key}</code>
        </div>
        <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{meta.description}</p>
      </div>

      {/* Status badge */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={enabled ? 'on' : 'off'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
            enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {enabled ? <CheckCircle2 className="h-3 w-3" /> : <Power className="h-3 w-3" />}
          {enabled ? 'Active' : 'Disabled'}
        </motion.span>
      </AnimatePresence>

      {/* Animated toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${module.module_name}`}
        onClick={toggle}
        disabled={updateModule.isPending}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-950 ${
          enabled ? accent.on : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <motion.span
          layout
          className="absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md"
          animate={{ left: enabled ? 26 : 4 }}
          transition={{ type: 'spring', stiffness: 550, damping: 32 }}
        />
      </button>
    </motion.div>
  );
}
