'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorBanner, LoadingState, cardClass, secondaryButtonClass } from '@/components/ui';
import { adminLog } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

// Everything done from the admin panel (suspensions, plans given, emails sent...). Nobody else can see this.
export default function AdminLogPage() {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminLog({});
      setItems(data.items);
      setNext(data.nextBefore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setMore(true);
    try {
      const data = await adminLog({ before: next });
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
      <PageHeader title="Admin log" subtitle="Everything done from this panel. Business owners never see it." />
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState message="You have not changed anything from the admin panel yet." icon="shield" />
      ) : (
        <>
          <ul className={`${cardClass} divide-y divide-gray-100`}>
            {items.map((a) => (
              <li key={a._id} className="px-4 py-3 text-sm sm:px-5">
                <p className="text-gray-900">{a.summary}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {a.adminEmail} · {formatDateTime(a.createdAt)}
                  {a.business && (
                    <>
                      {' · '}
                      <Link href={`/admin/businesses/${a.business._id}`} className="font-medium text-primary hover:underline">
                        {a.business.name}
                      </Link>
                    </>
                  )}
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
