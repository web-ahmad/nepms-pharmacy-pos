'use client';

import { Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useWhatsAppQR } from '@/features/settings/services/settings.api';
import { SettingsCard } from '@/features/settings/components/SettingsUI';

/**
 * WhatsApp Web Integration — moved here from General Settings. This lives under
 * Audit & Compliance because the linked WhatsApp is what receives the
 * high-severity audit alerts and daily reports.
 */
export default function WhatsAppIntegrationCard() {
  const { data, isLoading } = useWhatsAppQR();

  return (
    <SettingsCard
      icon={Smartphone}
      title="WhatsApp Web Integration"
      description="Link your WhatsApp to receive high-severity audit alerts and daily reports."
      delay={0.05}
      accent="emerald"
    >
      <div className="flex flex-col items-center justify-center min-h-[280px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Loader2 className="animate-spin text-green-600" size={32} />
            <p>Connecting to WhatsApp Microservice...</p>
          </div>
        ) : data?.error ? (
          <div className="flex flex-col items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
            <AlertCircle size={32} />
            <p className="font-bold">{data.error}</p>
            <p className="text-sm text-red-400">Ensure the whatsapp_service node app is running.</p>
          </div>
        ) : data?.connected ? (
          <div className="flex flex-col items-center gap-3 text-green-600">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} />
            </div>
            <p className="font-bold text-lg">WhatsApp Connected</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Security alerts will be sent automatically.</p>
          </div>
        ) : data?.qr ? (
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
            </div>
            <div className="text-center">
              <p className="font-bold text-zinc-900 dark:text-white">Scan this QR Code</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                Open WhatsApp on your phone, go to Linked Devices, and scan this code to link the Pharvix bot.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 flex flex-col items-center">
            <Loader2 className="animate-spin mb-2" />
            Generating QR Code...
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
