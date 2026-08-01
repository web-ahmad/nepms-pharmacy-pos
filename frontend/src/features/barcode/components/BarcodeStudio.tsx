'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Barcode, QrCode, Printer, Download, FileText, Plus, Trash2, Search,
  Settings2, LayoutGrid, Package, X, ClipboardPaste, Wand2, Layers, Copy,
} from 'lucide-react';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import {
  SYMBOLOGIES, symbologyMeta, DEFAULT_OPTIONS, composeLabelCanvas,
  type BarcodeOptions, type Symbology, type LabelData,
} from '../lib/render';
import { printLabels, downloadPDF, downloadPNG, type SheetOptions } from '../lib/export';

// ── Live label preview (async canvas → data URL) ────────────────────────────────
function LabelPreview({ data, options, className }: { data: LabelData; options: BarcodeOptions; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const key = JSON.stringify([data, options]);
  useEffect(() => {
    let alive = true;
    composeLabelCanvas(data, options)
      .then((c) => { if (alive) { setUrl(c.toDataURL('image/png')); setErr(null); } })
      .catch((e) => { if (alive) { setErr(String(e?.message || e)); setUrl(null); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (err) return (
    <div className={`flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 ${className}`}>
      {err.includes('valid') || err.includes('digits') || err.includes('Invalid') ? 'Invalid value for this barcode type' : err}
    </div>
  );
  if (!url) return <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`} style={{ minHeight: 80 }} />;
  return <img src={url} alt="barcode" className={`max-w-full object-contain ${className}`} />;
}

// ── Reusable option controls ────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-700 dark:text-zinc-200">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-indigo-600 dark:bg-zinc-700" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm dark:border-zinc-700">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

interface BulkItem { id: string; value: string; name?: string; price?: string; qty: number; }

export default function BarcodeStudio() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [options, setOptions] = useState<BarcodeOptions>(DEFAULT_OPTIONS);
  const set = (patch: Partial<BarcodeOptions>) => setOptions((o) => ({ ...o, ...patch }));

  // Single
  const [value, setValue] = useState('NEPMS-000123');
  const [name, setName] = useState('Evion 400mg');
  const [price, setPrice] = useState('250');
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [copies, setCopies] = useState(1);

  // Bulk
  const [items, setItems] = useState<BulkItem[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Sheet
  const [sheet, setSheet] = useState<SheetOptions>({ columns: 3, gap: 8, labelScale: 1 });

  // Inventory search (shared)
  const [search, setSearch] = useState('');
  const { data: medData, isLoading: medsLoading } = useMedicines(search, 1, 12);
  const meds = medData?.items ?? [];

  const meta = symbologyMeta(options.format);
  const err = meta.validate(value);
  const isQR = options.format === 'QR';

  const singleData: LabelData = { value, name, price: price ? `Rs ${price}` : '', showName, showPrice };

  // Build canvases for export (expands copies / qty).
  const buildSingle = async () => {
    const c = await composeLabelCanvas(singleData, options);
    return Array.from({ length: Math.max(1, copies) }, () => c);
  };
  const buildBulk = async () => {
    const out: HTMLCanvasElement[] = [];
    for (const it of items) {
      const c = await composeLabelCanvas(
        { value: it.value, name: it.name, price: it.price ? `Rs ${it.price}` : '', showName, showPrice },
        options,
      ).catch(() => null);
      if (c) for (let i = 0; i < Math.max(1, it.qty); i++) out.push(c);
    }
    return out;
  };

  const doExport = async (kind: 'print' | 'pdf') => {
    const canvases = mode === 'single' ? await buildSingle() : await buildBulk();
    if (!canvases.length) return;
    if (kind === 'print') printLabels(canvases, sheet);
    else downloadPDF(canvases, sheet, 'nepms-barcodes.pdf');
  };
  const doPNG = async () => {
    const c = await composeLabelCanvas(singleData, options);
    downloadPNG(c, `${value || 'barcode'}.png`);
  };

  const addMed = (m: any) => {
    const v = m.barcode || m.sku || m.id;
    const p = m.mrp || m.unit_retail_price || m.trade_price || '';
    if (mode === 'single') { setValue(String(v)); setName(m.name); setPrice(p ? String(p) : ''); }
    else {
      setItems((prev) => prev.find((x) => x.value === String(v))
        ? prev.map((x) => x.value === String(v) ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { id: crypto.randomUUID(), value: String(v), name: m.name, price: p ? String(p) : '', qty: 1 }]);
    }
  };

  const parsePaste = () => {
    const rows = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: BulkItem[] = rows.map((r) => {
      const [v, nm, pr] = r.split(',').map((s) => s?.trim());
      return { id: crypto.randomUUID(), value: v, name: nm, price: pr, qty: 1 };
    }).filter((x) => x.value);
    setItems((prev) => [...prev, ...parsed]);
    setPasteText(''); setPasteOpen(false);
  };

  const totalLabels = mode === 'single' ? Math.max(1, copies) : items.reduce((s, i) => s + Math.max(1, i.qty), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Barcode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Barcode Studio</h1>
            <p className="text-sm text-white/85">Generate, customise &amp; print barcodes / QR codes — single or in bulk.</p>
          </div>
        </div>
      </motion.div>

      {/* Mode tabs */}
      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(['single', 'bulk'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? 'text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}>
            {mode === m && <motion.span layoutId="modepill" className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600" />}
            <span className="relative flex items-center gap-2">{m === 'single' ? <Barcode size={16} /> : <Layers size={16} />}{m}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_minmax(320px,380px)]">
        {/* ── Left: content + preview ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {mode === 'single' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Barcode value</span>
                    <div className="flex gap-2">
                      <input value={value} onChange={(e) => setValue(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
                      <button onClick={() => setValue(meta.sample)} title="Insert sample"
                        className="shrink-0 rounded-lg border border-zinc-200 px-3 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"><Wand2 size={16} /></button>
                    </div>
                    <span className={`mt-1 block text-xs ${err ? 'text-red-500' : 'text-zinc-400'}`}>{err || meta.hint}</span>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Product name (label)</span>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Price (Rs)</span>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
                  </label>
                </div>
              </div>
              {/* Inventory picker */}
              <InventoryPicker {...{ search, setSearch, meds, medsLoading, onPick: addMed, mode }} />
            </div>
          ) : (
            <BulkPanel {...{ items, setItems, pasteOpen, setPasteOpen, pasteText, setPasteText, parsePaste,
              search, setSearch, meds, medsLoading, addMed }} />
          )}

          {/* Preview */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100"><LayoutGrid size={16} className="text-indigo-500" /> Live Preview</h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{totalLabels} label{totalLabels !== 1 ? 's' : ''}</span>
            </div>
            {mode === 'single' ? (
              <div className="flex min-h-[140px] items-center justify-center rounded-xl bg-zinc-50 p-6 dark:bg-zinc-800/40">
                <LabelPreview data={singleData} options={options} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[140px] items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-400 dark:bg-zinc-800/40">Add items to preview labels</div>
            ) : (
              <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40" style={{ gridTemplateColumns: `repeat(${sheet.columns}, minmax(0,1fr))` }}>
                {items.map((it) => (
                  <div key={it.id} className="relative flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                    <LabelPreview data={{ value: it.value, name: it.name, price: it.price ? `Rs ${it.price}` : '', showName, showPrice }} options={options} className="max-h-24" />
                    {it.qty > 1 && <span className="absolute right-1 top-1 rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">×{it.qty}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => doExport('print')} disabled={mode === 'single' ? !!err : items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40">
              <Printer size={16} /> Print Sheet
            </button>
            <button onClick={() => doExport('pdf')} disabled={mode === 'single' ? !!err : items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <FileText size={16} /> Download PDF
            </button>
            {mode === 'single' && (
              <button onClick={doPNG} disabled={!!err}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Download size={16} /> PNG
              </button>
            )}
          </div>
        </div>

        {/* ── Right: options ──────────────────────────────────────────────────── */}
        <motion.div layout className="h-fit space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 xl:sticky xl:top-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100"><Settings2 size={16} className="text-indigo-500" /> Options</h3>

          {/* Symbology */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Symbology</span>
            <div className="grid grid-cols-2 gap-1.5">
              {SYMBOLOGIES.map((s) => (
                <button key={s.id} onClick={() => set({ format: s.id })}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    options.format === s.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}>
                  {s.id === 'QR' ? <QrCode size={13} /> : <Barcode size={13} />}{s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {isQR ? (
              <Slider label="QR size" value={options.qrSize} min={80} max={320} suffix="px" onChange={(v) => set({ qrSize: v })} />
            ) : (
              <>
                <Slider label="Bar width" value={options.barWidth} min={1} max={5} step={0.5} onChange={(v) => set({ barWidth: v })} />
                <Slider label="Bar height" value={options.height} min={30} max={160} suffix="px" onChange={(v) => set({ height: v })} />
                <Slider label="Text size" value={options.fontSize} min={8} max={30} suffix="px" onChange={(v) => set({ fontSize: v })} />
              </>
            )}
            <Slider label="Margin" value={options.margin} min={0} max={40} suffix="px" onChange={(v) => set({ margin: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Bars / dots</span>
              <input type="color" value={options.lineColor} onChange={(e) => set({ lineColor: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Background</span>
              <input type="color" value={options.background} onChange={(e) => set({ background: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700" />
            </label>
          </div>

          <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {!isQR && <Toggle label="Show value under bars" checked={options.showValue} onChange={(v) => set({ showValue: v })} />}
            <Toggle label="Show product name" checked={showName} onChange={setShowName} />
            <Toggle label="Show price" checked={showPrice} onChange={setShowPrice} />
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {mode === 'single' ? (
              <Slider label="Copies to print" value={copies} min={1} max={100} onChange={setCopies} />
            ) : (
              <Slider label="Sheet columns" value={sheet.columns} min={1} max={6} onChange={(v) => setSheet((s) => ({ ...s, columns: v }))} />
            )}
            <Slider label="Grid gap" value={sheet.gap} min={0} max={24} suffix="px" onChange={(v) => setSheet((s) => ({ ...s, gap: v }))} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Inventory picker (search + results) ─────────────────────────────────────────
function InventoryPicker({ search, setSearch, meds, medsLoading, onPick }: any) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100"><Package size={16} className="text-indigo-500" /> Pick from inventory</h3>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine, generic, barcode…"
          className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {medsLoading ? <p className="py-4 text-center text-xs text-zinc-400">Loading…</p>
          : meds.length === 0 ? <p className="py-4 text-center text-xs text-zinc-400">No medicines found</p>
          : meds.map((m: any) => (
            <button key={m.id} onClick={() => onPick(m)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-800 dark:hover:bg-indigo-900/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{m.name}</p>
                <p className="truncate text-xs text-zinc-400">{m.generic_name || m.category} · {m.barcode || m.sku || 'no code'}</p>
              </div>
              <Plus size={15} className="shrink-0 text-indigo-500" />
            </button>
          ))}
      </div>
    </div>
  );
}

// ── Bulk panel ──────────────────────────────────────────────────────────────────
function BulkPanel({ items, setItems, pasteOpen, setPasteOpen, pasteText, setPasteText, parsePaste,
  search, setSearch, meds, medsLoading, addMed }: any) {
  const update = (id: string, patch: Partial<BulkItem>) => setItems((prev: BulkItem[]) => prev.map((x) => x.id === id ? { ...x, ...patch } : x));
  const remove = (id: string) => setItems((prev: BulkItem[]) => prev.filter((x) => x.id !== id));
  return (
    <div className="space-y-5">
      <InventoryPicker {...{ search, setSearch, meds, medsLoading, onPick: addMed, mode: 'bulk' }} />

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100"><Layers size={16} className="text-indigo-500" /> Items ({items.length})</h3>
          <div className="flex gap-2">
            <button onClick={() => setPasteOpen((v: boolean) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><ClipboardPaste size={14} /> Paste list</button>
            {items.length > 0 && <button onClick={() => setItems([])} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"><Trash2 size={14} /> Clear</button>}
          </div>
        </div>

        <AnimatePresence>
          {pasteOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">One per line: <span className="font-mono">value, name, price</span></p>
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4}
                  placeholder={"5901234123457, Panadol, 30\nNEPMS-000123, Evion, 250"}
                  className="w-full rounded-lg border border-zinc-200 p-2 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900" />
                <div className="mt-2 flex justify-end"><button onClick={parsePaste} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Add items</button></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No items yet — pick from inventory or paste a list.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((it: BulkItem) => (
              <div key={it.id} className="flex items-center gap-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800">
                <div className="min-w-0 flex-1">
                  <input value={it.name || ''} onChange={(e) => update(it.id, { name: e.target.value })} placeholder="Name"
                    className="w-full truncate bg-transparent text-sm font-medium text-zinc-800 outline-none dark:text-zinc-100" />
                  <input value={it.value} onChange={(e) => update(it.id, { value: e.target.value })}
                    className="w-full truncate bg-transparent font-mono text-xs text-zinc-400 outline-none" />
                </div>
                <input value={it.price || ''} onChange={(e) => update(it.id, { price: e.target.value })} placeholder="Rs" inputMode="decimal"
                  className="w-16 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
                <input type="number" min={1} value={it.qty} onChange={(e) => update(it.id, { qty: Math.max(1, Number(e.target.value)) })}
                  className="w-14 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800" />
                <button onClick={() => remove(it.id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
