'use client';

import { useRef, useState } from 'react';
import { FolderOpen, UploadCloud, Plus, X, Loader2, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyDocuments, useUploadMyDocumentFile, useAddMyDocument } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  Overlay, ModalPanel, inputCls, labelCls, primaryBtn, ghostBtn, noteCls, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

const DOC_TYPES = ['CNIC', 'Contract', 'Certificate', 'Degree', 'Medical', 'Other'];

export default function MyDocumentsPage() {
  const { data, isLoading } = useMyDocuments();
  const [open, setOpen] = useState(false);

  const rows = data ?? [];
  const count = (s: string) => rows.filter((d) => d.verification_status === s).length;

  return (
    <div className="space-y-6">
      <EssHeader
        icon={FolderOpen}
        title="My Documents"
        subtitle="Upload and track your own documents"
        action={
          <button onClick={() => setOpen(true)} className={primaryBtn}>
            <Plus size={16} /> Upload Document
          </button>
        }
      />

      <StatCards
        items={[
          { label: 'Total', value: rows.length },
          { label: 'Pending', value: count('Pending') },
          { label: 'Verified', value: count('Verified') },
        ]}
      />

      <TableShell headers={['Document', 'Uploaded', 'Expires', 'Status', 'Action']}>
        {isLoading ? (
          <LoadingRow colSpan={5} />
        ) : !rows.length ? (
          <EmptyRow colSpan={5} text="You haven't uploaded any documents yet." />
        ) : (
          rows.map((d) => (
            <tr key={d.id} className={rowCls}>
              <td className={cellCls}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <FileText size={17} />
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{d.document_type}</span>
                </div>
              </td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{d.created_at?.slice(0, 10) || '—'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{d.expiry_date || '—'}</td>
              <td className={cellCls}><StatusPill value={d.verification_status} /></td>
              <td className={`${cellCls} text-right`}>
                <a href={d.file_path} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <ExternalLink size={13} /> Open
                </a>
              </td>
            </tr>
          ))
        )}
      </TableShell>

      {open && <UploadModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [expiry, setExpiry] = useState('');
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);

  const uploadFile = useUploadMyDocumentFile();
  const addDoc = useAddMyDocument();

  const onPick = (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be 5 MB or smaller.'); return; }
    uploadFile.mutate(file, {
      onSuccess: (res) => setUploaded(res),
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Upload failed.'),
    });
  };

  const submit = () => {
    if (!uploaded) { toast.error('Please choose a file first.'); return; }
    addDoc.mutate(
      { document_type: docType, file_path: uploaded.url, expiry_date: expiry || undefined },
      {
        onSuccess: () => { toast.success('Document submitted for verification.'); onClose(); },
        onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not save document.'),
      },
    );
  };

  return (
    <Overlay onClose={onClose}>
      <ModalPanel>
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Upload Document</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>File</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-200 py-6 transition-colors hover:border-emerald-400 dark:border-zinc-700"
            >
              {uploadFile.isPending ? (
                <><Loader2 size={22} className="animate-spin text-emerald-500" /><span className="text-sm text-zinc-500">Uploading…</span></>
              ) : uploaded ? (
                <>
                  <CheckCircle2 size={22} className="text-emerald-500" />
                  <span className="max-w-full truncate px-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">{uploaded.name}</span>
                  <span className="text-xs text-zinc-400">Click again to change</span>
                </>
              ) : (
                <>
                  <UploadCloud size={22} className="text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Click to choose a file</span>
                  <span className="text-xs text-zinc-400">PDF, image, DOC or XLS · max 5 MB</span>
                </>
              )}
            </button>
            <input
              ref={fileRef} type="file" className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </div>

          <div>
            <label className={labelCls}>Expiry date (optional)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls} />
          </div>

          <p className={noteCls}>Uploaded documents stay <b>Pending</b> until HR verifies them.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={onClose} className={ghostBtn}>Cancel</button>
          <button onClick={submit} disabled={addDoc.isPending || uploadFile.isPending} className={primaryBtn}>
            {addDoc.isPending && <Loader2 size={15} className="animate-spin" />} Submit
          </button>
        </div>
      </ModalPanel>
    </Overlay>
  );
}
