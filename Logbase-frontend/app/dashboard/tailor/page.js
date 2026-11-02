'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listTailorOrders } from '@/lib/api';
import { useShops } from '@/lib/shops';
import { formatDate, formatMoney } from '@/lib/format';
import { TAILOR_STATUSES, shortStatus } from '@/lib/jobs';
import { dayOf, piecesText } from '@/lib/tailor';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import { JobStatusBadge, StatTile } from '@/components/JobParts';
import FilterBar, { DateRange, inDateRange } from '@/components/FilterBar';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink } from '@/components/ui';

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const columns = [
  {
    key: 'code',
    label: 'Order',
    render: (r) => (
      <span className="font-medium text-gray-900">
        {r.code}
        <span className="block text-xs font-normal text-gray-400">{formatDate(r.receivedAt)}</span>
      </span>
    ),
  },
  {
    key: 'customer',
    label: 'Customer',
    render: (r) => (
      <span>
        <span className="font-medium text-gray-900">{r.customerName}</span>
        <span className="line-clamp-1 block max-w-xs text-xs text-gray-400">{piecesText(r.pieces)}</span>
      </span>
    ),
  },
  {
    key: 'progress',
    label: 'Sewn',
    render: (r) => (
      <span className="tabular text-gray-600">
        {r.piecesDone}/{r.pieceCount}
      </span>
    ),
  },
  {
    key: 'dueDate',
    label: 'Delivery date',
    render: (r) => {
      if (!r.dueDate) return '—';
      const late = r.status !== 'delivered' && r.status !== 'ready' && dayOf(r.dueDate) < todayKey();
      return <span className={late ? 'font-medium text-red-600' : undefined}>{formatDate(r.dueDate)}{late ? ' · late' : ''}</span>;
    },
  },
  { key: 'total', label: 'Price', render: (r) => (r.total > 0 ? formatMoney(r.total) : 'Not set') },
  {
    key: 'balance',
    label: 'Balance',
    render: (r) => (r.status === 'delivered' || r.balance <= 0 ? <span className="text-gray-400">—</span> : <span className="font-medium text-red-600">{formatMoney(r.balance)}</span>),
  },
  { key: 'status', label: 'Status', render: (r) => <JobStatusBadge statuses={TAILOR_STATUSES} value={r.status} /> },
];

export default function TailorOrdersPage() {
  const router = useRouter();
  const { can } = useUser();
  const canRecord = can('recordSales');
  const { scopeShop, scopeReady } = useShops();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [money, setMoney] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  useEffect(() => {
    if (!scopeReady) return undefined;
    const ticket = (latest.current += 1);
    const timer = setTimeout(() => {
      const params = {};
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      if (scopeShop) params.shop = scopeShop;
      listTailorOrders(params)
        .then((result) => {
          if (ticket !== latest.current) return;
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
  }, [status, search, scopeReady, scopeShop]);

  const counts = data?.counts || {};
  const openCount = TAILOR_STATUSES.filter((s) => s.value !== 'delivered').reduce((n, s) => n + (counts[s.value] || 0), 0);
  const allRows = useMemo(() => data?.orders || [], [data]);
  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        if (money === 'owed' && !(r.balance > 0 && r.status !== 'delivered')) return false;
        if (money === 'clear' && r.balance > 0 && r.status !== 'delivered') return false;
        return inDateRange(r.receivedAt, from, to);
      }),
    [allRows, money, from, to]
  );

  const options = [
    { value: 'open', label: `In progress (${openCount})` },
    ...TAILOR_STATUSES.map((s) => ({ value: s.value, label: `${shortStatus(TAILOR_STATUSES, s.value)} (${counts[s.value] || 0})` })),
    { value: 'all', label: 'All orders' },
  ];

  return (
    <>
      <PageHeader
        title="Tailoring orders"
        subtitle="Every garment you are sewing: who it is for, the measurements, the deposit and where it is."
        action={
          canRecord ? (
            <PrimaryLink href="/dashboard/tailor/new">
              <Icon name="plus" className="h-4 w-4" />
              New order
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Orders in progress" value={openCount} />
          <StatTile label="Ready for pick-up" value={counts.ready || 0} />
          {data.summary ? (
            <>
              <StatTile label="Still owed on open orders" value={formatMoney(data.summary.owed)} tone={data.summary.owed > 0 ? 'red' : undefined} />
              <StatTile label="Received this month" value={formatMoney(data.summary.receivedThisMonth)} />
            </>
          ) : (
            <>
              <StatTile label="Being sewn" value={(counts.cutting || 0) + (counts.sewing || 0)} />
              <StatTile label="At fitting or finishing" value={(counts.fitting || 0) + (counts.finishing || 0)} />
            </>
          )}
        </div>
      )}

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, garment, occasion or order number', label: 'Search orders' }}
        filters={[
          { key: 'status', label: 'Status', value: status, onChange: setStatus, options },
          {
            key: 'money',
            label: 'Balance',
            value: money,
            onChange: setMoney,
            options: [
              { value: 'all', label: 'Any' },
              { value: 'owed', label: 'Still owes' },
              { value: 'clear', label: 'Nothing owed' },
            ],
          },
        ]}
        panel={<DateRange label="Received" from={from} to={to} onFrom={setFrom} onTo={setTo} />}
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
          icon="scissors"
          message={search || status !== 'open' || money !== 'all' || from || to ? 'No orders match these filters.' : 'No orders in progress.'}
          actionHref={canRecord && !search ? '/dashboard/tailor/new' : undefined}
          actionLabel={canRecord && !search ? 'New order' : undefined}
        />
      ) : (
        <>
          <ListTotal count={rows.length} noun="order" />
          {data?.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest orders only. Search to find an older one.</p>}
          <DataTable columns={columns} rows={rows} numbered={false} onRowClick={(r) => router.push(`/dashboard/tailor/${r._id}`)} />
        </>
      )}
    </>
  );
}
