"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Building2, ImagePlus, Loader2, Trash2, IdCard, MapPin, Phone, Globe, Mail,
  Save, CheckCircle2, ReceiptText,
} from 'lucide-react';
import {
  useSettings, useUpdateSettings, useUploadLogo, resolveAssetUrl,
} from '@/features/settings/services/settings.api';
import { SettingsSkeleton } from '@/features/settings/components/SettingsUI';

const defaultCompany = {
  name: '', phone: '', email: '', address: '', city: '', country: '',
  tax_number: '', registration_number: '', logo_url: '', website: '',
};

type Field = keyof typeof defaultCompany;

// Colourful section wrapper
function Section({ title, subtitle, icon: Icon, gradient, delay = 0, children }: {
  title: string; subtitle: string; icon: any; gradient: string; delay?: number; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className={`flex items-center gap-3 bg-gradient-to-r ${gradient} px-5 py-4`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-xs text-white/80">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

function LabeledInput({ label, icon: Icon, value, onChange, type = 'text', placeholder }: {
  label: string; icon?: any; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-900 ${Icon ? 'pl-9 pr-3.5' : 'px-3.5'}`}
        />
      </div>
    </div>
  );
}

export default function CompanySettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(defaultCompany);

  useEffect(() => {
    if (data?.company_settings) setForm({ ...defaultCompany, ...data.company_settings });
  }, [data?.company_settings]);

  const savedState = { ...defaultCompany, ...(data?.company_settings || {}) };
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedState);
  const set = (name: Field) => (v: string) => setForm((f) => ({ ...f, [name]: v }));

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ company_settings: form });
      toast.success('Company profile saved');
    } catch {
      toast.error('Failed to save company profile');
    }
  };

  const handleLogoFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    try {
      const { logo_url } = await uploadLogo.mutateAsync(file);
      setForm((f) => ({ ...f, logo_url }));
      toast.success('Logo uploaded');
    } catch {
      toast.error('Logo upload failed');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  const logoPreview = resolveAssetUrl(form.logo_url);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      {/* Hero / brand banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 shadow-lg sm:p-6"
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-md">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1.5" />
            ) : (
              <Building2 className="h-9 w-9 text-blue-600" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white">{form.name || 'Your Company'}</h1>
            <p className="mt-0.5 text-sm text-white/80">
              This identity — logo, name & address — prints on receipts, invoices and reports.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Brand logo */}
      <Section title="Brand Logo" subtitle="Shown on receipts and report printouts" icon={ReceiptText} gradient="from-emerald-500 to-teal-600" delay={0.04}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
            {logoPreview ? (
              <img src={logoPreview} alt="Company logo" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="text-center text-zinc-400"><ImagePlus className="mx-auto h-7 w-7" /><p className="mt-1 text-[10px]">No logo</p></div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleLogoFile(e.dataTransfer.files?.[0]); }}
              className="group cursor-pointer rounded-xl border-2 border-dashed border-zinc-200 bg-white px-4 py-5 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
            >
              {uploadLogo.isPending ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 group-hover:text-emerald-600 dark:text-zinc-300"><ImagePlus className="h-4 w-4" /> Click or drag an image to upload</span>
              )}
              <p className="mt-1 text-xs text-zinc-400">PNG, JPG, WEBP or SVG · up to 2 MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0])} />
            {form.logo_url && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: '' }))} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20">
                <Trash2 className="h-3.5 w-3.5" /> Remove logo
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Business identity */}
      <Section title="Business Identity" subtitle="Company name & website" icon={Building2} gradient="from-blue-500 to-indigo-600" delay={0.08}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Company Name" icon={Building2} value={form.name} onChange={set('name')} placeholder="e.g. Zain Pharmacy" />
          <LabeledInput label="Website" icon={Globe} value={form.website} onChange={set('website')} placeholder="https://…" />
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact" subtitle="How customers reach you" icon={Phone} gradient="from-violet-500 to-purple-600" delay={0.12}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Phone" icon={Phone} value={form.phone} onChange={set('phone')} placeholder="+92-…" />
          <LabeledInput label="Email" icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="info@…" />
        </div>
      </Section>

      {/* Registration */}
      <Section title="Registration & Tax" subtitle="Legal identifiers on invoices" icon={IdCard} gradient="from-amber-500 to-orange-600" delay={0.16}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Tax Registration Number (NTN)" icon={IdCard} value={form.tax_number} onChange={set('tax_number')} />
          <LabeledInput label="Company Registration #" icon={IdCard} value={form.registration_number} onChange={set('registration_number')} />
        </div>
      </Section>

      {/* Address */}
      <Section title="Address" subtitle="Prints on receipts & reports" icon={MapPin} gradient="from-rose-500 to-pink-600" delay={0.2}>
        <div className="space-y-4">
          <LabeledInput label="Full Address" icon={MapPin} value={form.address} onChange={set('address')} placeholder="Street, area…" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LabeledInput label="City" value={form.city} onChange={set('city')} />
            <LabeledInput label="Country" value={form.country} onChange={set('country')} />
          </div>
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <span className="text-xs text-zinc-500">
          {isDirty ? 'You have unsaved changes' : 'All changes saved'}
        </span>
        <button
          onClick={handleSave}
          disabled={!isDirty || updateSettings.isPending}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all ${
            isDirty && !updateSettings.isPending ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'cursor-not-allowed bg-zinc-300 dark:bg-zinc-700'
          }`}
        >
          {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : isDirty ? <Save size={16} /> : <CheckCircle2 size={16} />}
          {updateSettings.isPending ? 'Saving…' : isDirty ? 'Save Company Profile' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
