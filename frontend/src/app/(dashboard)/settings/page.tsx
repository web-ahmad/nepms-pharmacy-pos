"use client";

import { useSettings, useUpdateSettings } from '@/features/settings/services/settings.api';
import { Store, Monitor, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsDashboardPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const currentMode = data?.pos_settings?.workflow_mode || 'SINGLE_COUNTER';
  const [posMode, setPosMode] = useState(currentMode);

  // Sync state when data loads
  useEffect(() => {
    if (data?.pos_settings?.workflow_mode) {
      setPosMode(data.pos_settings.workflow_mode);
    }
  }, [data?.pos_settings?.workflow_mode]);

  const handleSave = async () => {
    if (posMode === currentMode) return;
    await updateSettings.mutateAsync({
      pos_settings: {
        ...(data?.pos_settings || {}),
        workflow_mode: posMode
      }
    });
  };

  const isDirty = posMode !== currentMode;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">General Configuration</h2>
          <p className="text-sm text-zinc-500">Manage tenant-level global settings</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Store size={18} className="text-blue-500" />
              POS Workflow Mode
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Toggle between Single Counter (Instant) and Dual Counter (Cashier Portal).
            </p>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col gap-6">
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
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isDirty || updateSettings.isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </div>

        <WhatsAppIntegrationCard />
      </div>
    </div>
  );
}

import { useWhatsAppQR } from '@/features/settings/services/settings.api';
import { Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

function WhatsAppIntegrationCard() {
  const { data, isLoading } = useWhatsAppQR();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Smartphone size={18} className="text-green-500" />
          WhatsApp Web Integration
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Link your WhatsApp to receive high-severity Audit alerts and daily reports.
        </p>
      </div>

      <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center min-h-[300px]">
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
              {/* Note: In a real app we would render a QR code from the base64, but whatsapp-web.js often provides text or base64. Let's assume it's base64 image or use a library */}
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
    </div>
  );
}
