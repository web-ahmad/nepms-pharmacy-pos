'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Brand accent presets ─────────────────────────────────────────────────────
// Each accent is a GRADIENT (from → to). The `from` colour is the solid brand
// used for text / rings / soft tints; the pair drives every gradient surface
// (sidebar active item, settings tabs, dashboard hero, POS primary, …) via the
// --brand / --brand-2 CSS variables set by applyAppPreferences().
export type AccentName =
  | 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'slate'
  | 'teal' | 'fuchsia' | 'sunset' | 'ocean' | 'custom';

export interface Accent {
  name: AccentName;
  label: string;
  from: string; // solid brand + gradient start
  to: string;   // gradient end
}

export const ACCENTS: Accent[] = [
  { name: 'blue',    label: 'Blue',    from: '#3b82f6', to: '#1d4ed8' },
  { name: 'emerald', label: 'Emerald', from: '#10b981', to: '#047857' },
  { name: 'teal',    label: 'Teal',    from: '#14b8a6', to: '#0f766e' },
  { name: 'cyan',    label: 'Cyan',    from: '#06b6d4', to: '#0e7490' },
  { name: 'indigo',  label: 'Indigo',  from: '#6366f1', to: '#4338ca' },
  { name: 'violet',  label: 'Violet',  from: '#8b5cf6', to: '#6d28d9' },
  { name: 'fuchsia', label: 'Fuchsia', from: '#d946ef', to: '#a21caf' },
  { name: 'rose',    label: 'Rose',    from: '#f43f5e', to: '#be123c' },
  { name: 'amber',   label: 'Amber',   from: '#f59e0b', to: '#b45309' },
  { name: 'sunset',  label: 'Sunset',  from: '#f97316', to: '#db2777' },
  { name: 'ocean',   label: 'Ocean',   from: '#06b6d4', to: '#4f46e5' },
  { name: 'slate',   label: 'Slate',   from: '#64748b', to: '#334155' },
];

// ── Colour maths (client-side; used to derive tints/shades) ──────────────────
const clamp = (n: number) => Math.max(0, Math.min(255, n));
function hexToRgb(hex: string) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => clamp(Math.round(x)).toString(16).padStart(2, '0')).join('');
}
function mix(hex: string, target: string, amt: number) {
  const a = hexToRgb(hex), b = hexToRgb(target);
  return rgbToHex(a.r + (b.r - a.r) * amt, a.g + (b.g - a.g) * amt, a.b + (b.b - a.b) * amt);
}
const darken = (hex: string, amt: number) => mix(hex, '#000000', amt);
const lighten = (hex: string, amt: number) => mix(hex, '#ffffff', amt);
function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function readableFg(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? '#0a0a0a' : '#ffffff';
}

interface AppPreferencesState {
  accent: AccentName;
  customFrom: string;
  customTo: string;
  reduceMotion: boolean;
  compact: boolean;
  setAccent: (a: AccentName) => void;
  setCustomGradient: (from: string, to: string) => void;
  setReduceMotion: (v: boolean) => void;
  setCompact: (v: boolean) => void;
}

export const useAppPreferences = create<AppPreferencesState>()(
  persist(
    (set) => ({
      accent: 'blue',
      customFrom: '#6366f1',
      customTo: '#ec4899',
      reduceMotion: false,
      compact: false,
      setAccent: (accent) => set({ accent }),
      setCustomGradient: (customFrom, customTo) => set({ customFrom, customTo, accent: 'custom' }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setCompact: (compact) => set({ compact }),
    }),
    { name: 'nepms-app-preferences' }
  )
);

/** Resolve the active {from,to} gradient stops from the saved preference. */
export function resolveAccentStops(state: Pick<AppPreferencesState, 'accent' | 'customFrom' | 'customTo'>) {
  if (state.accent === 'custom') return { from: state.customFrom, to: state.customTo };
  const a = ACCENTS.find((x) => x.name === state.accent) || ACCENTS[0];
  return { from: a.from, to: a.to };
}

/** Apply the current preferences to the document root as CSS vars / attributes.
 *  Drives both the --brand* family (gradients/highlights) AND the Material
 *  --md-primary* family (primary buttons + the POS terminal) so a single accent
 *  choice recolours the entire software. */
export function applyAppPreferences(
  state: Pick<AppPreferencesState, 'accent' | 'customFrom' | 'customTo' | 'reduceMotion' | 'compact'>
) {
  if (typeof document === 'undefined') return;
  const { from, to } = resolveAccentStops(state);
  const root = document.documentElement;

  // Brand gradient family
  root.style.setProperty('--brand', from);
  root.style.setProperty('--brand-2', to);
  root.style.setProperty('--brand-soft', rgba(from, 0.12));
  root.style.setProperty('--brand-strong', darken(from, 0.12));
  root.style.setProperty('--brand-fg', readableFg(from));

  // Material "primary" family → primary buttons + POS follow the accent too
  root.style.setProperty('--md-primary', from);
  root.style.setProperty('--md-primary-container', darken(from, 0.2));
  root.style.setProperty('--md-on-primary-container', lighten(from, 0.75));

  root.setAttribute('data-reduce-motion', state.reduceMotion ? 'true' : 'false');
  root.setAttribute('data-compact', state.compact ? 'true' : 'false');
}
