// The reasons for changing stock by hand, and what each one does. Keep in step with
// LogBase-backend/controllers/stockAdjustmentController.js (the server is what enforces it).

export const ADJUST_TYPES = [
  { value: 'damaged', label: 'Damaged', sign: -1, hint: 'Broken or spoiled, cannot be sold' },
  { value: 'lost', label: 'Lost', sign: -1, hint: 'Cannot be found' },
  { value: 'expired', label: 'Expired', sign: -1, hint: 'Past its date' },
  { value: 'stolen', label: 'Stolen', sign: -1, hint: 'Taken without payment', noteRequired: true },
  { value: 'found', label: 'Found', sign: 1, hint: 'Units that turned up again' },
  { value: 'count', label: 'Stock count', sign: 0, hint: 'You counted the shelf: enter the real number' },
  { value: 'other', label: 'Other', sign: null, hint: 'Anything else, with a note', noteRequired: true },
];

export function typeInfo(value) {
  return ADJUST_TYPES.find((t) => t.value === value) || ADJUST_TYPES[0];
}

// What the stock will be after the change, or null when the input is not usable yet.
//   current: units in stock now, type, quantity (what was typed), direction ('in' | 'out', for "other")
export function previewStock({ current, type, quantity, direction }) {
  const qty = Number(quantity);
  if (quantity === '' || quantity == null || !Number.isFinite(qty)) return null;
  const info = typeInfo(type);
  if (info.value === 'count') return qty >= 0 ? qty : null;
  if (qty <= 0) return null;
  const sign = info.sign === null ? (direction === 'in' ? 1 : -1) : info.sign;
  return current + sign * qty;
}
