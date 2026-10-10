'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, cardClass, secondaryButtonClass } from '@/components/ui';
import { compactMoney } from '@/components/charts';

// Small pieces shared by the admin pages.

// Loads something from the server when the page opens (and again when `deps` change).
// reload() fetches again without blanking the page.
export function useLoad(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const reload = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setError('');
      try {
        setData(await run());
      } catch (err) {
        setError(err.message || 'Could not load this');
      } finally {
        setLoading(false);
      }
    },
    [run]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

export function StatCard({ label, value, sub, tone = 'gray' }) {
  const ring = { gray: '', red: 'ring-1 ring-red-200', amber: 'ring-1 ring-amber-200', green: '', teal: '' }[tone] || '';
  return (
    <div className={`${cardClass} p-4 sm:p-5 ${ring}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.7rem]">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`${cardClass} p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATE_VIEW = {
  active: { tone: 'green', label: 'Paid' },
  trialing: { tone: 'teal', label: 'On trial' },
  trial_ended: { tone: 'gray', label: 'Trial ended' },
  expired: { tone: 'amber', label: 'Plan expired' },
  suspended: { tone: 'red', label: 'Suspended' },
};

export function StateBadge({ state }) {
  const view = STATE_VIEW[state] || { tone: 'gray', label: state };
  return <Badge tone={view.tone}>{view.label}</Badge>;
}

export const STATE_OPTIONS = [
  { value: '', label: 'Every business' },
  { value: 'active', label: 'Paid' },
  { value: 'trialing', label: 'On trial' },
  { value: 'trial_ended', label: 'Trial ended' },
  { value: 'expired', label: 'Plan expired' },
  { value: 'suspended', label: 'Suspended' },
];

export function PaymentBadge({ status }) {
  const tones = { success: 'green', pending: 'amber', failed: 'red', flagged: 'red' };
  return <Badge tone={tones[status] || 'gray'}>{status}</Badge>;
}

export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
      <button type="button" className={secondaryButtonClass} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page <span className="tabular font-medium text-gray-900">{page}</span> of <span className="tabular">{pages}</span>
      </span>
      <button type="button" className={secondaryButtonClass} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

// "3 days left" / "ended 2 days ago" for a plan or trial
export function endsText(row) {
  if (!row || !row.endsAt) return '';
  if (row.daysLeft > 0) return `${row.daysLeft} day${row.daysLeft === 1 ? '' : 's'} left`;
  return 'ends today';
}

export function timeAgo(value) {
  if (!value) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// A row of upright bars, one per day or month. valueKey is the number to draw, labelKey the name under the first and last bar.
export function ColumnChart({ data, valueKey, labelKey, format, color = '#0d9488', height = 140, labelFormat }) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const fmt = format || ((n) => String(n));
  const lab = labelFormat || ((x) => x);
  const first = data[0] && lab(data[0][labelKey]);
  const last = data[data.length - 1] && lab(data[data.length - 1][labelKey]);

  return (
    <div>
      <div className="flex items-end gap-px sm:gap-0.5" style={{ height }} role="img" aria-label="Bar chart">
        {data.map((d, i) => (
          <div key={`${d[labelKey]}-${i}`} className="group relative flex h-full flex-1 items-end" title={`${lab(d[labelKey])}: ${fmt(values[i])}`}>
            <div
              className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
              style={{ height: `${values[i] === 0 ? 2 : Math.max(4, (values[i] / max) * 100)}%`, background: color, opacity: values[i] === 0 ? 0.2 : 1 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

export { compactMoney };
