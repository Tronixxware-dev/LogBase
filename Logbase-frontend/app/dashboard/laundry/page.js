'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listLaundryOrders } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { LAUNDRY_STATUSES, shortStatus } from '@/lib/jobs';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import { StatTile } from '@/components/JobParts';
import FilterBar, { DateRange, inDateRange } from '@/components/FilterBar';
import LaundryTabs from '@/components/LaundryTabs';
import { ExpressBadge, LaundryStatusBadge } from '@/components/LaundryParts';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink, secondaryButtonClass } from '@/components/ui';

const columns = [
  {
    key: 'code',
    label: 'Order',
    render: (o) => (
      <span className="font-medium text-gray-900">
        {o.code} {o.express && <ExpressBadge />}
        <span className="block text-xs font-normal text-gray-400">in {formatDate(o.dateIn)}</span>
      </span>
    ),
  },
  { key: 'customerName', label: 'Customer' },
  { key: 'totalItems', label: 'Pieces' },
  { key: 'totalAmount', label: 'Total', render: (o) => <span className="font-medium text-gray-900">{formatMoney(o.totalAmount)}</span> },
  {
    key: 'balance',
    label: 'Balance',
    render: (o) => (o.balance > 0 ? <span className="font-medium text-red-600">{formatMoney(o.balance)}</span> : <span className="text-gray-400">—</span>),
  },
  {
    key: 'handover',
    label: 'Hand-over',
    render: (o) =>
      o.handover === 'delivery' ? (
        <span>
          Delivery
          {o.riderName && o.status === 'out_for_delivery' && <span className="block text-xs text-gray-400">with {o.riderName}</span>}
        </span>
      ) : (
        'Pick-up'
      ),
  },
  { key: 'deliveryDate', label: 'Date out', render: (o) => (o.deliveryDate ? formatDate(o.deliveryDate) : '—') },
  { key: 'status', label: 'Status', render: (o) => <LaundryStatusBadge order={o} /> },
];

export default function LaundryPage() {
  const router = useRouter();
  const { can, isOwner } = useUser();
  const canRecord = can('recordSales');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [handover, setHandover] = useState('all');
  const [speed, setSpeed] = useState('all');
  const [money, setMoney] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  useEffect(() => {
    const ticket = (latest.current += 1);
    const timer = setTimeout(() => {
      const params = {};
      if (status !== 'all') params.status = status; // 'open' = everything still in the shop (the server knows it)
      if (search.trim()) params.search = search.trim();
      listLaundryOrders(params)
        .then((result) => {
          if (ticket !== latest.current) return; // an older answer arriving late
          setData(result);
          setError('');
        })
        .catch((err) => {
          if (ticket === latest.current) setError(err.message);
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [status, search]);

  const counts = data?.counts || { received: 0, processing: 0, ready: 0, out_for_delivery: 0, collected: 0 };
  const openCount = counts.received + counts.processing + counts.ready + (counts.out_for_delivery || 0);
  const allRows = useMemo(() => data?.orders || [], [data]);
  // the status and the search are answered by the server; the rest narrows what came back
  const rows = useMemo(
    () =>
      allRows.filter((o) => {
        if (handover === 'delivery' && o.handover !== 'delivery') return false;
        if (handover === 'pickup' && o.handover === 'delivery') return false;
        if (speed === 'express' && !o.express) return false;
        if (speed === 'normal' && o.express) return false;
        if (money === 'owed' && !(o.balance > 0)) return false;
        if (money === 'clear' && o.balance > 0) return false;
        return inDateRange(o.dateIn, from, to);
      }),
    [allRows, handover, speed, money, from, to]
  );

  const options = [
    { value: 'open', label: `In the shop (${openCount})` },
    ...LAUNDRY_STATUSES.map((s) => ({ value: s.value, label: `${shortStatus(LAUNDRY_STATUSES, s.value)} (${counts[s.value] || 0})` })),
    { value: 'all', label: 'All orders' },
  ];

  return (
    <>
      <PageHeader
        title="Laundry orders"
        subtitle="The register: clothes brought in, what each costs, and when they go back."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <Link href="/dashboard/laundry/items" className={secondaryButtonClass}>
                Items &amp; prices
              </Link>
            )}
            {canRecord && (
              <PrimaryLink href="/dashboard/laundry/new">
                <Icon name="plus" className="h-4 w-4" />
                New order
              </PrimaryLink>
            )}
          </div>
        }
      />

      <LaundryTabs />

      <ErrorBanner message={error} />

      {data?.summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Orders in the shop" value={openCount} />
          <StatTile label="Pieces in the shop" value={data.itemsInShop} />
          <StatTile label="Still owed on open orders" value={formatMoney(data.summary.owed)} tone={data.summary.owed > 0 ? 'red' : undefined} />
          <StatTile label="Received this month" value={formatMoney(data.summary.receivedThisMonth)} />
        </div>
      )}

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, phone, item or order number', label: 'Search laundry orders' }}
        filters={[
          { key: 'status', label: 'Status', value: status, onChange: setStatus, options },
          {
            key: 'handover',
            label: 'Hand-over',
            value: handover,
            onChange: setHandover,
            options: [
              { value: 'all', label: 'Pick-up and delivery' },
              { value: 'pickup', label: 'Pick-up' },
              { value: 'delivery', label: 'Delivery' },
            ],
          },
          {
            key: 'speed',
            label: 'Speed',
            value: speed,
            onChange: setSpeed,
            advanced: true,
            options: [
              { value: 'all', label: 'Any' },
              { value: 'express', label: 'Express' },
              { value: 'normal', label: 'Normal' },
            ],
          },
          {
            key: 'money',
            label: 'Balance',
            value: money,
            onChange: setMoney,
            advanced: true,
            options: [
              { value: 'all', label: 'Any' },
              { value: 'owed', label: 'Still owes' },
              { value: 'clear', label: 'Paid in full' },
            ],
          },
        ]}
        panel={<DateRange label="Date in" from={from} to={to} onFrom={setFrom} onTo={setTo} />}
        panelCount={(from ? 1 : 0) + (to ? 1 : 0)}
        onClear={() => {
          setFrom('');
          setTo('');
        }}
      />

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="shirt"
          message={search || status !== 'open' || handover !== 'all' || speed !== 'all' || money !== 'all' || from || to ? 'No laundry orders match these filters.' : 'No laundry in the shop.'}
          actionHref={canRecord && !search ? '/dashboard/laundry/new' : undefined}
          actionLabel={canRecord && !search ? 'Record the first order' : undefined}
        />
      ) : (
        <>
          <ListTotal count={rows.length} noun="order" />
          {data?.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest orders only. Search to find an older one.</p>}
          <DataTable columns={columns} rows={rows} numbered={false} onRowClick={(o) => router.push(`/dashboard/laundry/${o._id}`)} />
        </>
      )}
    </>
  );
}
