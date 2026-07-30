'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save, UserCog, Camera, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateUser } from '../services/user.api';
import type { EnterpriseUserUpdate } from '../types/user';
import { api } from '@/services/api';
import { resolveAssetUrl } from '@/features/settings/services/settings.api';

interface Props {
  user: any;
  open: boolean;
  onClose: () => void;
}

// Editable enterprise-user fields (email/username live on the auth user and are
// intentionally not editable here).
const TEXT_FIELDS: { key: keyof EnterpriseUserUpdate; label: string; type?: string; full?: boolean }[] = [
  { key: 'full_name',       label: 'Full Name' },
  { key: 'phone',           label: 'Phone' },
  { key: 'employee_id',     label: 'Employee ID' },
  { key: 'cnic',            label: 'CNIC' },
  { key: 'license_number',  label: 'License No.' },
  { key: 'qualification',   label: 'Qualification' },
  { key: 'blood_group',     label: 'Blood Group' },
  { key: 'joining_date',    label: 'Joining Date', type: 'date' },
  { key: 'address',         label: 'Address', full: true },
];

export function EditUserDialog({ user, open, onClose }: Props) {
  const updateMut = useUpdateUser(user?.id);
  const [form, setForm] = useState<EnterpriseUserUpdate>({});
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefill whenever the dialog opens for a user.
  useEffect(() => {
    if (open && user) {
      setForm({
        full_name: user.full_name ?? '',
        phone: user.phone ?? '',
        employee_id: user.employee_id ?? '',
        cnic: user.cnic ?? '',
        license_number: user.license_number ?? '',
        qualification: user.qualification ?? '',
        blood_group: user.blood_group ?? '',
        joining_date: user.joining_date ?? '',
        address: user.address ?? '',
        language: user.language ?? 'en',
        timezone: user.timezone ?? 'Asia/Karachi',
      });
      setAvatarUrl(user.avatar_url ?? '');
    }
  }, [open, user]);

  const set = (k: keyof EnterpriseUserUpdate, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<{ url: string }>('/api/v1/enterprise/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.url);
      set('avatar_url', res.data.url);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const initial = (user?.full_name ?? user?.username ?? 'U').charAt(0).toUpperCase();

  const handleSave = async () => {
    try {
      // Send only non-empty values so we never wipe a field with "".
      const payload: EnterpriseUserUpdate = {};
      (Object.keys(form) as (keyof EnterpriseUserUpdate)[]).forEach((k) => {
        const v = form[k];
        if (v !== '' && v !== undefined && v !== null) (payload as any)[k] = v;
      });
      // Always send avatar_url (allows adding, changing AND removing the photo).
      payload.avatar_url = avatarUrl;
      await updateMut.mutateAsync(payload);
      toast.success('Profile updated');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'Update failed. You may not have permission.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-white dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <UserCog size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit User Details</h3>
                  <p className="text-[11px] text-white/80">{user?.full_name ?? user?.username}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Avatar uploader */}
              <div className="mb-5 flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-black text-white ring-2 ring-white shadow-lg dark:ring-zinc-800">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveAssetUrl(avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-600 shadow-md ring-1 ring-zinc-200 transition-transform hover:scale-105 disabled:opacity-60 dark:bg-zinc-800 dark:text-indigo-400 dark:ring-zinc-700"
                    title="Change photo"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <ImagePlus size={15} /> {uploading ? 'Uploading…' : avatarUrl ? 'Change Image' : 'Add Image'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(''); set('avatar_url', ''); }}
                      className="ml-2 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Remove
                    </button>
                  )}
                  <p className="mt-1.5 text-[11px] text-zinc-400">PNG, JPG, WEBP or GIF · up to 4 MB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TEXT_FIELDS.map((f) => (
                  <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{f.label}</label>
                    <input
                      type={f.type ?? 'text'}
                      value={(form[f.key] as string) ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                ))}

                {/* Language */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Language</label>
                  <select
                    value={(form.language as string) ?? 'en'}
                    onChange={(e) => set('language', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Timezone</label>
                  <input
                    type="text"
                    value={(form.timezone as string) ?? ''}
                    onChange={(e) => set('timezone', e.target.value)}
                    placeholder="Asia/Karachi"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-400">
                Username &amp; email are managed separately and cannot be changed here.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMut.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl disabled:opacity-60"
              >
                {updateMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
