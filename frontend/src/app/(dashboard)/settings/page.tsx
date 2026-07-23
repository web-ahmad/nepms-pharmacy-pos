"use client";

import { useSettings, useUpdateSettings, useWhatsAppQR } from '@/features/settings/services/settings.api';
import { Store, Monitor, Smartphone, CheckCircle2, AlertCircle, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  SettingsPageHeader, SettingsCard, SettingsSaveBar, SettingsSkeleton,
} from '@/features/settings/components/SettingsUI';

export default function SettingsDashboardPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const currentMode = data?.pos_settings?.workflow_mode || 'SINGLE_COUNTER';
  const [posMode, setPosMode] = useState(currentMode);

  useEffect(() => {
    if (data?.pos_settings?.workflow_mode) {
      setPosMode(data.pos_settings.workflow_mode);
    }
  }, [data?.pos_settings?.workflow_mode]);

  const handleSave = async () => {
    if (posMode === currentMode) return;
    try {
      await updateSettings.mutateAsync({
        pos_settings: {
          ...(data?.pos_settings || {}),
          workflow_mode: posMode
        }
      });
      toast.success('POS workflow mode saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const isDirty = posMode !== currentMode;

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPageHeader icon={SettingsIcon} title="General" description="Tenant-level workflow mode and integrations." />

      <SettingsCard icon={Store} title="POS Workflow Mode" description="Toggle between Single Counter (Instant) and Dual Counter (Cashier Portal)." delay={0.05}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-zinc-900 dark:text-white">Enable Cashier Portal (Dual Counter)</p>
            <p className="text-xs text-zinc-500 mt-0.5">Orders are sent to a dedicated Cashier for payment verification.</p>
          </div>

          <button
            onClick={() => setPosMode(posMode === 'SINGLE_COUNTER' ? 'DUAL_COUNTER' : 'SINGLE_COUNTER')}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              posMode === 'DUAL_COUNTER' ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                posMode === 'DUAL_COUNTER' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
          {posMode === 'DUAL_COUNTER' ? (
            <>
              <Store size={16} className="text-blue-500" />
              <span>Currently set to <b>Dual Counter</b>. Order Takers cannot collect payments.</span>
            </>
          ) : (
            <>
              <Monitor size={16} className="text-zinc-500" />
              <span>Currently set to <b>Single Counter</b>. Order Takers collect payments instantly.</span>
            </>
          )}
        </div>

        <SettingsSaveBar onSave={handleSave} saving={updateSettings.isPending} dirty={isDirty} />
      </SettingsCard>

      <WhatsAppIntegrationCard />
    </div>
  );
}

function WhatsAppIntegrationCard() {
  const { data, isLoading } = useWhatsAppQR();

  return (
    <SettingsCard
      icon={Smartphone}
      title="WhatsApp Web Integration"
      description="Link your WhatsApp to receive high-severity Audit alerts and daily reports."
      delay={0.1}
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
                Open WhatsApp on your phone, go to Linked Devices, and scan this code to link the NEPMS bot.
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
