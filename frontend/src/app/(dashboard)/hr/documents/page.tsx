'use client';

import { useState } from 'react';
import { FolderOpen, Plus, Trash2, Loader2, FileText, ExternalLink, AlertTriangle, UploadCloud, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useEmployeeDocuments, useCreateEmployeeDocument, useUpdateEmployeeDocument, useDeleteEmployeeDocument,
  useUploadEmployeeDocument,
} from '@/features/hr/services/hr.api';
import { HrModal, Field, inputCls, EmployeeSelect } from '@/features/hr/components/hr-shared';
import { resolveAssetUrl } from '@/features/settings/services/settings.api';
import type { EmployeeDocument } from '@/features/hr/types/hr';

const DOC_TYPES = ['CNIC', 'Contract', 'Degree', 'License', 'Certificate', 'Medical', 'Other'];
const VERIFY_MAP: Record<string, string> = {
  Verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function VerifySelect({ doc }: { doc: EmployeeDocument }) {
  const update = useUpdateEmployeeDocument(doc.id);
  return (
    <select value={doc.verification_status} onChange={(e) => update.mutate({ verification_status: e.target.value })}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${VERIFY_MAP[doc.verification_status] || VERIFY_MAP.Pending}`}>
      {['Pending', 'Verified', 'Rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function DocumentsPage() {
  const { data: docs, isLoading } = useEmployeeDocuments();
  const create = useCreateEmployeeDocument();
  const del = useDeleteEmployeeDocument();
  const upload = useUploadEmployeeDocument();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeDocument>>({ document_type: 'CNIC', verification_status: 'Pending' });
  const [fileName, setFileName] = useState('');

  const onPickFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File 5MB se choti honi chahiye.'); return; }
    try {
      const res = await toast.promise(upload.mutateAsync(file), {
        loading: 'Uploading file…', success: 'File uploaded ✅', error: 'Upload failed.',
      });
      setForm((f) => ({ ...f, file_path: res.url }));
      setFileName(res.name || file.name);
    } catch { /* handled by toast */ }
  };

  const closeModal = () => { setOpen(false); setForm({ document_type: 'CNIC', verification_status: 'Pending' }); setFileName(''); };

  const save = () => {
    if (!form.employee_id || !form.document_type || !form.file_path) { toast.error('Employee, type aur file zaroori hai.'); return; }
    toast.promise(create.mutateAsync(form).then(closeModal),
      { loading: 'Saving…', success: 'Document added ✅', error: 'Could not add document.' });
  };

  const rows = docs ?? [];
  const expiringSoon = rows.filter((d) => d.expiry_date && differenceInDays(new Date(d.expiry_date), new Date()) <= 30 && differenceInDays(new Date(d.expiry_date), new Date()) >= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"><FolderOpen size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Employee Documents</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Contracts, licenses, certificates &amp; verification</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95">
          <Plus size={16} /> Add Document
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-zinc-500">Total Documents</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{rows.length}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-zinc-500">Verified</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{rows.filter((d) => d.verification_status === 'Verified').length}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="flex items-center gap-1 text-xs font-medium text-zinc-500"><AlertTriangle size={12} className="text-amber-500" /> Expiring ≤30d</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{expiringSoon}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr><th className="px-6 py-4">Employee</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">File</th><th className="px-6 py-4">Expiry</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-zinc-400">No documents yet.</td></tr>
              ) : rows.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{d.employee_name || '—'}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"><FileText size={13} /> {d.document_type}</span></td>
                  <td className="px-6 py-4">
                    {d.file_path ? <a href={resolveAssetUrl(d.file_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400">View <ExternalLink size={12} /></a> : '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{d.expiry_date ? format(new Date(d.expiry_date), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-6 py-4"><VerifySelect doc={d} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => toast.promise(del.mutateAsync(d.id), { loading: 'Deleting…', success: 'Deleted', error: 'Could not delete' })}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <HrModal open={open} title="Add Document" onClose={closeModal}
        footer={<>
          <button onClick={closeModal} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700">Cancel</button>
          <button onClick={save} disabled={create.isPending || upload.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {create.isPending && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </>}>
        <Field label="Employee *"><EmployeeSelect value={form.employee_id || ''} onChange={(v) => setForm({ ...form, employee_id: v })} /></Field>
        <Field label="Document Type *">
          <select className={inputCls} value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Choose File *">
          <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            form.file_path ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-zinc-300 hover:border-emerald-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'}`}>
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(e) => onPickFile(e.target.files?.[0])} />
            {upload.isPending ? (
              <><Loader2 size={22} className="animate-spin text-emerald-500" /><span className="text-sm text-zinc-500">Uploading…</span></>
            ) : form.file_path ? (
              <><CheckCircle2 size={22} className="text-emerald-500" /><span className="max-w-full truncate text-sm font-medium text-emerald-700 dark:text-emerald-300">{fileName || 'File uploaded'}</span><span className="text-xs text-zinc-400">Click again to change</span></>
            ) : (
              <><UploadCloud size={22} className="text-zinc-400" /><span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Click or drag a file to choose</span><span className="text-xs text-zinc-400">PDF, image, DOC or XLS · max 5 MB</span></>
            )}
          </label>
        </Field>
        <Field label="Expiry Date"><input type="date" className={inputCls} value={form.expiry_date?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
      </HrModal>
    </div>
  );
}
