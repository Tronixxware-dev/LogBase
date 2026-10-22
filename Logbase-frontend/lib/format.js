// Small display helpers shared by every page.

export function formatMoney(value) {
  const n = Number(value) || 0;
  const text = `₦${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return n < 0 && Math.round(n * 100) !== 0 ? `-${text}` : text;
}

// Dates and times are shown the Nigerian way: day first, month spelled out, so "11 Oct 2026" can never be read as 10 November.
export const DISPLAY_LOCALE = 'en-NG';

// "11 Oct 2026"
export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(DISPLAY_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

// "11 Oct 2026, 2:15 PM"
export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${formatDate(d)}, ${formatTime(d)}`;
}

// "2:15 PM"
export function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(DISPLAY_LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])m$/i, (m, x) => ` ${x.toUpperCase()}M`);
}

// "Sunday, 11 October 2026"
export function formatLongDate(value) {
  return new Date(value).toLocaleDateString(DISPLAY_LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// The greeting and a matching emoji for the hour of the day on this device (after 10 PM and before 5 AM it says "Working late").
export function greetingFor(value = new Date()) {
  const hour = new Date(value).getHours();
  if (hour >= 5 && hour < 8) return { text: 'Good morning', emoji: '🌅' };
  if (hour >= 8 && hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour >= 12 && hour < 16) return { text: 'Good afternoon', emoji: '🌤️' };
  if (hour >= 16 && hour < 19) return { text: 'Good evening', emoji: '🌇' };
  if (hour >= 19 && hour < 22) return { text: 'Good evening', emoji: '🌙' };
  return { text: 'Working late', emoji: '🌃' };
}

// "Red / M", "Red" or "M"
export function variantLabel(variant) {
  if (!variant) return '';
  return [variant.color, variant.size].filter(Boolean).join(' / ');
}

// "just now", "5 min ago", "3 h ago", "yesterday", then the date
export function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}
