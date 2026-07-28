'use client';

import { useEffect } from 'react';
import { useAppPreferences, applyAppPreferences } from '@/stores/app-preferences';

/** Mounts once (in Providers) and keeps the document root's brand CSS vars and
 *  interface attributes in sync with the user's saved preferences. */
export default function AppPreferencesApplier() {
  const accent = useAppPreferences((s) => s.accent);
  const reduceMotion = useAppPreferences((s) => s.reduceMotion);
  const compact = useAppPreferences((s) => s.compact);

  useEffect(() => {
    applyAppPreferences({ accent, reduceMotion, compact });
  }, [accent, reduceMotion, compact]);

  return null;
}
