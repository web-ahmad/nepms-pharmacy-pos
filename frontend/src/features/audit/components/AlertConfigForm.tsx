'use client';

import { useAlertConfigs, useUpdateAlertConfig, useGetWhatsappNumber, useSetWhatsappNumber } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Loader2, Save, Bell, BellOff, MessageCircle, Smartphone,
  Scissors, RefreshCw, DollarSign, Package, CalendarX, Clock, CheckCircle2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// ── Metadata for each event type ─────────────────────────────────────────────
const EVENT_META: Record<string, {
  label: string; description: string; icon: any; color: string;
  hasThreshold: boolean; thresholdLabel: string; thresholdUnit: string;
}> = {
  void: {
    label: 'Sale Void',
    description: 'Alert owner when a cashier voids a sale at the POS.',
    icon: Scissors, color: 'text-red-500',
    hasThreshold: false, thresholdLabel: '', thresholdUnit: '',
  },
  discount: {
    label: 'Discount Alert',
    description: 'Alert when a discount exceeds the configured threshold percentage.',
    icon: RefreshCw, color: 'text-purple-500',
    hasThreshold: true, thresholdLabel: 'Max Discount Allowed', thresholdUnit: '%',
  },
  refund: {
    label: 'Refund Issued',
    description: 'Alert owner whenever a refund is processed.',
    icon: RefreshCw, color: 'text-orange-500',
    hasThreshold: false, thresholdLabel: '', thresholdUnit: '',
  },
  cash_variance: {
    label: 'Cash Drawer Variance',
    description: 'Alert when the cash drawer is short or over at shift close.',
    icon: DollarSign, color: 'text-green-600',
    hasThreshold: true, thresholdLabel: 'Min Variance to Alert', thresholdUnit: 'Rs',
  },
  expired: {
    label: 'Expired Stock',
    description: 'Alert when expired medicine is detected in inventory.',
    icon: Package, color: 'text-red-600',
    hasThreshold: false, thresholdLabel: '', thresholdUnit: '',
  },
  near_expiry: {
    label: 'Near-Expiry Warning',
    description: 'Alert when stock is expiring within the configured days window.',
    icon: CalendarX, color: 'text-yellow-600',
    hasThreshold: true, thresholdLabel: 'Days Before Expiry', thresholdUnit: 'days',
  },
};

const NOTIFY_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { value: 'dashboard', label: 'Dashboard Only', icon: Smartphone, color: 'text-blue-600' },
  { value: 'both', label: 'Both', icon: Bell, color: 'text-purple-600' },
];

