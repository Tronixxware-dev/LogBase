// Small shared UI building blocks. No hooks in here, so these work anywhere.

import Link from 'next/link';
import { Icon } from '@/components/Icons';

/* Class names reused across forms and buttons */
export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 hover:border-gray-400 focus:outline-none';

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] disabled:opacity-50';

export const cardClass = 'rounded-2xl border border-gray-200 bg-white shadow-sm';

/* A primary-coloured link that looks like a button (e.g. "+ Add product") */
export function PrimaryLink({ href, children }) {
  return (
    <Link href={href} className={primaryButtonClass}>
      {children}
    </Link>
  );
}

/* A quieter link that looks like a button */
export function SecondaryLink({ href, children }) {
  return (
    <Link href={href} className={secondaryButtonClass}>
      {children}
    </Link>
  );
}

/* Label + input wrapper used in forms */
export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="animate-pop-in mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* Grey bars that shimmer while a page loads. The words stay for screen readers. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div role="status" className="space-y-3 py-2">
      <span className="sr-only">{label}</span>
      <div className={`${cardClass} p-5`}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-5/6" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
      <div className={`${cardClass} p-5`}>
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
    </div>
  );
}

// "Total: 12 sales" shown above a list. `count` is how many rows the list has right now.
export function ListTotal({ count, noun, plural, className = 'mb-3' }) {
  const word = count === 1 ? noun : plural || `${noun}s`;
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      Total: <span className="font-semibold tabular text-gray-900">{Number(count).toLocaleString()}</span> {word}
    </p>
  );
}

export function EmptyState({ message, actionHref, actionLabel, icon = 'inbox' }) {
  return (
    <div className={`${cardClass} animate-fade-up flex flex-col items-center px-6 py-14 text-center`}>
      <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" aria-hidden="true" />
        <Icon name={icon} className="relative h-7 w-7" strokeWidth={1.5} />
      </span>
      <p className="max-w-xs text-gray-500">{message}</p>
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
        >
          {actionLabel}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* A small coloured pill with a dot. tone: green | amber | red | gray | teal | blue */
const TONES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  teal: 'bg-teal-100 text-teal-700',
  blue: 'bg-blue-50 text-blue-800',
};

export function Badge({ tone = 'gray', children, dot = true }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone] || TONES.gray}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* paid / partial / credit pill used on sales */
export function StatusBadge({ status }) {
  const tones = { paid: 'green', partial: 'amber', credit: 'red', returned: 'gray' };
  return <Badge tone={tones[status] || 'gray'}>{status}</Badge>;
}
