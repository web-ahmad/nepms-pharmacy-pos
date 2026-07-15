'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SuperAdminShell } from './SuperAdminShell';

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

  // ── Loading spinner (using SA tokens via inline style) ──────────────────────
  if (!hydrated || checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--sa-bg)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--sa-accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm animate-pulse" style={{ color: 'var(--sa-text-muted)' }}>
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  // ── Access denied ───────────────────────────────────────────────────────────
  if (!authorized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--sa-bg)' }}
      >
        <div className="text-center px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
            style={{ background: 'var(--sa-danger-muted)', border: '1px solid var(--sa-danger)30' }}
          >
            <ShieldAlert className="w-10 h-10" style={{ color: 'var(--sa-danger)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--sa-text)' }}>
            Access Denied
          </h1>
          <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--sa-text-muted)' }}>
            This area is restricted to Super Administrators only.
            <br />Your account does not have the required privileges.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="mt-6 px-6 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--sa-danger-muted)',
              border: '1px solid var(--sa-danger)40',
              color: 'var(--sa-danger)',
            }}
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Authorized — render the shell ──────────────────────────────────────────
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
