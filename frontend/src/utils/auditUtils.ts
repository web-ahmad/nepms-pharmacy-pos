export const getReferenceLink = (ref: string): string | null => {
  if (!ref) return null;
  if (ref.startsWith('INV-') || ref.startsWith('POS-')) return `/sales?invoice=${ref}`;
  if (ref.startsWith('RET-')) return `/sales?invoice=${ref}`;
  if (ref.startsWith('PO-'))  return `/purchase/invoices/${ref}`;
  if (ref.startsWith('EXP-')) return `/accounts/expenses?view_expense=${ref}`;
  if (ref.startsWith('PC-'))  return `/expenses?view_expense=${ref}`;
  return null;
};
