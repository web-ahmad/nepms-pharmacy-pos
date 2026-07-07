/**
 * Shared printing/PDF utility for accounting reports.
 * Uses the browser's native print dialog — works perfectly for PDF export too.
 */
export function printReport(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 12px; color: #111; background: #fff; }
    .print-header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
    .print-header h1 { font-size: 20px; font-weight: 700; color: #059669; }
    .print-header p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f0fdf4; color: #065f46; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d1fae5; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tfoot td { font-weight: 700; background: #f0fdf4; border-top: 2px solid #059669; }
    .text-right { text-align: right; }
    .mono { font-family: monospace; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-gray  { background: #f3f4f6; color: #374151; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #059669; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; margin: 16px 0 8px; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid #d1fae5; padding-top: 6px; margin-top: 6px; }
    .net-banner { margin-top: 20px; background: #d1fae5; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .net-banner .label { font-weight: 700; color: #065f46; font-size: 13px; }
    .net-banner .amount { font-weight: 800; font-size: 16px; color: #059669; font-family: monospace; }
    .net-banner.loss { background: #fee2e2; }
    .net-banner.loss .label { color: #991b1b; }
    .net-banner.loss .amount { color: #ef4444; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .card { border: 1px solid #d1fae5; border-radius: 8px; overflow: hidden; }
    .card-header { background: #f0fdf4; padding: 8px 12px; font-weight: 700; color: #065f46; border-bottom: 1px solid #d1fae5; }
    .card-body { padding: 12px; }
    .card-footer { background: #f0fdf4; padding: 8px 12px; border-top: 2px solid #059669; display: flex; justify-content: space-between; font-weight: 700; }
    .warn { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; color: #991b1b; font-size: 11px; margin-bottom: 12px; }
    @media print {
      @page { size: A4; margin: 14mm 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} — NEPMS</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="print-header">
        <h1>${title}</h1>
        <p>Generated on ${new Date().toLocaleString('en-PK')} &nbsp;|&nbsp; NEPMS Pharmacy Management System</p>
      </div>
      ${el.innerHTML}
    </body>
    </html>
  `);
  win.document.close();
  win.onload = () => { win.print(); };
}
