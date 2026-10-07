'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import { getConnection, subscribeConnection } from '@/lib/connection';
import { pingServer } from '@/lib/api';
import { OUTBOX_EVENT } from '@/lib/offline';
import { SYNCED_EVENT, queueCounts, syncOutbox } from '@/lib/outbox';
import { dismissInstall, installMode, promptInstall, subscribeInstall, warmUp } from '@/lib/pwa';

export const SYNC_NOW_EVENT = 'logbase:sync-now';
const CHECK_EVERY_MS = 20000;

function Strip({ tone, children }) {
  const style = {
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-teal-200 bg-teal-50 text-teal-900',
    bad: 'border-red-200 bg-red-50 text-red-800',
    good: 'border-green-200 bg-green-50 text-green-800',
  }[tone];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 text-sm ${style}`} role="status">
      {children}
    </div>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The strip at the top of every dashboard page that tells the truth about the connection and the sales waiting on this
// device, and the one place that sends those sales (when the connection is back, and every little while).
export default function OfflineStatus() {
  const { user, can } = useUser();
  const online = useSyncExternalStore(subscribeConnection, () => getConnection().online, () => true);
  const [counts, setCounts] = useState({ pending: 0, failed: 0, others: 0, othersNames: [] });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [install, setInstall] = useState(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const next = await queueCounts(user);
    if (mounted.current) setCounts(next);
    return next;
  }, [user]);

  const trySend = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    if (mounted.current) setSending(true);
    try {
      await syncOutbox(user);
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
      refresh();
    }
  }, [user, refresh]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // when the app opens: look at what is waiting, and send it if it can be sent
  useEffect(() => {
    refresh().then((c) => {
      if (c.pending > 0 && getConnection().online) trySend();
    });
  }, [refresh, trySend]);

  // keep the counts right, send when the connection comes back, and tell the person when sales went through
  useEffect(() => {
    const onChange = () => refresh();
    const onOnline = () => trySend();
    const onSyncNow = () => trySend();
    const onSynced = (e) => {
      const n = (e.detail && e.detail.count) || 0;
      if (n > 0) {
        setToast(`${plural(n, 'saved sale was', 'saved sales were')} recorded.`);
        setTimeout(() => mounted.current && setToast(''), 6000);
      }
    };
    window.addEventListener(OUTBOX_EVENT, onChange);
    window.addEventListener('online', onOnline);
    window.addEventListener(SYNC_NOW_EVENT, onSyncNow);
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(OUTBOX_EVENT, onChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(SYNC_NOW_EVENT, onSyncNow);
      window.removeEventListener(SYNCED_EVENT, onSynced);
    };
  }, [refresh, trySend]);

  // every little while: if the server cannot be reached, check whether it can be now; if sales are waiting, send them
  useEffect(() => {
    const id = setInterval(async () => {
      if (!getConnection().online) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return; // the browser knows there is no connection
        if (!(await pingServer())) return;
      }
      const c = await refresh();
      if (c.pending > 0) trySend();
    }, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [refresh, trySend]);

  // while there is internet, keep the main pages on the device so they open offline
  useEffect(() => {
    if (online && user) {
      const id = setTimeout(() => warmUp(), 3000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [online, user]);

  // the install button
  useEffect(() => {
    const update = () => setInstall(installMode());
    update();
    return subscribeInstall(update);
  }, []);

  const canSell = can('recordSales');

  return (
    <div className="mb-4 space-y-2 print:hidden" data-section="offline-status">
      {!online && (
        <Strip tone="warn">
          <span>
            <span className="font-medium">You are offline.</span>{' '}
            {canSell
              ? 'You can keep recording sales: they are saved on this phone and sent when the internet is back. Pages show what was saved the last time you were online.'
              : 'Pages show what was saved the last time you were online. Changes need internet.'}
          </span>
          {canSell && (
            <Link href="/dashboard/sales/new" className="font-medium underline underline-offset-2">
              Record a sale
            </Link>
          )}
        </Strip>
      )}

      {counts.pending > 0 && (
        <Strip tone="info">
          <span>
            {online || sending
              ? `${sending ? 'Sending' : 'Waiting to send'} ${plural(counts.pending, 'saved sale', 'saved sales')}…`
              : `${plural(counts.pending, 'sale is', 'sales are')} saved on this phone and will be sent when you are back online.`}
          </span>
          <span className="flex items-center gap-3">
            {online && !sending && (
              <button type="button" onClick={trySend} className="font-medium underline underline-offset-2">
                Send now
              </button>
            )}
            <Link href="/dashboard/sales/pending" className="font-medium underline underline-offset-2">
              See them
            </Link>
          </span>
        </Strip>
      )}

      {counts.failed > 0 && (
        <Strip tone="bad">
          <span>
            {plural(counts.failed, 'saved sale was', 'saved sales were')} not accepted by the server and still need{counts.failed === 1 ? 's' : ''} your attention.
          </span>
          <Link href="/dashboard/sales/pending" className="font-medium underline underline-offset-2">
            See why
          </Link>
        </Strip>
      )}

      {counts.others > 0 && (
        <Strip tone="warn">
          <span>
            {plural(counts.others, 'sale on this phone belongs', 'sales on this phone belong')} to {counts.othersNames.length ? counts.othersNames.join(', ') : 'someone else'}.
            {counts.othersNames.length === 1 ? ' It is' : ' They are'} sent when that person signs in on this phone.
          </span>
        </Strip>
      )}

      {toast && <Strip tone="good"><span>{toast}</span></Strip>}

      {install === 'prompt' && (
        <Strip tone="info">
          <span>Install LogBase on this device to open it like an app, even with a weak connection.</span>
          <span className="flex items-center gap-3">
            <button type="button" onClick={promptInstall} className="font-medium underline underline-offset-2">
              Install
            </button>
            <button type="button" onClick={dismissInstall} className="text-teal-800/70 hover:text-teal-900">
              Not now
            </button>
          </span>
        </Strip>
      )}
      {install === 'ios' && (
        <Strip tone="info">
          <span>To install LogBase on your iPhone: tap the Share button in Safari, then “Add to Home Screen”.</span>
          <button type="button" onClick={dismissInstall} className="text-teal-800/70 hover:text-teal-900">
            Got it
          </button>
        </Strip>
      )}
    </div>
  );
}
