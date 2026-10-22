'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getLaundryOverview } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';
import { useUser } from '@/components/UserProvider';
import { Icon } from '@/components/Icons';
import LaundryHero, { HeroLink } from '@/components/LaundryHero';
import { StatTile } from '@/components/JobParts';
import LaundryTabs from '@/components/LaundryTabs';
import { BarList, SERIES_SALES, SegmentBar, TrendChart } from '@/components/charts';
import { ErrorBanner, LoadingState, cardClass } from '@/components/ui';

const STATUS_SEGMENTS = [
  { key: 'received', label: 'Received', color: '#3b82f6' },
  { key: 'processing', label: 'Being washed', color: '#d97706' },
  { key: 'ready', label: 'Ready', color: '#16a34a' },
  { key: 'out_for_delivery', label: 'Out for delivery', color: '#0d9488' },
  { key: 'collected', label: 'Finished (last 30 days)', color: '#9ca3af' },
];

const KIND_STYLE = {
  overdue: 'bg-red-100 text-red-700',
  waiting: 'bg-amber-100 text-amber-700',
  delivery: 'bg-blue-50 text-blue-800',
};
const KIND_LABEL = { overdue: 'Overdue', waiting: 'Waiting', delivery: 'On the road' };

// The first page of a laundromat: today at a glance, how the last 30 days went, and what needs a person right now.
export default function LaundryOverviewPage() {
  const { can, isOwner, user } = useUser();
  const canRecord = can('recordSales');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLaundryOverview()
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // a day is shown at midday, so the label is the same day wherever the phone is
  const days = useMemo(() => (data ? data.daily.map((d) => ({ ...d, date: `${d.date}T12:00:00` })) : []), [data]);

  return (
    <>
      <LaundryHero
        name={user?.name || ''}
        message={
          data
            ? data.tiles.inShop > 0
              ? `${data.tiles.inShop} ${data.tiles.inShop === 1 ? 'order is' : 'orders are'} in the shop today.${data.tiles.overdue > 0 ? ` ${data.tiles.overdue} overdue.` : ''}`
              : 'The shop is clear. No orders waiting.'
            : "Here's what's happening in your laundry today."
        }
      >
        {canRecord && (
          <HeroLink href="/dashboard/laundry/new" solid icon="plus">
            New order
          </HeroLink>
        )}
        {isOwner && (
          <HeroLink href="/dashboard/laundry/items" icon="shirt">
            Items &amp; prices
          </HeroLink>
        )}
        <HeroLink href="/dashboard/laundry/deliveries" icon="deliveries">
          Deliveries
        </HeroLink>
      </LaundryHero>

      <LaundryTabs />
      <ErrorBanner message={error} />

      {loading ? (
        <LoadingState />
      ) : !data ? null : (
        <div className="space-y-6">
          {/* today at a glance */}
          <section aria-label="Today at a glance">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <StatTile label="Received today" value={data.tiles.receivedToday} />
              <StatTile label="Due today" value={data.tiles.dueToday} />
              <StatTile label="Overdue" value={data.tiles.overdue} tone={data.tiles.overdue > 0 ? 'red' : undefined} />
              <StatTile label="Ready, waiting for pick-up" value={data.tiles.readyPickup} />
              <StatTile label="Ready to deliver" value={data.tiles.readyDelivery} />
              <StatTile label="Out for delivery" value={data.tiles.outForDelivery} />
              {data.money && <StatTile label="Collected today" value={formatMoney(data.money.collectedToday)} />}
              {data.money && <StatTile label="Still owed on open orders" value={formatMoney(data.money.owed)} tone={data.money.owed > 0 ? 'red' : undefined} />}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {data.tiles.inShop} {data.tiles.inShop === 1 ? 'order' : 'orders'} ({data.tiles.piecesInShop} pieces) in the shop
              {data.tiles.expressOpen > 0 ? ` · ${data.tiles.expressOpen} express` : ''}
            </p>
          </section>

          {/* needs attention */}
          <section className={`${cardClass} p-5`} aria-label="Needs attention">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-gray-900">Needs attention</h2>
              {data.attentionCount > 0 && <span className="text-xs text-gray-400">{data.attentionCount} to look at</span>}
            </div>
            {data.attention.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-gray-500">
                <Icon name="check" className="h-4 w-4 text-green-600" />
                Nothing is late or waiting too long. Good work.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.attention.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${KIND_STYLE[a.kind]}`}>{KIND_LABEL[a.kind]}</span>
                    <span className="min-w-0 flex-1 basis-56">
                      <span className="font-medium text-gray-900">
                        {a.code} · {a.customerName}
                      </span>
                      <span className="block text-sm text-gray-500">{a.reason}</span>
                    </span>
                    {a.balance > 0 && <span className="tabular text-sm font-medium text-red-600">{formatMoney(a.balance)} owed</span>}
                    <span className="flex items-center gap-3 text-sm">
                      {a.kind === 'waiting' && a.handover !== 'delivery' && (
                        <a
                          href={whatsappLink(
                            a.customerPhone,
                            `Hello ${(a.customerName || '').split(' ')[0] || 'there'}, a reminder that your laundry ${a.code} is ready for pick-up.${a.balance > 0 ? ` Balance to pay: ${formatMoney(a.balance)}.` : ''}${user?.businessName ? `\n\nThank you,\n${user.businessName}` : ''}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-green-700 hover:underline"
                        >
                          Remind on WhatsApp
                        </a>
                      )}
                      <Link href={`/dashboard/laundry/${a.id}`} className="font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* the last 30 days */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {data.money && (
              <section className={`${cardClass} p-5`} aria-label="Money collected per day">
                <h2 className="mb-1 text-lg font-medium text-gray-900">Money collected</h2>
                <p className="mb-3 text-xs text-gray-400">Deposits and payments taken each day, last 30 days</p>
                <TrendChart data={days} series={[{ key: 'collected', label: 'Money collected', color: SERIES_SALES }]} height={220} />
              </section>
            )}
            <section className={`${cardClass} p-5`} aria-label="Orders received per day">
              <h2 className="mb-1 text-lg font-medium text-gray-900">Orders received</h2>
              <p className="mb-3 text-xs text-gray-400">New orders each day, last 30 days</p>
              <TrendChart
                data={days}
                series={[{ key: 'orders', label: 'Orders', color: '#3b82f6' }]}
                height={220}
                formatValue={(n) => String(Math.round(Number(n) || 0))}
                formatAxis={(n) => String(Math.round(Number(n) || 0))}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className={`${cardClass} p-5`} aria-label="Orders by status">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Orders by status</h2>
              <SegmentBar segments={STATUS_SEGMENTS.map((s) => ({ label: s.label, value: data.byStatus[s.key] || 0, color: s.color, display: String(data.byStatus[s.key] || 0) }))} />
            </section>
            <section className={`${cardClass} p-5`} aria-label="Busiest items">
              <h2 className="mb-1 text-lg font-medium text-gray-900">Busiest items</h2>
              <p className="mb-4 text-xs text-gray-400">Pieces taken in, last 30 days</p>
              <BarList
                items={data.busiestItems.map((i) => ({ label: i.name, value: i.pieces, display: `${i.pieces} ${i.pieces === 1 ? 'piece' : 'pieces'}` }))}
                empty="No orders in the last 30 days yet"
              />
            </section>
          </div>
        </div>
      )}
    </>
  );
}
