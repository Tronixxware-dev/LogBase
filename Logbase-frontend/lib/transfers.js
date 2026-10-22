// Words and colours for stock transfers, shared by the list and the detail page.

export const TRANSFER_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
};

export const transferNumber = (t) => `T-${String(t.number || 0).padStart(4, '0')}`;

// "Phone X (Black) × 2" for one line of a transfer
export function lineText(line) {
  const name = line.productName || 'Product';
  return `${name}${line.variantLabel ? ` (${line.variantLabel})` : ''} × ${line.quantity}`;
}

export const totalUnits = (t) => (t.lines || []).reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
