'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Trash2, Copy, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaAssets, useUploadMedia, useDeleteMedia, type MediaAsset } from '@/features/super-admin/api/useMedia';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function assetUrl(asset: MediaAsset) {
  return `${API_URL}${asset.url}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetCard({ asset, index, onDelete }: { asset: MediaAsset; index: number; onDelete: () => void }) {
  const isImage = (asset.mime_type ?? '').startsWith('image/');

  const handleCopy = () => {
    navigator.clipboard.writeText(assetUrl(asset));
    toast.success('URL copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-xl overflow-hidden"
      style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
    >
      <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--sa-surface-raised)' }}>
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(asset)} alt={asset.original_filename} className="w-full h-full object-cover" />
        ) : (
          <FileText className="w-10 h-10" style={{ color: 'var(--sa-text-faint)' }} />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--sa-text)' }} title={asset.original_filename}>
          {asset.original_filename}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--sa-text-faint)' }}>{formatSize(asset.size_bytes)}</p>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleCopy} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--sa-surface)', color: 'var(--sa-text-muted)', border: '1px solid var(--sa-border)' }} title="Copy URL">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--sa-surface)', color: 'var(--sa-danger)', border: '1px solid var(--sa-border)' }} title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function MediaLibraryPage() {
  const { data: assets, isLoading } = useMediaAssets();
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = (assets ?? []).filter((a) =>
    a.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await uploadMedia.mutateAsync(file);
      } catch (err: any) {
        toast.error(err?.response?.data?.detail ?? `Failed to upload ${file.name}`);
      }
    }
    toast.success('Upload complete');
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!confirm(`Delete "${asset.original_filename}"?`)) return;
    try {
      await deleteMedia.mutateAsync(asset.id);
      toast.success('Asset deleted');
    } catch {
      toast.error('Failed to delete asset');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-5 sa-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>Media Library</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>Global media assets, logos, and promotional images.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="px-3 py-2 rounded-xl text-sm outline-none w-56"
          style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)' }}
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl p-8 mb-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors sa-fade-up"
        style={{
          background: dragOver ? 'var(--sa-accent-muted)' : 'var(--sa-surface)',
          border: `2px dashed ${dragOver ? 'var(--sa-accent)' : 'var(--sa-border-strong)'}`,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploadMedia.isPending ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--sa-accent)' }} />
        ) : (
          <Upload className="w-6 h-6" style={{ color: 'var(--sa-accent)' }} />
        )}
        <p className="text-sm font-medium" style={{ color: 'var(--sa-text)' }}>
          {uploadMedia.isPending ? 'Uploading…' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>Up to 15 MB per file</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sa-skeleton aspect-square" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="text-center sa-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#8b5cf618' }}>
              <ImageIcon className="w-7 h-7" style={{ color: '#8b5cf6' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--sa-text)' }}>
              {assets && assets.length > 0 ? 'No matches' : 'No media yet'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--sa-text-muted)' }}>
              {assets && assets.length > 0 ? 'Try a different search term.' : 'Upload your first file to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <AnimatePresence>
            {filtered.map((asset, i) => (
              <AssetCard key={asset.id} asset={asset} index={i} onDelete={() => handleDelete(asset)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
