'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Wait for Zustand persist hydration
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  // Once hydrated, verify super_admin status via backend
  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !accessToken) {
      router.replace('/login');
      return;
    }

    // Check is_super_admin from stored user OR verify via API
    const storedSuperAdmin = (user as any)?.is_super_admin === true;
    if (storedSuperAdmin) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // If not in JWT claims, verify via API (handles edge case of freshly-added SA)
    fetch('/api/v1/super-admin/pharmacies', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (res.status === 200 || res.status === 401 === false) {
          setAuthorized(res.ok);
        } else {
          setAuthorized(false);
        }
        setChecking(false);
      })
      .catch(() => {
        setAuthorized(false);
        setChecking(false);
      });
  }, [hydrated, isAuthenticated, accessToken, user, router]);

  if (!hydrated || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            This area is restricted to Super Administrators only.<br />
            Your account does not have the required privileges.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="mt-6 px-6 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors text-sm"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {children}
    </div>
  );
}
