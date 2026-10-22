// Words and colours for approval requests

export const KIND_LABELS = { sale: 'Sale', return: 'Return', stockAdjustment: 'Stock change' };

export const STATUS_LABELS = {
  pending: 'Waiting',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Taken back',
  failed: 'Could not be done',
};

// tone names understood by <Badge tone=...> in components/ui.js (checked there)
export const STATUS_TONES = { pending: 'amber', approved: 'green', declined: 'red', cancelled: 'gray', failed: 'red' };

export function resultHref(approval) {
  if (approval.status !== 'approved' || !approval.resultId) return '';
  if (approval.resultType === 'Sale') return `/dashboard/sales/${approval.resultId}`;
  if (approval.resultType === 'SaleReturn') return '/dashboard/returns';
  if (approval.resultType === 'StockAdjustment') return '/dashboard/stock-activities';
  return '';
}

// After a sale, return or stock change is sent: was it held for approval?
export function wasHeld(data) {
  return Boolean(data && data.approvalRequired);
}
