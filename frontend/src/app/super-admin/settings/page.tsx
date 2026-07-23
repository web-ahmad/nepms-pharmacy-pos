'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/features/super-admin/api/usePlatformSettings';
import { useCurrencies } from '@/features/super-admin/api/useCurrencies';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--sa-text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--sa-surface-raised)',
  border: '1px solid var(--sa-border)',
  color: 'var(--sa-text)',
};

export default function SettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { data: currencies } = useCurrencies();
  const updateSettings = useUpdatePlatformSettings();

  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPlatformName(settings.platform_name);
    setSupportEmail(settings.support_email ?? '');
    setSupportPhone(settings.support_phone ?? '');
    setDefaultCurrency(settings.default_currency_code ?? '');
    setMaintenanceMode(settings.maintenance_mode);
    setMaintenanceMessage(settings.maintenance_message ?? '');
    setDirty(false);
  }, [settings]);

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        platform_name: platformName.trim() || 'NEPMS',
        support_email: supportEmail.trim() || null,
        support_phone: supportPhone.trim() || null,
        default_currency_code: defaultCurrency || null,
        maintenance_mode: maintenanceMode,
        maintenance_message: maintenanceMessage.trim() || null,
      });
      toast.success('Settings saved');
      setDirty(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save settings');
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="sa-skeleton h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-7 sa-fade-up">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#64748b18' }}>
          <SettingsIcon className="w-5 h-5" style={{ color: '#64748b' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Platform Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Global configuration for the NEPMS platform.</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4 sa-fade-up" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
        <Field label="Platform Name">
          <input value={platformName} onChange={(e) => markDirty(setPlatformName)(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Support Email">
            <input type="email" value={supportEmail} onChange={(e) => markDirty(setSupportEmail)(e.target.value)} placeholder="support@yourcompany.com" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </Field>
          <Field label="Support Phone">
            <input value={supportPhone} onChange={(e) => markDirty(setSupportPhone)(e.target.value)} placeholder="+92 300 1234567" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </Field>
        </div>

        <Field label="Default Currency">
          <select value={defaultCurrency} onChange={(e) => markDirty(setDefaultCurrency)(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="">— Not set —</option>
            {currencies?.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </Field>

        <div className="pt-2" style={{ borderTop: '1px solid var(--sa-border)' }}>
          <label className="flex items-center gap-2.5 cursor-pointer mb-3 pt-3">
            <input type="checkbox" checked={maintenanceMode} onChange={(e) => markDirty(setMaintenanceMode)(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--sa-text)' }}>Maintenance Mode</span>
          </label>
          {maintenanceMode && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3" style={{ background: 'var(--sa-warning-muted)' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--sa-warning)' }} />
              <p className="text-xs" style={{ color: 'var(--sa-warning)' }}>
                Enabling this may block pharmacy staff from accessing the system. Use with caution.
              </p>
            </div>
          )}
          <Field label="Maintenance Message (optional)">
            <textarea
              value={maintenanceMessage}
              onChange={(e) => markDirty(setMaintenanceMessage)(e.target.value)}
              rows={2}
              placeholder="We'll be back shortly…"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={!dirty || updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--sa-accent)' }}
          >
            {updateSettings.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
