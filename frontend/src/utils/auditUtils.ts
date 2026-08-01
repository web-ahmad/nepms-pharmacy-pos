export const getReferenceLink = (
  ref: string,
  opts?: { source_module?: string | null; source_id?: string | null },
): string | null => {
  if (!ref) return null;

  const mod = opts?.source_module?.toLowerCase();
  const sid = opts?.source_id;

  // Payment rows (e.g. "PAY-INV-407B-0002") point at an underlying invoice —
  // clicking should open THAT invoice, so resolve against the stripped ref.
  const invRef = ref.startsWith('PAY-') ? ref.slice(4) : ref;

  // Prefer the explicit source module when available — the `INV-` prefix is used
  // by BOTH sales and purchase invoices, so the prefix alone is ambiguous.
  if (mod === 'purchase') {
    // The purchase-invoice detail route resolves by BOTH id and invoice_number,
    // so either the source_id (uuid) or the reference works.
    return `/purchase/invoices/${sid || invRef}`;
  }
  if (mod === 'pos' || mod === 'sales' || mod === 'customer payment') {
    return `/sales?invoice=${invRef}`;
  }

  // Fallback: infer from the reference prefix.
  if (invRef.startsWith('PO-'))  return `/purchase/invoices/${invRef}`;
  if (invRef.startsWith('INV-') || invRef.startsWith('POS-')) return `/sales?invoice=${invRef}`;
  if (invRef.startsWith('RET-')) return `/sales?invoice=${invRef}`;
  if (ref.startsWith('EXP-')) return `/accounts/expenses?view_expense=${ref}`;
  if (ref.startsWith('PC-'))  return `/expenses?view_expense=${ref}`;
  return null;
};
