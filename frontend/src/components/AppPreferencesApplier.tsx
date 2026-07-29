'use client';

import { useEffect } from 'react';
import { useAppPreferences, applyAppPreferences } from '@/stores/app-preferences';

/** Mounts once (in Providers) and keeps the document root's brand CSS vars and
 *  interface attributes in sync with the user's saved preferences. */
export default function AppPreferencesApplier() {
  const accent = useAppPreferences((s) => s.accent);
  const customFrom = useAppPreferences((s) => s.customFrom);
  const customTo = useAppPreferences((s) => s.customTo);
  const reduceMotion = useAppPreferences((s) => s.reduceMotion);
  const compact = useAppPreferences((s) => s.compact);

  useEffect(() => {
    applyAppPreferences({ accent, customFrom, customTo, reduceMotion, compact });
  }, [accent, customFrom, customTo, reduceMotion, compact]);

  return null;
}
