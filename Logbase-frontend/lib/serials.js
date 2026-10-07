// IMEI / serial numbers and warranties: reading what a person typed and describing where a warranty stands.
// The rules mirror the server's (utils/serials.js); the server has the last word.

export const SERIAL_PATTERN = /^[A-Z0-9][A-Z0-9\-_./]{2,39}$/;
export const MAX_WARRANTY_MONTHS = 120;

// Upper case, no spaces. Returns null when it cannot be an IMEI / serial number.
export function normalizeSerial(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const text = String(raw).trim().replace(/\s+/g, '').toUpperCase();
  return SERIAL_PATTERN.test(text) ? text : null;
}

// Numbers can be separated by new lines, commas, semicolons or spaces (a scanner types one per line).
export function splitSerials(text) {
  return String(text || '')
    .split(/[\s,;]+/)
    .filter(Boolean);
}

// Adds typed or pasted numbers to the list. Returns the new list and what could not be added and why.
export function addSerials(current, text) {
  const list = [...current];
  const rejected = [];
  for (const part of splitSerials(text)) {
    const serial = normalizeSerial(part);
    if (!serial) rejected.push({ text: part.slice(0, 45), reason: 'is not a valid IMEI / serial number' });
    else if (list.includes(serial)) rejected.push({ text: serial, reason: 'is already in the list' });
    else list.push(serial);
  }
  return { list, rejected };
}

// "No warranty", "6 months", "1 year", "18 months", "2 years"
export function warrantyLabel(months) {
  const m = Number(months) || 0;
  if (m <= 0) return 'No warranty';
  if (m % 12 === 0) return `${m / 12} year${m === 12 ? '' : 's'}`;
  return `${m} month${m === 1 ? '' : 's'}`;
}

function dateText(value) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Where a warranty stands today: { state: 'none' | 'active' | 'expired', daysLeft, text }
export function warrantyStatus(endsAt, now = new Date()) {
  if (!endsAt) return { state: 'none', daysLeft: 0, text: 'No warranty' };
  const ms = new Date(endsAt).getTime() - new Date(now).getTime();
  if (ms < 0) return { state: 'expired', daysLeft: 0, text: `Warranty ended ${dateText(endsAt)}` };
  const daysLeft = Math.ceil(ms / 86400000);
  return {
    state: 'active',
    daysLeft,
    text: `Under warranty until ${dateText(endsAt)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`,
  };
}

export const SERIAL_STATUS = {
  in_stock: { label: 'In stock', className: 'bg-green-100 text-green-700' },
  sold: { label: 'Sold', className: 'bg-sky-100 text-sky-700' },
  written_off: { label: 'Written off', className: 'bg-gray-200 text-gray-700' },
};

export const EVENT_LABEL = {
  received: 'Received',
  sold: 'Sold',
  returned: 'Returned and back in stock',
  written_off: 'Returned and written off',
};
