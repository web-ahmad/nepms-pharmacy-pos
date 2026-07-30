'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePurchaseInvoiceDetails, useSupplierDetails, useCreateSupplierPayment } from '@/features/purchase/services/purchase.api';
import { ArrowLeft, Printer, Download, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings, useInvoiceTemplate, resolveAssetUrl } from '@/features/settings/services/settings.api';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const { data: invoice, isLoading } = usePurchaseInvoiceDetails(id);

  // Invoice-template config for the printed document (colour + logo + identity).
  const { data: settings } = useSettings();
  const template = useInvoiceTemplate();
  const company = settings?.company_settings || {};
  const accent = template.header_color || '#2563eb';
  const companyName = company.name || 'NEPMS Pharmacy';
  const companyAddress = [company.address, company.city, company.country].filter(Boolean).join(', ') || 'National Electronic Pharmacy Management System';
  const companyLogo = template.show_logo ? resolveAssetUrl(company.logo_url) : '';
  const onAccent = (() => {
    const h = accent.replace('#', '');
    if (h.length < 6) return '#ffffff';
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#111827' : '#ffffff';
  })();

  const { data: supplier } = useSupplierDetails(invoice?.supplier_id || 'new');
  const paymentMutation = useCreateSupplierPayment();

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-8 text-center text-red-500">Invoice not found.</div>;
  }

  const remaining = invoice.total_amount - invoice.amount_paid;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Paid':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-900/50' };
      case 'Partially Paid':
        return { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-900/50' };
      case 'Unpaid':
        return { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-900/50' };
      default:
        return { icon: Clock, color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-900/20', border: 'border-zinc-200 dark:border-zinc-800' };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invNo = invoice.invoice_number || 'N/A';
    const subtotal = invoice.total_amount - (invoice.tax_amount || 0);
    const cPhone = (company as any).phone;
    const cEmail = (company as any).email;

    // Letterhead — LOGO ONLY on the left (no company name text here; the name
    // is shown below in the details), a prominent "PURCHASE INVOICE" on the right.
    const invHeader = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;">
        <div>
          ${companyLogo
            ? `<img src="${companyLogo}" alt="Logo" style="height:66px;width:auto;max-width:230px;object-fit:contain;" />`
            : `<div style="height:60px;width:60px;border-radius:14px;background:${accent};color:${onAccent};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;">${companyName.charAt(0).toUpperCase()}</div>`}
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block;background:${accent};color:${onAccent};font-size:18px;font-weight:800;letter-spacing:0.12em;padding:10px 22px;border-radius:8px;">PURCHASE INVOICE</div>
          <div style="font-size:12px;color:#64748b;margin-top:8px;font-family:monospace;">No. ${invNo}</div>
        </div>
      </div>
      <div style="height:3px;background:${accent};border-radius:3px;margin:16px 0 26px;"></div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Invoice ${invNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid ${accent}; }
          .header-left { display: flex; align-items: center; gap: 16px; }
          .header-logo { height: 56px; width: auto; max-width: 180px; object-fit: contain; }
          .company-name { font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
          .company-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          .invoice-title { font-size: 32px; font-weight: 800; color: ${accent}; text-align: right; }
          .invoice-number { font-size: 14px; color: #64748b; text-align: right; margin-top: 4px; font-family: monospace; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .meta-box { padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-label { font-size: 11px; font-weight: 700; color: ${accent}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .meta-value { font-size: 15px; font-weight: 600; color: #1e293b; }

          /* Items Table Styles */
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; }
          .items-table th, .items-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #eef2f7; }
          .items-table thead th { background: ${accent}; color: ${onAccent}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: none; }
          .items-table tbody tr:nth-child(even) { background: #f8fafc; }
          .items-table td { font-size: 14px; color: #334155; }
          .font-mono { font-family: monospace; }
          .text-right { text-align: right; }
          
          .amounts-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
          .amount-card { padding: 20px; border-radius: 8px; text-align: center; }
          .amount-card.total { background: #eff6ff; border: 1px solid #bfdbfe; }
          .amount-card.paid { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .amount-card.tax { background: #fefce8; border: 1px solid #fde68a; }
          .amount-card.remaining { background: #fef2f2; border: 1px solid #fecaca; }
          .amount-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .amount-value { font-size: 24px; font-weight: 800; margin-top: 6px; font-family: monospace; }
          .amount-card.total .amount-value { color: #2563eb; }
          .amount-card.paid .amount-value { color: #16a34a; }
          .amount-card.tax .amount-value { color: #ca8a04; }
          .amount-card.remaining .amount-value { color: #dc2626; }
          .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .status-paid { background: #dcfce7; color: #16a34a; }
          .status-unpaid { background: #fef2f2; color: #dc2626; }
          .status-partial { background: #fefce8; color: #ca8a04; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .footer-text { font-size: 11px; color: #94a3b8; }
          .watermark { font-size: 11px; color: #cbd5e1; font-style: italic; }
          @media print {
            body { padding: 16px; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
      <div style="border:2px solid #0f172a;border-radius:14px;padding:32px 34px;">
        ${invHeader}

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Pharmacy</div>
            <div class="meta-value" style="font-size:17px;">${companyName}</div>
            <div style="font-size:13px;color:#64748b;margin-top:6px;">${companyAddress}</div>
            ${cPhone ? `<div style="font-size:13px;color:#64748b;">Phone: ${cPhone}</div>` : ''}
            ${cEmail ? `<div style="font-size:13px;color:#64748b;">Email: ${cEmail}</div>` : ''}
          </div>
          <div class="meta-box">
            <div class="meta-label">Bill From — Supplier</div>
            <div class="meta-value" style="font-size:17px;">${supplier?.name || invoice.supplier_name || invoice.supplier_id || '—'}</div>
            ${supplier?.phone ? `<div style="font-size: 13px; color: #64748b; margin-top: 6px;">Phone: ${supplier.phone}</div>` : ''}
            ${supplier?.email ? `<div style="font-size: 13px; color: #64748b;">Email: ${supplier.email}</div>` : ''}
            ${supplier?.address ? `<div style="font-size: 13px; color: #64748b;">Address: ${supplier.address}</div>` : ''}
          </div>
        </div>

        <div class="meta-box" style="margin-bottom:30px;">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
            <div>
              <div class="meta-label">Invoice Date</div>
              <div class="meta-value">${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}</div>
            </div>
            <div>
              <div class="meta-label">Due Date</div>
              <div class="meta-value">${invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}</div>
            </div>
            <div>
              <div class="meta-label">GRN Reference</div>
              <div class="meta-value" style="font-family: monospace; font-size: 13px;">${invoice.grn_number || invoice.grn_id || '—'}</div>
            </div>
            <div>
              <div class="meta-label">Status</div>
              <span class="status-badge ${invoice.status === 'Paid' ? 'status-paid' : invoice.status === 'Unpaid' ? 'status-unpaid' : 'status-partial'}">${invoice.status}</span>
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Product / Medicine</th>
              <th>Batch Number</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map(item => `
              <tr>
                <td style="font-weight: 600; color:#1e293b;">${item.medicine_name}</td>
                <td class="font-mono" style="font-size: 13px; color:#64748b;">${item.batch_number || '—'}</td>
                <td class="text-right font-mono">${item.quantity}</td>
                <td class="text-right font-mono">Rs ${item.unit_price.toFixed(2)}</td>
                <td class="text-right font-mono" style="font-weight: 700; color:#1e293b;">Rs ${item.total_price.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${(!invoice.items || invoice.items.length === 0) ? `
              <tr>
                <td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No items found.</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;gap:28px;align-items:flex-start;margin-top:4px;">
          <div style="flex:1;max-width:330px;font-size:12px;color:#64748b;line-height:1.6;">
            <div style="font-weight:700;color:#334155;margin-bottom:5px;text-transform:uppercase;font-size:11px;letter-spacing:0.06em;">Notes</div>
            Please verify goods received against the GRN reference before settling payment. This is a system-generated purchase invoice and requires no signature.
          </div>
          <div style="width:300px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;padding:11px 18px;font-size:13.5px;color:#475569;border-bottom:1px solid #eef2f7;"><span>Subtotal</span><span style="font-family:monospace;">Rs ${subtotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:11px 18px;font-size:13.5px;color:#475569;border-bottom:1px solid #eef2f7;"><span>Tax</span><span style="font-family:monospace;">Rs ${invoice.tax_amount.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:12px 18px;font-size:15px;font-weight:800;color:#0f172a;background:#f1f5f9;"><span>Total</span><span style="font-family:monospace;">Rs ${invoice.total_amount.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:11px 18px;font-size:13.5px;color:#15803d;border-bottom:1px solid #eef2f7;"><span>Amount Paid</span><span style="font-family:monospace;font-weight:700;">Rs ${invoice.amount_paid.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:14px 18px;font-size:16px;font-weight:800;background:${accent};color:${onAccent};"><span>Balance Due</span><span style="font-family:monospace;">Rs ${remaining.toFixed(2)}</span></div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</div>
          <div class="watermark">${companyName} — Powered by NEPMS</div>
        </div>
      </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownloadPDF = () => {
    // Use print-to-PDF via the browser's native print dialog with "Save as PDF" destination
    handlePrint();
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0 || payAmount > remaining) {
      alert(`Amount must be between 0.01 and ${remaining.toFixed(2)}`);
      return;
    }
    try {
      await paymentMutation.mutateAsync({
        supplier_id: invoice.supplier_id,
        invoice_id: invoice.id,
        amount: payAmount,
        payment_method: payMethod,
        reference_number: payRef,
        notes: payNotes,
      });
      setShowPayModal(false);
      setPayAmount(0);
      setPayRef('');
      setPayNotes('');
    } catch {
      alert('Failed to record payment.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/purchase/invoices" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Invoice: {invoice.invoice_number || 'N/A'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Supplier: {supplier?.name || invoice.supplier_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download size={16} /> Download PDF
          </button>
          {remaining > 0 && invoice.status !== 'Cancelled' && (
            <button
              onClick={() => { setPayAmount(remaining); setShowPayModal(true); }}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <CreditCard size={16} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusConfig.bg} ${statusConfig.border}`}>
        <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
        <span className={`font-semibold ${statusConfig.color}`}>
          {invoice.status === 'Paid' && 'This invoice has been fully paid.'}
          {invoice.status === 'Partially Paid' && `Partially paid. Balance due: Rs ${remaining.toFixed(2)}`}
          {invoice.status === 'Unpaid' && `Unpaid. Full amount due: Rs ${invoice.total_amount.toFixed(2)}`}
          {invoice.status === 'Draft' && 'This invoice is in draft status.'}
          {invoice.status === 'Cancelled' && 'This invoice has been cancelled.'}
        </span>
      </div>

      {/* Invoice Card */}
      <div ref={printRef} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Invoice Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">NEPMS Pharmacy</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">National Electronic Pharmacy Management System</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">INVOICE</h3>
              <p className="text-sm font-mono text-zinc-500 dark:text-zinc-400 mt-1">{invoice.invoice_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="p-6 grid grid-cols-2 gap-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Supplier</span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">{supplier?.name || invoice.supplier_id}</p>
              {supplier?.phone && <p className="text-xs text-zinc-500">{supplier.phone}</p>}
              {supplier?.email && <p className="text-xs text-zinc-500">{supplier.email}</p>}
              {supplier?.address && <p className="text-xs text-zinc-500">{supplier.address}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Invoice Date</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Due Date</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">GRN Reference</span>
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-1">{invoice.grn_number || invoice.grn_id}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Status</span>
              <p className="mt-1">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    invoice.status === 'Unpaid' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    invoice.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}
                >
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Invoice Items</span>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="p-3 font-semibold rounded-l-lg">Product / Medicine</th>
                  <th className="p-3 font-semibold">Batch Number</th>
                  <th className="p-3 font-semibold text-right">Quantity</th>
                  <th className="p-3 font-semibold text-right">Unit Price</th>
                  <th className="p-3 font-semibold text-right rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {(!invoice.items || invoice.items.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-zinc-500">No items found.</td>
                  </tr>
                ) : (
                  invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{item.medicine_name}</td>
                      <td className="p-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{item.batch_number}</td>
                      <td className="p-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{item.quantity}</td>
                      <td className="p-3 text-right font-mono text-zinc-700 dark:text-zinc-300">Rs {item.unit_price.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">Rs {item.total_price.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Amounts */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-center border border-blue-100 dark:border-blue-900/40">
              <p className="text-xs font-semibold uppercase text-blue-500 dark:text-blue-400 tracking-wider">Total Amount</p>
              <p className="text-2xl font-extrabold font-mono text-blue-700 dark:text-blue-300 mt-2">Rs {invoice.total_amount.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center border border-amber-100 dark:border-amber-900/40">
              <p className="text-xs font-semibold uppercase text-amber-500 dark:text-amber-400 tracking-wider">Tax Amount</p>
              <p className="text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-2">Rs {invoice.tax_amount.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center border border-green-100 dark:border-green-900/40">
              <p className="text-xs font-semibold uppercase text-green-500 dark:text-green-400 tracking-wider">Amount Paid</p>
              <p className="text-2xl font-extrabold font-mono text-green-700 dark:text-green-300 mt-2">Rs {invoice.amount_paid.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-center border border-red-100 dark:border-red-900/40">
              <p className="text-xs font-semibold uppercase text-red-500 dark:text-red-400 tracking-wider">Balance Due</p>
              <p className="text-2xl font-extrabold font-mono text-red-700 dark:text-red-300 mt-2">Rs {remaining.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500">
          <span>Generated on {format(new Date(), 'MMMM dd, yyyy')}</span>
          <span className="italic">NEPMS — Pharmacy Management System</span>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-950 border dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Record Payment</h3>
                <p className="text-sm text-zinc-500 font-mono mt-1">Invoice: {invoice.invoice_number}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center">
                <div className="text-zinc-500 dark:text-zinc-400 mb-1">Total</div>
                <div className="font-mono font-bold">Rs {invoice.total_amount.toFixed(2)}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center">
                <div className="text-zinc-500 dark:text-zinc-400 mb-1">Paid</div>
                <div className="font-mono font-bold text-green-600 dark:text-green-400">Rs {invoice.amount_paid.toFixed(2)}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-900">
                <div className="text-blue-600 dark:text-blue-400 font-medium mb-1">Remaining</div>
                <div className="font-mono font-bold text-blue-700 dark:text-blue-300">Rs {remaining.toFixed(2)}</div>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rs</span>
                  <input type="number" step="0.01" max={remaining} required value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setPayAmount(remaining)} className="text-xs text-blue-600 hover:underline">Full Payment</button>
                  <button type="button" onClick={() => setPayAmount(remaining / 2)} className="text-xs text-blue-600 hover:underline">50%</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Method</label>
                <select required value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Reference Number</label>
                <input type="text" placeholder="e.g., Check #, Transaction ID" value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
                <textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => setShowPayModal(false)}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" disabled={paymentMutation.isPending || payAmount <= 0}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50">
                  {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
