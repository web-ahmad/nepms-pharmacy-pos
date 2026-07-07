/**
 * Shared HR export utilities — Print/PDF and CSV
 */

// ── Print / PDF ──────────────────────────────────────────────────────────────
export function printHRReport(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 12px; color: #111; background: #fff; }
    .print-header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .print-header h1 { font-size: 20px; font-weight: 700; color: #059669; }
    .print-header p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .print-header .company { font-size: 11px; color: #374151; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f0fdf4; color: #065f46; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d1fae5; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 11px; }
    tfoot td { font-weight: 700; background: #f0fdf4; border-top: 2px solid #059669; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .badge-green  { background: #d1fae5; color: #065f46; }
    .badge-gray   { background: #f3f4f6; color: #374151; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-orange { background: #fff7ed; color: #9a3412; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { border: 1px solid #d1fae5; border-radius: 8px; padding: 10px 14px; background: #f0fdf4; }
    .summary-card .label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #059669; }
    .summary-card .value { font-size: 18px; font-weight: 700; color: #065f46; margin-top: 4px; font-family: monospace; }
    @media print {
      @page { size: A4 landscape; margin: 12mm 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html><html><head>
      <title>${title} — NEPMS HR</title>
      <style>${styles}</style>
    </head><body>
      <div class="print-header">
        <div>
          <h1>${title}</h1>
          <p>Generated: ${new Date().toLocaleString('en-PK')}</p>
        </div>
        <div class="company">NEPMS Pharmacy · HR &amp; Payroll Centre</div>
      </div>
      ${el.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.onload = () => win.print();
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
