'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { SYNC_NOW_EVENT } from '@/components/OfflineStatus';
import { getConnection, subscribeConnection } from '@/lib/connection';
import { OUTBOX_EVENT } from '@/lib/offline';
import { listQueue, removeEntry, retryEntry, userKey } from '@/lib/outbox';
import { formatDateTime, formatMoney } from '@/lib/format';
import { EmptyState, LoadingState, cardClass, primaryButtonClass } from '@/components/ui';

// Sales recorded on this device that the server has not accepted yet: the ones waiting for a connection, and the ones
// the server refused (with the reason), so nothing a seller did at the counter is ever lost without anyone knowing.
export default function PendingSalesPage() {
  const { user } = useUser();
  const online = useSyncExternalStore(subscribeConnection, () => getConnection().online, () => true);
  const [entries, setEntries] = useState(null);

  const load = useCallback(async () => {
    setEntries(await listQueue());
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(OUTBOX_EVENT, load);
    return () => window.removeEventListener(OUTBOX_EVENT, load);
  }, [load]);

  if (entries === null) return <LoadingState label="Loading saved sales…" />;

  const key = userKey(user);
  const mine = entries.filter((e) => e.userId === key);
  const others = entries.length - mine.length;

  async function retry(id) {
    await retryEntry(id);
    window.dispatchEvent(new Event(SYNC_NOW_EVENT));
  }

  async function remove(entry) {
    const ok = window.confirm(
      'Remove this saved sale? It will never be recorded. Only do this if the sale did not really happen, or you have already recorded it another way.'
    );
    if (ok) await removeEntry(entry.id);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Saved sales"
        subtitle="Sales recorded on this phone that are not on the server yet. They are sent by themselves when the internet is back."
        backHref="/dashboard/sales"
        backLabel="Back to sales"
        action={
          mine.some((e) => e.status === 'pending') && online ? (
            <button type="button" onClick={() => window.dispatchEvent(new Event(SYNC_NOW_EVENT))} className={`${primaryButtonClass} px-4 py-2`}>
              Send now
            </button>
          ) : undefined
        }
      />

      {mine.length === 0 ? (
        <EmptyState message="Nothing is waiting. Every sale you recorded has been sent." />
      ) : (
        <ul className="space-y-3" data-section="queue">
          {mine.map((entry) => {
            const failed = entry.status === 'failed';
            const summary = entry.summary || { items: [] };
            return (
              <li key={entry.id} className={`${cardClass} p-4 ${failed ? 'border-red-200' : ''}`} data-status={entry.status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{summary.customerName || 'Customer'}</p>
                    <p className="text-xs text-gray-500">Made {formatDateTime(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(summary.total || 0)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {failed ? 'Not accepted' : online ? 'Waiting to send' : 'Waiting for internet'}
                    </span>
                  </div>
                </div>

                {summary.items.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600">
                    {summary.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        {item.quantity} × {item.name}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.photos && entry.photos.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">{entry.photos.length} photo{entry.photos.length === 1 ? '' : 's'} saved with it</p>
                )}
                {entry.newCustomer && <p className="mt-1 text-xs text-gray-400">New customer: they are saved when the sale is sent.</p>}

                {failed && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    <p className="font-medium">The server said:</p>
                    <p>{entry.error}</p>
                    <p className="mt-1 text-xs text-red-600/80">
                      Fix what it mentions (for example, correct the stock on the Products page), then press Try again.
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {failed && (
                    <button type="button" onClick={() => retry(entry.id)} className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5">
                      Try again
                    </button>
                  )}
                  <button type="button" onClick={() => remove(entry)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {others > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          {others} more saved sale{others === 1 ? '' : 's'} on this phone belong{others === 1 ? 's' : ''} to someone else. They are sent when that person signs in.
        </p>
      )}
    </div>
  );
}
