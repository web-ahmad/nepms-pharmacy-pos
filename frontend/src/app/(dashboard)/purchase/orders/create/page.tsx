'use client';

import AutoPurchaseEngine from '@/features/purchase/components/AutoPurchaseEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreatePOPage() {
  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-outline-variant pb-4">
        <Link href="/purchase/orders" className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors bg-zinc-50 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            Intelligent Purchase Order Generation Engine
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Auto-pilot workspace: Fetches low-stock assets and auto-splits POs by optimal suppliers.
          </p>
        </div>
      </div>

      <AutoPurchaseEngine />
    </div>
  );
}
