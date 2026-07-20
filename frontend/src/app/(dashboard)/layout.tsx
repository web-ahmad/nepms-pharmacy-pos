'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { PharmacyChatbot } from '@/components/chat/PharmacyChatbot';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Read auth state directly from the store — works after hydration
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Track whether the Zustand persist layer has finished rehydrating from localStorage.
  // Without this guard, the layout renders before localStorage is read and
  // `isAuthenticated` is temporarily `false`, causing a redirect loop.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // useAuthStore.persist.hasHydrated() is available when using the persist middleware.
    // Poll until hydration is done (usually instant on first tick).
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated before this effect ran, set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    // Only redirect after hydration is confirmed so we don't
    // accidentally redirect a freshly logged-in user.
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Show nothing until hydration + auth check is complete
  if (!hydrated) return null;

  // Unauthenticated — redirect is in flight, render nothing
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNavigation />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <PharmacyChatbot />
    </div>
  );
}
