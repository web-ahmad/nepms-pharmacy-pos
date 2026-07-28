import { useEffect } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useInvoiceSettings, useInvoiceTemplate } from '@/features/settings/services/settings.api';
import { usePrintReceipt } from '../services/pos.api';
import PrintableReceipt from '@/components/invoice/PrintableReceipt';
import A4Invoice from '@/components/invoice/A4Invoice';

interface InvoicePreviewProps {
  invoice: any;
  onNewSale: () => void;
  /** When true, suppress auto-print (used by cashier terminal after verify-complete) */
  skipPrint?: boolean;
}

export default function InvoicePreview({ invoice, onNewSale, skipPrint = false }: InvoicePreviewProps) {
  const { data: invoiceSettings } = useInvoiceSettings();
  const template = useInvoiceTemplate();
  const isA4 = template.pos_paper === 'a4';
  const printReceiptMutation = usePrintReceipt();

  // Auto-print on every successful checkout/verification.
  useEffect(() => {
    if (invoice && !skipPrint) {
      if (invoiceSettings?.print_mode === 'ESC_POS_RAW') {
        // Trigger backend direct printing
        printReceiptMutation.mutate(invoice, {
          onSettled: () => {
            const timer = setTimeout(() => onNewSale(), 1000);
            return () => clearTimeout(timer);
          }
        });
      } else {
        // Browser print
        const timer = setTimeout(() => {
          window.print();
          // Immediately go to new sale when print dialog closes (or is cancelled)
          onNewSale();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else if (invoice && skipPrint) {
      // If skip print is true, just wait a brief moment to show success, then return to POS
      const timer = setTimeout(() => {
        onNewSale();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [invoice, skipPrint, onNewSale, invoiceSettings]);

  if (!invoice) return null;

  const isPickingSlip = invoice.status === 'Pending Verification';

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-lowest">
      {/* Screen Loading Overlay (Never Printed) */}
      <div className="flex flex-col items-center justify-center no-print">
        {isPickingSlip ? (
          <ClipboardList className="mb-4 h-16 w-16 text-blue-500 animate-pulse" />
        ) : (
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500 animate-bounce" />
        )}
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {isPickingSlip ? 'Order Saved' : 'Sale Completed'}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {skipPrint ? 'Returning to terminal...' : 'Sending to printer...'}
        </p>
      </div>

      {/* Printed document — thermal receipt or A4 invoice per Invoice Template setting */}
      <div className="hidden print:flex items-center justify-center w-full">
        {isA4
          ? <A4Invoice invoice={invoice} type="sale" />
          : <PrintableReceipt invoice={invoice} settings={invoiceSettings} />}
      </div>

      {isA4 && (
        <style>{`@media print { @page { size: A4; margin: 10mm; } }`}</style>
      )}
    </div>
  );
}
