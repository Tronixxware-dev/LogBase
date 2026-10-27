'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { ALERT_STYLE, DEFAULT_ALERT_STYLE, readAlert, readAllAlerts, useAlerts } from '@/lib/alerts';
import { timeAgo } from '@/lib/format';

// One alert, as a row (used in the bell and on the Alerts page)
export function AlertRow({ alert, onOpen }) {
  const style = ALERT_STYLE[alert.type] || DEFAULT_ALERT_STYLE;
  const unread = !alert.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(alert)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${unread ? "bg-teal-50" : ""}`}
    >
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
        <Icon name={style.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm leading-snug ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{alert.title}</span>
        {alert.body && <span className="mt-0.5 block text-xs leading-snug text-gray-500">{alert.body}</span>}
        <span className="mt-1 block text-[11px] text-gray-400">{timeAgo(alert.createdAt)}</span>
      </span>
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Not read yet" />}
    </button>
  );
}

// The bell in the top bar: how many alerts are new, and the latest ones in a small panel.
export default function NotificationBell() {
  const router = useRouter();
  const { unread, items, loaded } = useAlerts();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openAlert(alert) {
    readAlert(alert._id);
    setOpen(false);
    if (alert.link) router.push(alert.link);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Alerts, ${unread} new` : 'Alerts'}
        aria-expanded={open}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:border-gray-300 hover:text-gray-700 hover:shadow-sm active:scale-95"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Alerts</p>
            <button type="button" onClick={readAllAlerts} disabled={unread === 0} className="text-xs font-medium text-primary hover:underline disabled:text-gray-300 disabled:no-underline">
              Mark all as read
            </button>
          </div>
          <div className="max-h-[26rem] divide-y divide-gray-100 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">{loaded ? 'No alerts yet. They show up here when something needs your attention.' : 'Loading…'}</p>
            ) : (
              items.map((a) => <AlertRow key={a._id} alert={a} onOpen={openAlert} />)
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-medium">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="text-primary hover:underline">
              See all alerts
            </Link>
            <Link href="/dashboard/settings/notifications" onClick={() => setOpen(false)} className="text-gray-500 hover:text-primary">
              Choose your alerts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
