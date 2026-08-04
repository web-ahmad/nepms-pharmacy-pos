'use client';
// "Quick" dropdown in the POS header — jump straight to the modules a salesman
// needs without leaving the terminal. In-sale actions (search / hold / held /
// clear) stay on the keyboard shortcuts and the buttons already on screen.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Users, FileText, Package, UserCircle2, ChevronDown, Stethoscope,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

type QuickItem = {
  label: string;
  hint?: string;
  icon: typeof Zap;
  href: string;
  /** Hidden when the user lacks this permission. */
  permission?: string;
};

const ITEMS: QuickItem[] = [
  { label: 'Sales history', icon: FileText, href: '/sales', permission: 'sales:view' },
  { label: 'Customers', icon: Users, href: '/customers', permission: 'customers:view' },
  { label: 'Stock / inventory', icon: Package, href: '/inventory', permission: 'inventory:view' },
  { label: 'Prescriptions', icon: Stethoscope, href: '/prescriptions', permission: 'prescriptions:view' },
  { label: 'My HR', hint: 'attendance, payslips', icon: UserCircle2, href: '/hr/me', permission: 'hr:self' },
];

export function QuickActionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = ITEMS.filter((i) => !i.permission || hasPermission(i.permission));
  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition-all hover:shadow-md ${
          open
            ? 'border-primary/40 bg-primary/10'
            : 'border-outline-variant/50 bg-surface hover:border-primary/30'
        }`}
      >
        <Zap size={16} className="text-primary/70" />
        <span className="text-sm font-semibold">Quick</span>
        <ChevronDown size={14} className={`text-primary/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-2xl"
          >
            {items.map((it) => (
              <button
                key={it.href}
                onClick={() => { setOpen(false); router.push(it.href); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <it.icon size={15} className="text-on-surface-variant" />
                <span className="flex-1">{it.label}</span>
                {it.hint && (
                  <span className="text-[10px] font-semibold text-on-surface-variant/70">{it.hint}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
