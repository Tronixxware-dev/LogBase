'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTailorOverview } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';
import { useUser } from '@/components/UserProvider';
import { Icon } from '@/components/Icons';
import LaundryHero, { HeroLink } from '@/components/LaundryHero';
import { StatTile, JobStatusBadge } from '@/components/JobParts';
import { TAILOR_STATUSES } from '@/lib/jobs';
import { ErrorBanner, LoadingState, cardClass } from '@/components/ui';

function OrderRow({ o, extra, remind, businessName }) {
  const first = (o.customerName || '').split(' ')[0] || 'there';
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <span className="min-w-0 flex-1 basis-52">
        <span className="font-medium text-gray-900">
          {o.code} · {o.customerName}
        </span>
        <span className="line-clamp-1 block text-sm text-gray-500">{o.what}</span>
      </span>
      {extra}
      {o.balance > 0 && <span className="tabular text-sm font-medium text-red-600">{formatMoney(o.balance)} owed</span>}
      <span className="flex items-center gap-3 text-sm">
        {remind && (
          <a
            href={whatsappLink(
              o.customerPhone,
              `Hello ${first}, your outfit (${o.code}) is ready for pick-up.${o.balance > 0 ? ` Balance to pay: ${formatMoney(o.balance)}.` : ''}${businessName ? `\n\nThank you,\n${businessName}` : ''}`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-green-700 hover:underline"
          >
            Tell on WhatsApp
          </a>
        )}
        <Link href={`/dashboard/tailor/${o._id}`} className="font-medium text-primary hover:underline">
          Open
        </Link>
      </span>
    </li>
  );
}

function Section({ title, count, empty, children, tone }) {
  return (
    <section className={`${cardClass} p-5`} aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        {count > 0 && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{count}</span>}
      </div>
      {count === 0 ? <p className="py-3 text-sm text-gray-500">{empty}</p> : children}
    </section>
  );
}

// The first page of a tailor: what is late, what is due, who is waiting to collect, who comes for a fitting and what each tailor has on the table.
export default function TailorOverviewPage() {
  const { can, isOwner, user } = useUser();
  const canRecord = can('recordSales');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTailorOverview()
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const businessName = user?.businessName || '';

  return (
    <>
      <LaundryHero
        name={user?.name || ''}
        message={
          data
            ? data.openCount > 0
              ? `${data.openCount} ${data.openCount === 1 ? 'order is' : 'orders are'} on the table.${data.overdueCount > 0 ? ` ${data.overdueCount} late.` : ''}`
              : 'No orders on the table. Time to take new ones.'
            : "Here's what's happening in your studio today."
        }
      >
        {canRecord && (
          <HeroLink href="/dashboard/tailor/new" solid icon="plus">
            New order
          </HeroLink>
        )}
        <HeroLink href="/dashboard/tailor/measurements" icon="ruler">
          Measurements
        </HeroLink>
        {canRecord && (
          <HeroLink href="/dashboard/sales/new" icon="sales">
            Sell ready-made
          </HeroLink>
        )}
      </LaundryHero>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingState />
      ) : !data ? null : (
        <div className="space-y-6">
          <section aria-label="At a glance">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <StatTile label="Orders on the table" value={data.openCount} />
              <StatTile label="Late" value={data.overdueCount} tone={data.overdueCount > 0 ? 'red' : undefined} />
              <StatTile label="Due today" value={data.dueToday.length} />
              <StatTile label="Ready, waiting to be collected" value={data.readyCount} />
              {data.summary && <StatTile label="Orders taken this month" value={data.summary.ordersThisMonth} />}
              {data.summary && <StatTile label="Received this month" value={formatMoney(data.summary.receivedThisMonth)} />}
              {data.summary && <StatTile label="Still owed on open orders" value={formatMoney(data.summary.owed)} tone={data.summary.owed > 0 ? 'red' : undefined} />}
              {data.summary && <StatTile label="Delivered this month" value={data.summary.deliveredThisMonth} />}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TAILOR_STATUSES.filter((s) => s.value !== 'delivered').map((s) => (
                <span key={s.value} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                  <JobStatusBadge statuses={TAILOR_STATUSES} value={s.value} />
                  <span className="tabular font-semibold text-gray-900">{data.counts[s.value] || 0}</span>
                </span>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Section title="Late orders" count={data.overdueCount} tone="red" empty="Nothing is late. Good work.">
              <ul className="divide-y divide-gray-100">
                {data.overdue.map((o) => (
                  <OrderRow key={o._id} o={o} extra={<span className="text-sm font-medium text-red-600">Was due {formatDate(o.dueDate)}</span>} />
                ))}
              </ul>
            </Section>

            <Section title="Due today and this week" count={data.dueToday.length + data.dueSoon.length} empty="Nothing is due in the next 7 days.">
              <ul className="divide-y divide-gray-100">
                {[...data.dueToday, ...data.dueSoon].map((o) => (
                  <OrderRow
                    key={o._id}
                    o={o}
                    extra={
                      <span className="text-sm text-gray-500">
                        {data.dueToday.includes(o) ? 'Today' : formatDate(o.dueDate)} · {o.piecesDone}/{o.pieces} sewn
                      </span>
                    }
                  />
                ))}
              </ul>
            </Section>

            <Section title="Ready, waiting to be collected" count={data.readyCount} empty="No finished clothes waiting.">
              <ul className="divide-y divide-gray-100">
                {data.readyWaiting.map((o) => (
                  <OrderRow key={o._id} o={o} remind businessName={businessName} />
                ))}
              </ul>
            </Section>

            <Section title="Fittings coming up" count={data.fittings.length} empty="No fittings booked in the next 2 weeks.">
              <ul className="divide-y divide-gray-100">
                {data.fittings.map((f) => (
                  <li key={f._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="min-w-0 flex-1 basis-52">
                      <span className="font-medium text-gray-900">
                        {f.customerName} · {f.code}
                      </span>
                      <span className={`block text-sm ${f.late ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                        {formatDate(f.at)}
                        {f.late ? ' · missed?' : ''}
                        {f.note ? ` · ${f.note}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <a
                        href={whatsappLink(f.customerPhone, `Hello ${(f.customerName || '').split(' ')[0] || 'there'}, a reminder of your fitting on ${formatDate(f.at)}.${businessName ? `\n\nThank you,\n${businessName}` : ''}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-700 hover:underline"
                      >
                        Remind
                      </a>
                      <Link href={`/dashboard/tailor/${f.order}`} className="font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <section className={`${cardClass} p-5`} aria-label="Work on each tailor's table">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-gray-900">On each tailor&apos;s table</h2>
              <Link href="/dashboard/tailor/workers" className="text-sm font-medium text-primary hover:underline">
                {isOwner ? 'Pay & earnings' : 'See tailors'}
              </Link>
            </div>
            {data.workload.length === 0 && data.unassigned === 0 ? (
              <p className="flex items-center gap-2 py-3 text-sm text-gray-500">
                <Icon name="check" className="h-4 w-4 text-green-600" />
                No unfinished garments are assigned.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {data.workload.map((w) => (
                  <li key={String(w.worker)} className="flex items-center justify-between py-2.5">
                    <span className="font-medium text-gray-900">{w.name}</span>
                    <span className="tabular text-gray-600">
                      {w.pieces} {w.pieces === 1 ? 'garment' : 'garments'} to finish
                    </span>
                  </li>
                ))}
                {data.unassigned > 0 && (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="font-medium text-amber-700">Not given to a tailor yet</span>
                    <span className="tabular text-amber-700">
                      {data.unassigned} {data.unassigned === 1 ? 'garment' : 'garments'}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
