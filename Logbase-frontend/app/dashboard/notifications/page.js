'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { AlertRow } from '@/components/NotificationBell';
import { EmptyState, ErrorBanner, LoadingState, cardClass, secondaryButtonClass } from '@/components/ui';
import { listNotifications } from '@/lib/api';
import { readAlert, readAllAlerts, useAlerts } from '@/lib/alerts';

// Every alert, newest first (the bell shows only the latest ones)
export default function AlertsPage() {
  const router = useRouter();
  const { unread } = useAlerts();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listNotifications({ limit: 100 })
      .then((data) => setItems(data.notifications))
      .catch((err) => setError(err.message));
  }, [unread]);

  function open(alert) {
    readAlert(alert._id);
    setItems((list) => list.map((n) => (n._id === alert._id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)));
    if (alert.link) router.push(alert.link);
  }

  async function readAll() {
    await readAllAlerts();
    setItems((list) => (list || []).map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  }

  if (!items && !error) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Alerts"
        subtitle="What needs your attention."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={readAll} disabled={unread === 0} className={secondaryButtonClass}>
              Mark all as read
            </button>
            <Link href="/dashboard/settings/notifications" className={secondaryButtonClass}>
              Choose your alerts
            </Link>
          </div>
        }
      />
      <ErrorBanner message={error} />
      {items && items.length === 0 ? (
        <EmptyState icon="bell" message="No alerts yet. They show up here when stock runs low, a request needs your OK, or something else needs attention." />
      ) : (
        items && (
          <div className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
            {items.map((a) => (
              <AlertRow key={a._id} alert={a} onOpen={open} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
