// Plain helpers for the Expenses page and the net profit on the Overview.

export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent' },
  { key: 'salaries', label: 'Salaries and wages' },
  { key: 'transport', label: 'Transport and fuel' },
  { key: 'power', label: 'Electricity and generator' },
  { key: 'internet', label: 'Internet and airtime' },
  { key: 'marketing', label: 'Marketing and ads' },
  { key: 'packaging', label: 'Packaging and supplies' },
  { key: 'repairs', label: 'Repairs and maintenance' },
  { key: 'taxes', label: 'Taxes, fees and licences' },
  { key: 'other', label: 'Other' },
];

export const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'card', label: 'Card / POS' },
  { key: 'other', label: 'Other' },
];

export function categoryLabel(key) {
  const found = EXPENSE_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

export function methodLabel(key) {
  const found = PAY_METHODS.find((m) => m.key === key);
  return found ? found.label : key;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// A date as "2026-10-05" in the person's own time zone (what a date box uses)
export function dayInput(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const PERIODS = [
  { key: 'month', label: 'This month' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

// The first day of a period as "2026-10-01" ('' = everything)
export function periodFromDay(key, now = new Date()) {
  if (key === 'month') return dayInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const days = Number(key);
  if (Number.isFinite(days) && days > 0) return dayInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
  return '';
}

// The ?from=... part of the request for a period ('' = everything)
export function periodQuery(key, now = new Date()) {
  const from = periodFromDay(key, now);
  return from ? `?from=${from}` : '';
}

// What is wrong with the form, or '' when it can be sent
export function expenseProblem({ category, amount, description }) {
  if (!category) return 'Choose what the money was spent on';
  if (amount === '' || !(Number(amount) > 0)) return 'Enter an amount above 0';
  if (category === 'other' && !String(description || '').trim()) return 'Say what this was for';
  return '';
}
