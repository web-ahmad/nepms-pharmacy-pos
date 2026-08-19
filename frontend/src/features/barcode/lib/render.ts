import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

// ── Supported symbologies ──────────────────────────────────────────────────────
export type Symbology =
  | 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC'
  | 'ITF14' | 'MSI' | 'pharmacode' | 'codabar' | 'QR';

export interface SymbologyMeta {
  id: Symbology;
  label: string;
  hint: string;
  /** Validate a value for this symbology; return an error string or null. */
  validate: (v: string) => string | null;
  /** A sensible sample value. */
  sample: string;
}

const digits = (v: string) => /^\d+$/.test(v);

export const SYMBOLOGIES: SymbologyMeta[] = [
  { id: 'CODE128', label: 'Code 128', hint: 'Any text/number — best all-round', sample: 'Pharvix-000123',
    validate: (v) => (v.length ? null : 'Value required') },
  { id: 'CODE39', label: 'Code 39', hint: 'A–Z, 0–9, - . $ / + %', sample: 'ITEM-001',
    validate: (v) => (/^[0-9A-Z\-. $/+%]*$/.test(v) && v.length ? null : 'Use A–Z, 0–9, - . $ / + %') },
  { id: 'EAN13', label: 'EAN-13', hint: 'Exactly 12 or 13 digits', sample: '5901234123457',
    validate: (v) => (digits(v) && (v.length === 12 || v.length === 13) ? null : 'Needs 12–13 digits') },
  { id: 'EAN8', label: 'EAN-8', hint: 'Exactly 7 or 8 digits', sample: '9638507',
    validate: (v) => (digits(v) && (v.length === 7 || v.length === 8) ? null : 'Needs 7–8 digits') },
  { id: 'UPC', label: 'UPC-A', hint: 'Exactly 11 or 12 digits', sample: '036000291452',
    validate: (v) => (digits(v) && (v.length === 11 || v.length === 12) ? null : 'Needs 11–12 digits') },
  { id: 'ITF14', label: 'ITF-14', hint: 'Exactly 13 or 14 digits', sample: '1540014128876',
    validate: (v) => (digits(v) && (v.length === 13 || v.length === 14) ? null : 'Needs 13–14 digits') },
  { id: 'MSI', label: 'MSI', hint: 'Digits only', sample: '1234567',
    validate: (v) => (digits(v) && v.length ? null : 'Digits only') },
  { id: 'pharmacode', label: 'Pharmacode', hint: 'Number 3–131070', sample: '1234',
    validate: (v) => { const n = Number(v); return digits(v) && n >= 3 && n <= 131070 ? null : 'Number 3–131070'; } },
  { id: 'codabar', label: 'Codabar', hint: 'Digits and - $ : / . +', sample: 'A40156B',
    validate: (v) => (v.length ? null : 'Value required') },
  { id: 'QR', label: 'QR Code', hint: 'Any text, URL, or data', sample: 'https://pharvix.app',
    validate: (v) => (v.length ? null : 'Value required') },
];

export const symbologyMeta = (id: Symbology) => SYMBOLOGIES.find((s) => s.id === id)!;

export interface BarcodeOptions {
  format: Symbology;
  barWidth: number;     // module width (px) — barcodes
  height: number;       // barcode bar height (px)
  margin: number;       // quiet zone (px)
  fontSize: number;     // human-readable text size
  showValue: boolean;   // print the value under the barcode
  lineColor: string;
  background: string;
  qrSize: number;       // QR module render size (px)
}

export const DEFAULT_OPTIONS: BarcodeOptions = {
  format: 'CODE128',
  barWidth: 2,
  height: 70,
  margin: 10,
  fontSize: 16,
  showValue: true,
  lineColor: '#000000',
  background: '#ffffff',
  qrSize: 160,
};

/** Render just the raw barcode/QR to a fresh canvas. Throws on invalid input. */
export async function renderCodeCanvas(value: string, o: BarcodeOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  if (o.format === 'QR') {
    await QRCode.toCanvas(canvas, value || ' ', {
      width: o.qrSize,
      margin: Math.max(1, Math.round(o.margin / 4)),
      color: { dark: o.lineColor, light: o.background },
      errorCorrectionLevel: 'M',
    });
    return canvas;
  }
  JsBarcode(canvas, value, {
    format: o.format,
    width: o.barWidth,
    height: o.height,
    displayValue: o.showValue,
    fontSize: o.fontSize,
    margin: o.margin,
    lineColor: o.lineColor,
    background: o.background,
  });
  return canvas;
}

// ── Label composition (barcode + optional name / price) ─────────────────────────
export interface LabelData {
  value: string;
  name?: string;
  price?: string;
  showName: boolean;
  showPrice: boolean;
}

/**
 * Compose a print-ready label canvas: optional product name on top, the barcode
 * in the middle, optional price at the bottom. Rendered at 2x for crisp output.
 */
export async function composeLabelCanvas(data: LabelData, o: BarcodeOptions): Promise<HTMLCanvasElement> {
  const scale = 2;
  const code = await renderCodeCanvas(data.value, o);

  const padX = 14;
  const padY = 10;
  const nameH = data.showName && data.name ? Math.round(o.fontSize * 1.15) + 6 : 0;
  const priceH = data.showPrice && data.price ? Math.round(o.fontSize * 1.4) + 6 : 0;

  const contentW = Math.max(code.width, 120);
  const width = contentW + padX * 2;
  const height = nameH + code.height + priceH + padY * 2;

  const label = document.createElement('canvas');
  label.width = width * scale;
  label.height = height * scale;
  const ctx = label.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = o.lineColor;

  let y = padY;
  if (nameH) {
    ctx.font = `600 ${Math.round(o.fontSize * 0.9)}px system-ui, sans-serif`;
    const text = (data.name || '').length > 34 ? (data.name || '').slice(0, 33) + '…' : (data.name || '');
    ctx.fillText(text, width / 2, y + Math.round(o.fontSize * 0.9));
    y += nameH;
  }
  ctx.drawImage(code, (width - code.width) / 2, y);
  y += code.height;
  if (priceH) {
    ctx.font = `700 ${Math.round(o.fontSize * 1.1)}px system-ui, sans-serif`;
    ctx.fillText(data.price || '', width / 2, y + Math.round(o.fontSize * 1.1));
  }
  return label;
}
