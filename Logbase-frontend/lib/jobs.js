// Shared by the repair jobs and the laundry register: statuses, payment methods and small helpers.

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export function methodLabel(value) {
  const found = PAYMENT_METHODS.find((m) => m.value === value);
  return found ? found.label : value || '';
}

// Repair jobs go received -> in repair -> ready -> collected.
export const REPAIR_STATUSES = [
  { value: 'received', label: 'Received', tone: 'blue' },
  { value: 'in_repair', label: 'In repair', tone: 'amber' },
  { value: 'ready', label: 'Ready for collection', tone: 'green' },
  { value: 'collected', label: 'Collected', tone: 'gray' },
];

// Laundry orders go received -> being washed -> ready -> collected. An order that is delivered has one more step between
// ready and collected: out for delivery (see lib/laundry.js for the words used for each kind of order).
export const LAUNDRY_STATUSES = [
  { value: 'received', label: 'Received', tone: 'blue' },
  { value: 'processing', label: 'Being washed', tone: 'amber' },
  { value: 'ready', label: 'Ready', tone: 'green' },
  { value: 'out_for_delivery', label: 'Out for delivery', tone: 'blue' },
  { value: 'collected', label: 'Collected / delivered', tone: 'gray' },
];

// Tailor orders go received -> cutting -> sewing -> fitting -> finishing -> ready -> delivered.
export const TAILOR_STATUSES = [
  { value: 'received', label: 'Received', tone: 'blue' },
  { value: 'cutting', label: 'Cutting', tone: 'amber' },
  { value: 'sewing', label: 'Sewing', tone: 'amber' },
  { value: 'fitting', label: 'Fitting', tone: 'teal' },
  { value: 'finishing', label: 'Finishing', tone: 'teal' },
  { value: 'ready', label: 'Ready for pick-up', tone: 'green' },
  { value: 'delivered', label: 'Delivered', tone: 'gray' },
];

export function statusInfo(list, value) {
  return list.find((s) => s.value === value) || { value, label: value || '', tone: 'gray' };
}

// A short word for the status filter buttons
export function shortStatus(list, value) {
  const label = statusInfo(list, value).label;
  return label === 'Ready for collection' || label === 'Ready for pick-up' ? 'Ready' : label === 'Collected / delivered' ? 'Collected' : label === 'Delivery failed' ? 'Failed' : label === 'Out for delivery' ? 'Out' : label;
}

// "2026-10-21" for an <input type="date"> from a date the server sent (or today when none)
export function dayInputValue(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The error text for a failed save. A lost connection is explained, because the server may still have got the request.
export function saveErrorMessage(err, what) {
  if (err && err.offline) {
    return `There is no connection, so we could not confirm that the ${what} was saved. Check the list first. Pressing Save again is safe: it will not be saved twice.`;
  }
  return (err && err.message) || `Could not save the ${what}`;
}
