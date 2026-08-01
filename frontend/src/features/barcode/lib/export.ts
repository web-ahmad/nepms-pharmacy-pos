import jsPDF from 'jspdf';

/** Download a single canvas as a PNG. */
export function downloadPNG(canvas: HTMLCanvasElement, filename = 'barcode.png') {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

export interface SheetOptions {
  columns: number;      // labels per row
  gap: number;          // px gap between labels (screen units)
  labelScale: number;   // 0.5–2 display scale
}

/** Open a print window laying the label images out in a responsive grid. */
export function printLabels(canvases: HTMLCanvasElement[], opts: SheetOptions) {
  if (!canvases.length) return;
  const imgs = canvases
    .map((c) => `<div class="label"><img src="${c.toDataURL('image/png')}" /></div>`) // one label per cell
    .join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Barcodes</title>
    <style>
      @media print { @page { margin: 8mm; } }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background: #fff; }
      .sheet { display: grid; grid-template-columns: repeat(${opts.columns}, 1fr); gap: ${opts.gap}px; }
      .label { display: flex; align-items: center; justify-content: center; padding: 4px;
               border: 1px dashed #d4d4d8; border-radius: 6px; break-inside: avoid; }
      .label img { max-width: 100%; height: auto; image-rendering: crisp-edges; }
    </style></head>
    <body><div class="sheet">${imgs}</div>
    <script>window.onload = () => { setTimeout(() => { window.print(); }, 250); };<\/script>
    </body></html>`);
  w.document.close();
}

/** Export the labels to a multi-page A4 PDF grid. */
export function downloadPDF(canvases: HTMLCanvasElement[], opts: SheetOptions, filename = 'barcodes.pdf') {
  if (!canvases.length) return;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const cols = opts.columns;
  const gap = 3;
  const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;

  let x = margin, y = margin, rowH = 0;
  for (const c of canvases) {
    const ratio = c.height / c.width;
    const imgW = cellW;
    const imgH = cellW * ratio;
    if (y + imgH > pageH - margin) {
      pdf.addPage();
      x = margin; y = margin; rowH = 0;
    }
    pdf.addImage(c.toDataURL('image/png'), 'PNG', x, y, imgW, imgH);
    rowH = Math.max(rowH, imgH);
    x += cellW + gap;
    if (x + cellW > pageW - margin + 0.5) {
      x = margin; y += rowH + gap; rowH = 0;
    }
  }
  pdf.save(filename);
}
