// Small display helpers shared by every page.

export function formatMoney(value) {
  const n = Number(value) || 0;
  const text = `₦${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return n < 0 && Math.round(n * 100) !== 0 ? `-${text}` : text;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

// "Oct 3, 2026, 2:15 PM"
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// "Red / M", "Red" or "M"
export function variantLabel(variant) {
  if (!variant) return '';
  return [variant.color, variant.size].filter(Boolean).join(' / ');
}
