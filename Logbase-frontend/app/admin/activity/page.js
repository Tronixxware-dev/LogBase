'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorBanner, LoadingState, cardClass, inputClass, secondaryButtonClass } from '@/components/ui';
import { adminActivity } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

// What people did in any business, newest first. Loads 50 at a time.
export default function AdminActivityPage() {
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(typed.trim()), 350);
    return () => clearTimeout(t);
  }, [typed]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminActivity({ search });
      setItems(data.items);
      setNext(data.nextBefore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setMore(true);
    try {
      const data = await adminActivity({ search, before: next });
      setItems((cur) => [...cur, ...data.items]);
      setNext(data.nextBefore);
    } catch (err) {
      setError(err.message);
    } finally {
      setMore(false);
    }
  }

  return (
    <>
      <PageHeader title="Activity" subtitle="What people did in every business: sales, returns, stock changes, logins and more." />
      <div className="mb-5">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search what happened, for example a name or an amount" className={inputClass} />
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState message="Nothing matches that." icon="activity" />
      ) : (
        <>
          <ul className={`${cardClass} divide-y divide-gray-100`}>
            {items.map((a) => (
              <li key={a._id} className="px-4 py-3 text-sm sm:px-5">
                <p className="text-gray-900">{a.summary}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {a.business ? (
                    <Link href={`/admin/businesses/${a.business._id}`} className="font-medium text-primary hover:underline">
                      {a.business.name}
                    </Link>
                  ) : (
                    'Unknown business'
                  )}
                  {' · '}
                  {a.userName || 'Someone'} · {formatDateTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          {next && (
            <div className="mt-4 text-center">
              <button type="button" onClick={loadMore} disabled={more} className={secondaryButtonClass}>
                {more ? 'Loading…' : 'Show older'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
