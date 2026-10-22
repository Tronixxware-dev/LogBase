'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listRepairs } from '@/lib/api';
import { useShops } from '@/lib/shops';
import { formatDate, formatMoney } from '@/lib/format';
import { REPAIR_STATUSES, shortStatus } from '@/lib/jobs';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import { JobStatusBadge, StatTile } from '@/components/JobParts';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink } from '@/components/ui';

const columns = [
  {
    key: 'code',
    label: 'Job',
    render: (r) => (
      <span className="font-medium text-gray-900">
        {r.code}
        <span className="block text-xs font-normal text-gray-400">{formatDate(r.receivedAt)}</span>
      </span>
    ),
  },
  {
    key: 'device',
    label: 'Device',
    render: (r) => (
      <span>
        <span className="font-medium text-gray-900">{r.device}</span>
        <span className="block text-xs text-gray-400">{r.customerName}</span>
      </span>
    ),
  },
  { key: 'fault', label: 'Fault', render: (r) => <span className="line-clamp-2 max-w-xs">{r.fault}</span> },
  { key: 'quote', label: 'Quote', render: (r) => (r.quote > 0 ? formatMoney(r.quote) : 'Not set') },
  {
    key: 'balance',
    label: 'Balance',
    render: (r) =>
      r.status === 'collected' || r.balance <= 0 ? <span className="text-gray-400">—</span> : <span className="font-medium text-red-600">{formatMoney(r.balance)}</span>,
  },
  { key: 'promisedDate', label: 'Promised', render: (r) => (r.promisedDate ? formatDate(r.promisedDate) : '—') },
  { key: 'status', label: 'Status', render: (r) => <JobStatusBadge statuses={REPAIR_STATUSES} value={r.status} /> },
];

export default function RepairsPage() {
  const router = useRouter();
  const { can } = useUser();
  const canRecord = can('recordSales');
  const { scopeShop, scopeReady } = useShops();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [money, setMoney] = useState('all');
  const [tech, setTech] = useState('all');
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
      if (status !== 'all') params.status = status; // 'open' = everything still in the shop (the server knows it)
      if (search.trim()) params.search = search.trim();
      if (scopeShop) params.shop = scopeShop; // the repairs of the store being worked in
      listRepairs(params)
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
  }, [status, search, scopeReady, scopeShop]);

  const counts = data?.counts || { received: 0, in_repair: 0, ready: 0, collected: 0 };
  const openCount = counts.received + counts.in_repair + counts.ready;
  const allRows = useMemo(() => data?.repairs || [], [data]);
  // the status and the search are answered by the server; the rest narrows what came back
  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        if (money === 'owed' && !(r.balance > 0 && r.status !== 'collected')) return false;
        if (money === 'clear' && r.balance > 0 && r.status !== 'collected') return false;
        if (tech !== 'all' && r.technician !== tech) return false;
        return inDateRange(r.receivedAt, from, to);
      }),
    [allRows, money, tech, from, to]
  );

  const options = [
    { value: 'open', label: `In the shop (${openCount})` },
    ...REPAIR_STATUSES.map((s) => ({ value: s.value, label: `${shortStatus(REPAIR_STATUSES, s.value)} (${counts[s.value]})` })),
    { value: 'all', label: 'All jobs' },
  ];

  return (
    <>
      <PageHeader
        title="Repairs"
        subtitle="Devices brought in for repair: the fault, the quote, the deposit and where each job is."
        action={
          canRecord ? (
            <PrimaryLink href="/dashboard/repairs/new">
              <Icon name="plus" className="h-4 w-4" />
              Take in a repair
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {data?.summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Jobs in the shop" value={openCount} />
          <StatTile label="Ready for collection" value={counts.ready} />
          <StatTile label="Still owed on open jobs" value={formatMoney(data.summary.owed)} tone={data.summary.owed > 0 ? 'red' : undefined} />
          <StatTile label="Received this month" value={formatMoney(data.summary.receivedThisMonth)} />
        </div>
      )}

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, device, IMEI or job number', label: 'Search repair jobs' }}
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
          { key: 'tech', label: 'Technician', value: tech, onChange: setTech, advanced: true, options: optionsFrom(allRows, (r) => r.technician, 'Everyone') },
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
          icon="wrench"
          message={search || status !== 'open' || money !== 'all' || tech !== 'all' || from || to ? 'No repair jobs match these filters.' : 'No repair jobs in the shop.'}
          actionHref={canRecord && !search ? '/dashboard/repairs/new' : undefined}
          actionLabel={canRecord && !search ? 'Take in a repair' : undefined}
        />
      ) : (
        <>
          <ListTotal count={rows.length} noun="job" />
          {data?.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest jobs only. Search to find an older one.</p>}
          <DataTable columns={columns} rows={rows} numbered={false} onRowClick={(r) => router.push(`/dashboard/repairs/${r._id}`)} />
        </>
      )}
    </>
  );
}
