'use client';

// /super-admin/pharmacies — redirects to the root SA dashboard which hosts the pharmacy view.
// This route exists so the sidebar nav item /super-admin/pharmacies stays highlighted correctly.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PharmaciesRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/super-admin'); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--sa-accent)', borderTopColor: 'transparent' }} />
    </div>
  );
}
