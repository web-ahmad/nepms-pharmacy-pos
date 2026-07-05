"use client";

import { useState, useEffect } from 'react';
import { Printer, Save, Loader2, Layout, Sliders, ToggleLeft, FileText, Settings2, Eye } from 'lucide-react';
import { useInvoiceSettings, useUpdateInvoiceSettings } from '../services/settings.api';

export default function InvoiceSettingsForm() {
  const { data, isLoading } = useInvoiceSettings();
  const updateSettings = useUpdateInvoiceSettings();
  
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    show_currency_symbol: true,
    show_received_amount: true,
    show_change_amount: true,
    show_footer_text: true,
    show_logo: true,
    show_adjustments: true,
    show_tax: true,
    show_discount: true,
    show_cashier_name: true,
    show_customer_name: true,
    show_payment_method: true,
    show_drug_license: true,
    footer_text: '',
    urdu_policy_text: '',
    drug_license_number: '368-/NT/9/2015',
    print_mode: 'Browser',
    paper_size: '80mm',
    printer_interface: 'USB',
    printer_ip: '',
    printer_usb_vendor: '',
    printer_usb_product: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        show_currency_symbol: data.show_currency_symbol ?? true,
        show_received_amount: data.show_received_amount ?? true,
        show_change_amount: data.show_change_amount ?? true,
        show_footer_text: data.show_footer_text ?? true,
        show_logo: data.show_logo ?? true,
        show_adjustments: data.show_adjustments ?? true,
        show_tax: data.show_tax ?? true,
        show_discount: data.show_discount ?? true,
        show_cashier_name: data.show_cashier_name ?? true,
        show_customer_name: data.show_customer_name ?? true,
        show_payment_method: data.show_payment_method ?? true,
        show_drug_license: data.show_drug_license ?? true,
        footer_text: data.footer_text || '',
        urdu_policy_text: data.urdu_policy_text || '',
        drug_license_number: data.drug_license_number || '368-/NT/9/2015',
        print_mode: data.print_mode || 'Browser',
        paper_size: data.paper_size || '80mm',
        printer_interface: data.printer_interface || 'USB',
        printer_ip: data.printer_ip || '',
        printer_usb_vendor: data.printer_usb_vendor || '',
        printer_usb_product: data.printer_usb_product || ''
      });
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const visibilityToggles = [
    { name: 'show_currency_symbol', label: 'Currency Symbol', desc: 'Display Rs or $ next to amounts' },
    { name: 'show_received_amount', label: 'Received Amount', desc: 'Show customer payment amount' },
    { name: 'show_change_amount', label: 'Change Amount', desc: 'Show change returned to customer' },
    { name: 'show_adjustments', label: 'Adjustments', desc: 'Show bill rounding or adjustments' },
    { name: 'show_tax', label: 'Tax Amount', desc: 'Display calculated tax totals' },
    { name: 'show_discount', label: 'Discounts', desc: 'Display line-item and total discounts' },
    { name: 'show_cashier_name', label: 'Sale Person', desc: 'Show operator handling the checkout' },
    { name: 'show_customer_name', label: 'Customer Info', desc: 'Display registered customer name' },
    { name: 'show_payment_method', label: 'Payment Method', desc: 'Show payment method (Cash, Card, etc.)' },
    { name: 'show_drug_license', label: 'Drug License', desc: 'Show Pharmacy Drug License Number' },
    { name: 'show_footer_text', label: 'Footer Text', desc: 'Show bottom policy text' },
    { name: 'show_logo', label: 'Pharmacy Logo', desc: 'Display business logo at top' },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Printer size={22} className="text-indigo-600 dark:text-indigo-400" />
            Receipt & Printer Settings
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your hardware layout, ESC/POS printing, and invoice visibility toggles globally.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all shadow-md ${
            saved ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
          } disabled:opacity-50`}
        >
          {updateSettings.isPending ? <Loader2 size={18} className="animate-spin" /> : saved ? <Eye size={18} className="opacity-0 w-0 h-0" /> : <Save size={18} />}
          {saved ? 'Saved Successfully' : 'Save Configuration'}
        </button>
      </div>

      <div className="p-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
        
        {/* LEFT COLUMN: Hardware Config & Text Elements */}
        <div className="flex-[1.5] p-6 space-y-8 bg-white dark:bg-zinc-950">
          
          {/* Section: Hardware Settings */}
          <section>
            <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
              <Settings2 size={16} className="text-zinc-400" />
              Print Mode & Hardware
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Print Mode</label>
                <select
                  name="print_mode"
                  value={formData.print_mode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 transition-colors"
                >
                  <option value="Browser">Browser Print Dialog</option>
                  <option value="ESC_POS_RAW">Direct ESC/POS Raw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Paper Size</label>
                <select
                  name="paper_size"
                  value={formData.paper_size}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 transition-colors"
                >
                  <option value="58mm">58mm Receipt</option>
                  <option value="80mm">80mm Receipt</option>
                </select>
              </div>
            </div>

            {formData.print_mode === 'ESC_POS_RAW' && (
              <div className="border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-900/10 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">Printer Interface</label>
                  <select
                    name="printer_interface"
                    value={formData.printer_interface}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-indigo-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="USB">USB (Local Terminal)</option>
                    <option value="Network_IP">Network / Ethernet / Wi-Fi (IP Address)</option>
                  </select>
                </div>

                {formData.printer_interface === 'Network_IP' ? (
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">Network IP Address</label>
                    <input
                      type="text"
                      name="printer_ip"
                      placeholder="e.g. 192.168.1.100"
                      value={formData.printer_ip}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-indigo-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">USB Vendor ID</label>
                      <input
                        type="text"
                        name="printer_usb_vendor"
                        placeholder="e.g. 0x04b8"
                        value={formData.printer_usb_vendor}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-indigo-800 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">USB Product ID</label>
                      <input
                        type="text"
                        name="printer_usb_product"
                        placeholder="e.g. 0x0202"
                        value={formData.printer_usb_product}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-indigo-800 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section: Text Customizations */}
          <section>
            <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
              <FileText size={16} className="text-zinc-400" />
              Receipt Content
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Footer Message (English)</label>
                <input
                  type="text"
                  name="footer_text"
                  value={formData.footer_text}
                  onChange={handleChange}
                  placeholder="e.g. Thank you for your business!"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Drug License Number</label>
                <input
                  type="text"
                  name="drug_license_number"
                  value={formData.drug_license_number || ''}
                  onChange={handleChange}
                  placeholder="e.g. 368-/NT/9/2015"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 flex justify-between">
                  <span>Return Policy Text (Urdu/Arabic Supported)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">Auto-Reshaped for Print</span>
                </label>
                <textarea
                  name="urdu_policy_text"
                  value={formData.urdu_policy_text}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 text-right leading-relaxed font-sans"
                  dir="rtl"
                />
              </div>
            </div>
          </section>

        </div>

        {/* MIDDLE COLUMN: Visibility Toggles */}
        <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-900/30">
          <section className="h-full flex flex-col">
            <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/50">
              <Eye size={16} className="text-zinc-400" />
              Visibility Layout Rules
            </h4>
            <p className="text-xs text-zinc-500 mb-6">
              Turn off elements that you do not want rendered on the final thermal printout.
            </p>

            <div className="flex-1 space-y-4">
              {visibilityToggles.map(toggle => (
                <label key={toggle.name} className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      name={toggle.name}
                      checked={!!(formData as any)[toggle.name]}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-indigo-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 dark:bg-zinc-800"></div>
                    <div className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-full border border-zinc-200 peer-checked:border-transparent dark:border-zinc-700 shadow-sm"></div>
                  </div>
                  <div className="flex flex-col -mt-0.5">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {toggle.label}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {toggle.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Live Receipt Preview */}
        <div className="flex-1 p-6 bg-zinc-100 dark:bg-zinc-900 hidden lg:flex flex-col items-center border-l border-zinc-200 dark:border-zinc-800">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 pb-2 w-full border-b border-zinc-300 dark:border-zinc-700/50">
            <Eye size={16} className="text-zinc-400" />
            Live Preview
          </h4>
          <div className="flex-1 w-full flex items-start justify-center overflow-y-auto">
            <LiveReceiptPreview formData={formData} />
          </div>
        </div>

      </div>
    </div>
  );
}

function LiveReceiptPreview({ formData }: { formData: any }) {
  // Dummy invoice data for preview purposes
  const dummyInvoice = {
    invoice_number: "INV-A1B2C3",
    sale_date: new Date().toISOString(),
    cashier_name: "JOHN DOE",
    customer_id: "CUST-123",
    payment_method: "Cash",
    items: [
      { medicine_name: "Panadol 500mg", quantity: 2, unit_price: 150.00, total: 300.00 },
      { medicine_name: "Brufen Syrup", quantity: 1, unit_price: 220.00, total: 220.00 }
    ],
    subtotal: 520.00,
    discount_amount: 20.00,
    adjustment_amount: -5.00,
    tax_amount: 15.00,
    total_amount: 510.00,
    amount_paid: 550.00,
    change_due: 40.00
  };

  return (
    <div className={`${formData.paper_size === '58mm' ? 'w-[58mm] min-w-[58mm] max-w-[58mm]' : 'w-[80mm] min-w-[80mm] max-w-[80mm]'} bg-white text-zinc-900 p-4 border border-zinc-300 shadow-md font-mono text-[11px] leading-relaxed dark:bg-white dark:text-zinc-900 scale-90 transform-origin-top transition-all duration-300`}>
      
      {/* Header */}
      <div className="text-center space-y-1 mb-4">
        {formData.show_logo !== false && (
          <h3 className="text-sm font-bold tracking-wide uppercase">NEPMS PHARMACY</h3>
        )}
        <p className="text-[10px] text-zinc-600">Plot 12-C, Commercial Area, Sector G-10</p>
        <p className="text-[10px] text-zinc-600">Ph: +92-51-1234567</p>
        {formData.show_drug_license !== false && formData.drug_license_number && (
          <p className="text-[10px] text-zinc-600">Drug Lic #: {formData.drug_license_number}</p>
        )}
        <div className="border-b border-dashed border-zinc-300 my-2"></div>
      </div>

      {/* Meta Details */}
      <div className="space-y-1 text-[10px] mb-3 transition-all duration-300">
        <div className="flex justify-between">
          <span>Invoice #:</span>
          <span className="font-bold">{dummyInvoice.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span>Date/Time:</span>
          <span>{new Date(dummyInvoice.sale_date).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        {formData.show_cashier_name !== false && (
          <div className="flex justify-between text-indigo-700 bg-indigo-50/50 -mx-1 px-1 rounded animate-in fade-in">
            <span>Sale Person:</span>
            <span>{dummyInvoice.cashier_name}</span>
          </div>
        )}
        {formData.show_customer_name !== false && dummyInvoice.customer_id && (
          <div className="flex justify-between text-indigo-700 bg-indigo-50/50 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Customer:</span>
            <span>Registered Account</span>
          </div>
        )}
        <div className="border-b border-dashed border-zinc-300 my-2"></div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left mb-3">
        <thead>
          <tr className="border-b border-dashed border-zinc-300 text-[10px] font-bold">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-center">Qty</th>
            <th className="pb-1 text-right">Price</th>
            <th className="pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-zinc-150">
          {dummyInvoice.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1 max-w-[28mm] truncate pr-1">{item.medicine_name}</td>
              <td className="py-1 text-center font-mono font-bold text-xs">{item.quantity}</td>
              <td className="py-1 text-right font-mono">
                {formData.show_currency_symbol !== false ? 'Rs ' : ''}{item.unit_price.toFixed(2)}
              </td>
              <td className="py-1 text-right font-mono">
                {formData.show_currency_symbol !== false ? 'Rs ' : ''}{item.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-b border-dashed border-zinc-300 mb-3"></div>

      {/* Financial Summary */}
      <div className="space-y-1 text-right mb-3 transition-all duration-300">
        <div className="flex justify-between text-[10px]">
          <span>Subtotal:</span>
          <span className="font-mono">
            {formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.subtotal.toFixed(2)}
          </span>
        </div>
        {formData.show_discount !== false && dummyInvoice.discount_amount > 0 && (
          <div className="flex justify-between text-[10px] text-green-700 bg-green-50/50 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Discount:</span>
            <span className="font-mono">
              -{formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.discount_amount.toFixed(2)}
            </span>
          </div>
        )}
        {formData.show_adjustments !== false && dummyInvoice.adjustment_amount !== 0 && (
          <div className="flex justify-between text-[10px] text-orange-700 bg-orange-50/50 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Adjustment:</span>
            <span className="font-mono">
              {dummyInvoice.adjustment_amount > 0 ? '+' : ''}{formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.adjustment_amount.toFixed(2)}
            </span>
          </div>
        )}
        {formData.show_tax !== false && dummyInvoice.tax_amount > 0 && (
          <div className="flex justify-between text-[10px] bg-blue-50/50 text-blue-700 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Tax:</span>
            <span className="font-mono">
              {formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.tax_amount.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold border-t border-dashed border-zinc-200 pt-1 mt-1">
          <span>Grand Total:</span>
          <span className="font-mono">
            {formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.total_amount.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="border-b border-dashed border-zinc-300 mb-3"></div>

      {/* Payment Details */}
      <div className="space-y-1 text-[10px] mb-4 transition-all duration-300">
        {formData.show_payment_method !== false && (
          <div className="flex justify-between text-indigo-700 bg-indigo-50/50 -mx-1 px-1 rounded animate-in fade-in">
            <span>Payment Method:</span>
            <span>{dummyInvoice.payment_method}</span>
          </div>
        )}
        {formData.show_received_amount !== false && (
          <div className="flex justify-between bg-zinc-100 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Amount Received:</span>
            <span className="font-mono">
              {formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.amount_paid.toFixed(2)}
            </span>
          </div>
        )}
        {formData.show_change_amount !== false && (
          <div className="flex justify-between text-blue-800 font-bold bg-blue-50 -mx-1 px-1 rounded animate-in fade-in mt-1">
            <span>Change Returned:</span>
            <span className="font-mono">
              {formData.show_currency_symbol !== false ? 'Rs ' : ''}{dummyInvoice.change_due.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      {formData.show_footer_text !== false && (
        <div className="text-center space-y-1 text-[9px] text-zinc-600 border-t border-dashed border-zinc-200 pt-3 animate-in fade-in">
          <p className="font-semibold">{formData.footer_text || 'Thank you for your visit!'}</p>
          <p>Software Powered by NEPMS</p>
        </div>
      )}
    </div>
  );
}
