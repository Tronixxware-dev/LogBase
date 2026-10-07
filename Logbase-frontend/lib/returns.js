// What happens to the money when units of a sale line are returned. This is the same maths the server
// runs (LogBase-backend/utils/money.js), used here only to show the person what will happen before they confirm.
// The server always does its own calculation; nothing sent from here decides the amounts.

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// line: { quantity, totalAmount, amountPaid, unitPrice } (the line as it is now), qty: units coming back
export function splitReturn(line, qty) {
  const quantity = Number(line.quantity);
  const total = round2(line.totalAmount);
  const paid = round2(line.amountPaid);
  const unitPrice = Number(line.unitPrice);

  const value = qty === quantity ? total : Math.min(round2(qty * unitPrice), total);
  const owed = Math.max(round2(total - paid), 0);
  const owedReduction = Math.min(value, owed);
  const refund = round2(value - owedReduction);
  return { value, owedReduction, refund };
}

// Adds up a whole return. `wanted` is { [saleLineId]: quantity }.
export function previewReturn(lines, wanted) {
  let value = 0;
  let owedReduction = 0;
  let refund = 0;
  let units = 0;
  for (const line of lines) {
    const qty = Number(wanted[line._id]) || 0;
    if (qty <= 0 || qty > line.quantity) continue;
    const part = splitReturn(line, qty);
    value += part.value;
    owedReduction += part.owedReduction;
    refund += part.refund;
    units += qty;
  }
  return { value: round2(value), owedReduction: round2(owedReduction), refund: round2(refund), units };
}

export const RETURN_REASONS = [
  { value: 'defective', label: 'Faulty or damaged' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'changed_mind', label: 'Changed their mind' },
  { value: 'other', label: 'Other reason' },
];

export const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'credit', label: 'Keep as store credit' },
];

export function reasonLabel(value) {
  const found = RETURN_REASONS.find((r) => r.value === value);
  return found ? found.label : 'Other reason';
}

export function refundMethodLabel(value) {
  if (value === 'credit') return 'store credit';
  if (value === 'transfer') return 'bank transfer';
  if (value === 'cash') return 'cash';
  return '';
}
