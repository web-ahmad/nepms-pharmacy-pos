'use client';

import { motion } from 'framer-motion';
import { Loader2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </motion.div>
  );
}

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
  accent = 'blue',
}: {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  children: ReactNode;
  delay?: number;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'red';
}) {
  const accentClass = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    violet: 'text-violet-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  }[accent];

  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      {(title || Icon) && (
        <div className="border-b border-zinc-200 bg-zinc-50/60 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
            {Icon && <Icon size={18} className={accentClass} />}
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
      )}
      <div className="p-6 space-y-5">{children}</div>
    </motion.div>
  );
}

export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export function SettingsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function SettingsSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function SettingsSaveBar({
  onSave,
  saving,
  dirty,
  label = 'Save Changes',
}: {
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  label?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="flex items-center gap-3 pt-1"
    >
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving…' : label}
      </button>
      {!dirty && !saving && (
        <span className="text-xs text-zinc-400 dark:text-zinc-600">No unsaved changes</span>
      )}
    </motion.div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
