"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Sun, Moon, Monitor, Palette, SlidersHorizontal, Check, Zap, Rows3,
} from 'lucide-react';
import { useAppPreferences, ACCENTS, AccentName } from '@/stores/app-preferences';
import {
  SettingsPageHeader, SettingsCard, SettingsToggleRow,
} from '@/features/settings/components/SettingsUI';

const THEMES = [
  { value: 'light',  label: 'Light',  icon: Sun,     preview: 'bg-white border-zinc-200' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    preview: 'bg-zinc-900 border-zinc-700' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-zinc-900 border-zinc-300' },
];

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent, reduceMotion, setReduceMotion, compact, setCompact } = useAppPreferences();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // avoid theme hydration mismatch

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader
        icon={SettingsIcon}
        title="General"
        description="Appearance, theme, brand colors and interface preferences for this software."
      />

      {/* ── Theme ────────────────────────────────────────────────────── */}
      <SettingsCard icon={SlidersHorizontal} title="Theme" description="Choose how the software looks. System follows your device setting." delay={0.04} accent="blue">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = mounted && theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  active
                    ? 'border-[var(--brand)] ring-2 ring-[var(--brand-soft)]'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                {active && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: 'var(--brand)' }}>
                    <Check size={12} />
                  </span>
                )}
                <div className={`h-12 w-full rounded-lg border ${t.preview}`} />
                <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  <Icon size={15} /> {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Accent / Brand colour ───────────────────────────────────── */}
      <SettingsCard icon={Palette} title="Accent Colour" description="Recolours the sidebar navigation, active tabs and highlights across the app." delay={0.08} accent="violet">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = accent === a.name;
            return (
              <button
                key={a.name}
                type="button"
                title={a.label}
                onClick={() => setAccent(a.name as AccentName)}
                className={`group relative h-11 w-11 rounded-xl transition-transform hover:scale-105 focus:outline-none ${active ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-950' : ''}`}
                style={{ backgroundColor: a.hex }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    <Check size={18} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">Live preview:</span>
          <span className="rounded-md px-3 py-1 text-sm font-semibold" style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-soft)' }}>
            Active navigation item
          </span>
          <span className="rounded-md px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--brand)' }}>
            Primary button
          </span>
        </div>
      </SettingsCard>

      {/* ── Interface ───────────────────────────────────────────────── */}
      <SettingsCard icon={Zap} title="Interface" description="Fine-tune motion and density. Saved to this browser." delay={0.12} accent="emerald">
        <SettingsToggleRow
          label="Reduce Motion"
          description="Minimise animations and transitions across the app"
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
        <SettingsToggleRow
          label="Compact Density"
          description="Tighten spacing to fit more on screen"
          checked={compact}
          onChange={setCompact}
        />
        <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          <Rows3 size={14} />
          Appearance & interface preferences apply instantly and are remembered on this device — no save needed.
        </div>
      </SettingsCard>
    </div>
  );
}
