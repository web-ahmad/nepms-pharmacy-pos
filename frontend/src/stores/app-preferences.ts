'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Brand accent presets — these recolor the sidebar/nav active state and other
// accent surfaces via the --brand / --brand-soft CSS variables.
export type AccentName = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'slate';

export const ACCENTS: { name: AccentName; label: string; hex: string; soft: string }[] = [
  { name: 'blue',    label: 'Blue',    hex: '#2563eb', soft: 'rgba(37,99,235,0.12)' },
  { name: 'emerald', label: 'Emerald', hex: '#059669', soft: 'rgba(5,150,105,0.12)' },
  { name: 'violet',  label: 'Violet',  hex: '#7c3aed', soft: 'rgba(124,58,237,0.12)' },
  { name: 'rose',    label: 'Rose',    hex: '#e11d48', soft: 'rgba(225,29,72,0.12)' },
  { name: 'amber',   label: 'Amber',   hex: '#d97706', soft: 'rgba(217,119,6,0.14)' },
  { name: 'cyan',    label: 'Cyan',    hex: '#0891b2', soft: 'rgba(8,145,178,0.12)' },
  { name: 'indigo',  label: 'Indigo',  hex: '#4f46e5', soft: 'rgba(79,70,229,0.12)' },
  { name: 'slate',   label: 'Slate',   hex: '#475569', soft: 'rgba(71,85,105,0.14)' },
];

interface AppPreferencesState {
  accent: AccentName;
  reduceMotion: boolean;
  compact: boolean;
  setAccent: (a: AccentName) => void;
  setReduceMotion: (v: boolean) => void;
  setCompact: (v: boolean) => void;
}

export const useAppPreferences = create<AppPreferencesState>()(
  persist(
    (set) => ({
      accent: 'blue',
      reduceMotion: false,
      compact: false,
      setAccent: (accent) => set({ accent }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setCompact: (compact) => set({ compact }),
    }),
    { name: 'nepms-app-preferences' }
  )
);

/** Apply the current preferences to the document root as CSS vars / attributes. */
export function applyAppPreferences(state: Pick<AppPreferencesState, 'accent' | 'reduceMotion' | 'compact'>) {
  if (typeof document === 'undefined') return;
  const accent = ACCENTS.find((a) => a.name === state.accent) || ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty('--brand', accent.hex);
  root.style.setProperty('--brand-soft', accent.soft);
  root.setAttribute('data-reduce-motion', state.reduceMotion ? 'true' : 'false');
  root.setAttribute('data-compact', state.compact ? 'true' : 'false');
}
