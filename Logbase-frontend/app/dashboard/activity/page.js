'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { listActivity } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { PersonChip } from '@/components/Avatar';
import { ErrorBanner, LoadingState, EmptyState, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const CATEGORIES = [
  { key: '', label: 'Everything' },
  { key: 'sale', label: 'Sales' },
  { key: 'return', label: 'Returns' },
  { key: 'stock', label: 'Stock adjustments' },
  { key: 'product', label: 'Products' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'customer', label: 'Customers' },
  { key: 'payment', label: 'Payments' },
  { key: 'expense', label: 'Expenses' },
  { key: 'staff', label: 'Staff and roles' },
];

const TAG_STYLE = {
  sale: 'bg-orange-50 text-orange-700',
  return: 'bg-sky-50 text-sky-700',
  stock: 'bg-violet-50 text-violet-700',
  product: 'bg-gray-100 text-gray-700',
  purchase: 'bg-teal-50 text-teal-700',
  customer: 'bg-amber-50 text-amber-700',
  payment: 'bg-green-50 text-green-700',
  expense: 'bg-yellow-50 text-yellow-800',
  staff: 'bg-rose-50 text-rose-700',
};

function categoryOf(action) {
  return String(action || '').split('.')[0];
}

function categoryLabel(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

// "Today", "Yesterday" or the date
function dayLabel(value) {
  const d = new Date(value);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function timeLabel(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Who did what, newest first. Administrator only.
export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // the search text actually used (waits for the person to stop typing)
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false); // the plan does not include the activity log
  const latest = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const build = useCallback(
    (before) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (query) params.set('search', query);
      if (before) params.set('before', before);
      const text = params.toString();
      return text ? `?${text}` : '';
    },
    [category, query]
  );

  // first page again whenever the filter or the search changes
  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    setError('');
    listActivity(build())
      .then((data) => {
        if (ticket !== latest.current) return; // an older answer arrived late
        setItems(data.items || []);
        setNextBefore(data.nextBefore || null);
      })
      .catch((err) => {
        if (ticket !== latest.current) return;
        if (err.status === 402) setLocked(true);
        else setError(err.message);
      })
      .finally(() => ticket === latest.current && setLoading(false));
  }, [build]);

  async function loadMore() {
    const ticket = latest.current;
    setLoadingMore(true);
    try {
      const data = await listActivity(build(nextBefore));
      if (ticket !== latest.current) return;
      setItems((prev) => [...prev, ...(data.items || [])]);
      setNextBefore(data.nextBefore || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  // group by day, keeping the order
  const days = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(item);
    else days.push({ label, items: [item] });
  }

  // The plan does not include the activity log: say so and point to the plans instead of showing an error
  if (locked) {
    return (
      <>
        <PageHeader title="Activity" subtitle="Who did what in your business, newest first. Only you can see this page." />
        <div className={`${cardClass} p-8 text-center`}>
          <h2 className="text-base font-semibold text-gray-900">The activity log is part of the Business plan</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            See who sold, returned, adjusted or changed what, and when. Everything is already being recorded, so you can read the history as soon as you upgrade.
          </p>
          <Link href="/dashboard/billing" className={`${primaryButtonClass} mt-5`}>
            See plans
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Who did what in your business, newest first. Only you can see this page."
      />

      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputClass} sm:max-w-[14rem]`}
          aria-label="Type of activity"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search, e.g. a customer or product"
          className={`${inputClass} sm:max-w-xs`}
          aria-label="Search activity"
        />
      </div>

      {loading ? (
        <LoadingState label="Loading activity…" />
      ) : items.length === 0 ? (
        <EmptyState message={category || query ? 'Nothing matches. Try another type or search.' : 'Nothing has been recorded yet.'} />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{day.label}</h2>
              <ul className={`${cardClass} divide-y divide-gray-100`}>
                {day.items.map((item) => {
                  const key = categoryOf(item.action);
                  return (
                    <li key={item._id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">{item.summary}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <PersonChip name={item.userName} />
                          {item.userRole && <span className="text-gray-400">{item.userRole}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                        <span className={`rounded-md px-2 py-0.5 font-medium ${TAG_STYLE[key] || 'bg-gray-100 text-gray-700'}`}>
                          {categoryLabel(key)}
                        </span>
                        <span>{timeLabel(item.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {nextBefore && (
            <div className="text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Show older activity'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