export default function AlertConfigForm({ branchId }: { branchId?: string }) {
  const { data: configs, isLoading, refetch } = useAlertConfigs(branchId);
  const { data: whatsappData, isLoading: isLoadingWa } = useGetWhatsappNumber(branchId);
  const { mutate: setWhatsappNumber, isPending: isSettingWa } = useSetWhatsappNumber();

  const [waNumber, setWaNumber] = useState('');
  
  useEffect(() => {
    if (whatsappData?.whatsapp_number) {
      setWaNumber(whatsappData.whatsapp_number);
    }
  }, [whatsappData]);

  if (isLoading || isLoadingWa) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Bell className="w-10 h-10 mx-auto text-zinc-300" />
          <p className="text-zinc-500 font-medium">No alert configurations found.</p>
          <p className="text-xs text-zinc-400">Restart the backend to auto-seed default configurations.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-blue-600 underline hover:no-underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Sort configs in a consistent order
  const ORDER = ['void', 'discount', 'refund', 'cash_variance', 'expired', 'near_expiry'];
  const sorted = [...configs].sort((a: any, b: any) => {
    const ai = ORDER.indexOf(a.event_type);
    const bi = ORDER.indexOf(b.event_type);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  
  const handleSaveWaNumber = () => {
    setWhatsappNumber({ whatsapp_number: waNumber, branch_id: branchId }, {
      onSuccess: () => {
        toast.success("WhatsApp number updated successfully");
      },
      onError: () => {
        toast.error("Failed to update WhatsApp number");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header info strip */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-sm">
        <MessageCircle className="w-6 h-6 flex-shrink-0" />
        <div className="flex-1">
          <span className="block mb-2 font-medium">
            Configure the WhatsApp number where alerts will be sent:
          </span>
          <div className="flex items-center gap-2 max-w-sm">
             <input 
               type="text" 
               className="flex-1 px-3 py-2 border rounded text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
               placeholder="e.g. +923001234567" 
               value={waNumber}
               onChange={(e) => setWaNumber(e.target.value)}
             />
             <button 
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
               onClick={handleSaveWaNumber}
               disabled={isSettingWa}
             >
               {isSettingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               Save
             </button>
          </div>
        </div>
      </div>

      {sorted.map((config: any) => (
        <AlertConfigCard key={config.id} config={config} />
      ))}
    </div>
  );
}

// ── Single alert config card ─────────────────────────────────────────────────

function AlertConfigCard({ config }: { config: any }) {
  const meta  = EVENT_META[config.event_type] || {
    label: config.event_type, description: '', icon: Bell, color: 'text-zinc-500',
    hasThreshold: true, thresholdLabel: 'Threshold', thresholdUnit: '',
  };
  const Icon  = meta.icon;
  const { mutate, isPending } = useUpdateAlertConfig();

  const [isEnabled,  setIsEnabled]  = useState<boolean>(config.is_enabled ?? true);
  const [threshold,  setThreshold]  = useState<string>(config.threshold_value != null ? String(config.threshold_value) : '');
  const [notifyVia,  setNotifyVia]  = useState<string>(config.notify_via || 'whatsapp');
  const [dirty,      setDirty]      = useState(false);

  // Sync when parent data refreshes
  useEffect(() => {
    setIsEnabled(config.is_enabled ?? true);
    setThreshold(config.threshold_value != null ? String(config.threshold_value) : '');
    setNotifyVia(config.notify_via || 'whatsapp');
    setDirty(false);
  }, [config]);

  const handleSave = () => {
    const payload: any = {
      id:         config.id,
      is_enabled: isEnabled,
      notify_via: notifyVia,
    };
    if (meta.hasThreshold && threshold !== '') {
      payload.threshold_value = parseFloat(threshold);
    }

    mutate(payload, {
      onSuccess: () => {
        toast.success(`✅ "${meta.label}" settings saved!`);
        setDirty(false);
      },
      onError: (err: any) => toast.error(`Failed: ${err.message}`),
    });
  };

  const mark = () => setDirty(true);

  return (
    <Card className={`transition-all duration-200 ${!isEnabled ? 'opacity-60' : ''} ${dirty ? 'border-blue-300 dark:border-blue-700' : ''}`}>
      <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + labels */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${meta.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-tight">
                {meta.label}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {meta.description}
              </CardDescription>
            </div>
          </div>

          {/* Right: enable toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-zinc-500">{isEnabled ? 'Enabled' : 'Disabled'}</span>
            <button
              type="button"
              onClick={() => { setIsEnabled(v => !v); mark(); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-4">
        <div className="flex flex-wrap items-end gap-4">

          {/* Notify Via selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Notify Via</label>
            <div className="flex gap-2">
              {NOTIFY_OPTIONS.map(opt => {
                const OIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setNotifyVia(opt.value); mark(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      notifyVia === opt.value
                        ? `bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400`
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    <OIcon className={`w-3.5 h-3.5 ${notifyVia === opt.value ? opt.color : ''}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Threshold input (conditional) */}
          {meta.hasThreshold && (
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
                {meta.thresholdLabel} {meta.thresholdUnit && <span className="text-zinc-400">({meta.thresholdUnit})</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={threshold}
                onChange={e => { setThreshold(e.target.value); mark(); }}
                disabled={!isEnabled}
                className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm dark:bg-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                placeholder={`e.g. ${meta.thresholdUnit === '%' ? '20' : meta.thresholdUnit === 'days' ? '30' : '50'}`}
              />
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            disabled={!dirty || isPending}
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dirty && !isPending
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : dirty ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
            }
            {isPending ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>

        {/* Current status strip */}
        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
          {isEnabled
            ? <span className="flex items-center gap-1 text-green-600"><Bell className="w-3 h-3" /> Alerts active</span>
            : <span className="flex items-center gap-1"><BellOff className="w-3 h-3" /> Alerts suppressed</span>
          }
          {meta.hasThreshold && threshold && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Threshold: {threshold} {meta.thresholdUnit}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            Channel: {notifyVia}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
