// The tailor's words and sums: the measurements a tailor takes, and the totals of an order.

// Every measurement a tailor might take, grouped, for the "add a measurement" buttons. A tailor can also type their own.
export const MEASURE_GROUPS = [
  {
    label: 'Top',
    names: ['Neck', 'Shoulder', 'Chest', 'Bust', 'Under bust', 'Waist', 'Hip', 'Back', 'Top length', 'Sleeve length', 'Round sleeve', 'Wrist', 'Armhole', 'Nipple to nipple', 'Shoulder to bust', 'Blouse length'],
  },
  { label: 'Trouser & skirt', names: ['Trouser length', 'Thigh', 'Knee', 'Base', 'Crotch', 'Skirt length', 'Gown length', 'Wrapper length'] },
  { label: 'Other', names: ['Agbada length', 'Agbada width', 'Head', 'Height'] },
];

export const ALL_MEASURES = MEASURE_GROUPS.flatMap((g) => g.names);

export const UNITS = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimetres' },
];

// "2026-11-05" from a date the server sent (the date as the person typed it, whatever time zone)
export function dayOf(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function unitShort(unit) {
  return unit === 'cm' ? 'cm' : 'in';
}

// "2 × Agbada, Cap"
export function piecesText(pieces) {
  return (pieces || []).map((p) => `${p.quantity > 1 ? `${p.quantity} × ` : ''}${p.style}`).join(', ');
}

export function pieceLine(p) {
  return (Number(p.price) || 0) * (Number(p.quantity) || 1);
}

export function ordersTotal(pieces, discount = 0) {
  const sum = (pieces || []).reduce((s, p) => s + pieceLine(p), 0);
  return Math.max(Math.round((sum - (Number(discount) || 0)) * 100) / 100, 0);
}

// The measurements as a list of rows for a form: the boxes a garment needs, with any value already known
export function rowsFor(names, known = []) {
  const byName = new Map((known || []).map((m) => [m.name.toLowerCase(), m.value]));
  const rows = names.map((name) => ({ name, value: byName.get(name.toLowerCase()) || '' }));
  // measurements that are known but not in the garment's list stay (they were taken for a reason)
  for (const m of known || []) {
    if (!names.some((n) => n.toLowerCase() === m.name.toLowerCase())) rows.push({ name: m.name, value: m.value });
  }
  return rows;
}

// The filled boxes only, ready to send
export function filledRows(rows) {
  return (rows || []).filter((r) => r.name.trim() && String(r.value).trim()).map((r) => ({ name: r.name.trim(), value: String(r.value).trim() }));
}
