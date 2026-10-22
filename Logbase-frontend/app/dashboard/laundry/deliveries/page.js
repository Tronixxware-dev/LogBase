'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listLaundryOrders } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import { StatTile } from '@/components/JobParts';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import LaundryTabs from '@/components/LaundryTabs';
import { ExpressBadge, LaundryStatusBadge } from '@/components/LaundryParts';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink } from '@/components/ui';

const columns = [
  {
    key: 'code',
    label: 'Order',
    render: (o) => (
      <span className="font-medium text-gray-900">
        {o.code} {o.express && <ExpressBadge />}
        <span className="block text-xs font-normal text-gray-400">{o.totalItems} {o.totalItems === 1 ? 'piece' : 'pieces'} · in {formatDate(o.dateIn)}</span>
      </span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer',
    render: (o) => (
      <span>
        {o.customerName}
        <span className="block text-xs text-gray-400">{describePhone(o.customerPhone).display}</span>
      </span>
    ),
  },
  { key: 'deliveryAddress', label: 'Deliver to', render: (o) => <span className="block max-w-[16rem] break-words">{o.deliveryAddress || '—'}</span> },
  {
    key: 'riderName',
    label: 'Rider',
    render: (o) => (o.riderName ? <span>{o.riderName}{o.riderPhone && <span className="block text-xs text-gray-400">{o.riderPhone}</span>}</span> : <span className="text-gray-400">—</span>),
  },
  { key: 'deliveryFee', label: 'Fee', render: (o) => (o.deliveryFee > 0 ? formatMoney(o.deliveryFee) : <span className="text-gray-400">—</span>) },
  {
    key: 'balance',
    label: 'To collect',
    render: (o) => (o.balance > 0 ? <span className="font-medium text-red-600">{formatMoney(o.balance)}</span> : <span className="text-gray-400">Paid</span>),
  },
  { key: 'deliveryDate', label: 'Date out', render: (o) => (o.deliveryDate ? formatDate(o.deliveryDate) : '—') },
  { key: 'status', label: 'Status', render: (o) => <LaundryStatusBadge order={o} /> },
];

// Every order that goes to the customer's door: being washed, ready to go, out with a rider, delivered.
export default function LaundryDeliveriesPage() {
  const router = useRouter();
  const { can } = useUser();
  const canRecord = can('recordSales');
  const [data, setData] = useState(null);
  const [view, setView] = useState('todo'); // todo | washing | delivered | all
  const [search, setSearch] = useState('');
  const [rider, setRider] = useState('all');
  const [money, setMoney] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  useEffect(() => {
    const ticket = (latest.current += 1);
    const timer = setTimeout(() => {
      const params = { handover: 'delivery' };
      // "to deliver" and "being washed" are both parts of what is still in the shop
      if (view === 'delivered') params.status = 'collected';
      else if (view !== 'all') params.status = 'open';
      if (search.trim()) params.search = search.trim();
      listLaundryOrders(params)
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
  }, [view, search]);

  const inView = useMemo(() => {
    const all = data?.orders || [];
    if (view === 'todo') return all.filter((o) => o.status === 'ready' || o.status === 'out_for_delivery');
    if (view === 'washing') return all.filter((o) => o.status === 'received' || o.status === 'processing');
    return all;
  }, [data, view]);
  const rows = useMemo(
    () =>
      inView.filter((o) => {
        if (rider !== 'all' && o.riderName !== rider) return false;
        if (money === 'owed' && !(o.balance > 0)) return false;
        if (money === 'clear' && o.balance > 0) return false;
        return inDateRange(o.dateIn, from, to);
      }),
    [inView, rider, money, from, to]
  );

  const d = data?.deliveries || { washing: 0, ready: 0, out: 0, delivered: 0 };
  const options = [
    { value: 'todo', label: `To deliver (${d.ready + d.out})` },
    { value: 'washing', label: `Being washed (${d.washing})` },
    { value: 'delivered', label: `Delivered (${d.delivered})` },
    { value: 'all', label: 'All deliveries' },
  ];

  return (
    <>
      <PageHeader
        title="Deliveries"
        subtitle="Orders that go to the customer's door, and who has them."
        action={
          canRecord ? (
            <PrimaryLink href="/dashboard/laundry/new">
              <Icon name="plus" className="h-4 w-4" />
              New order
            </PrimaryLink>
          ) : undefined
        }
      />

      <LaundryTabs />
      <ErrorBanner message={error} />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Being washed" value={d.washing} />
          <StatTile label="Ready to send out" value={d.ready} />
          <StatTile label="Out with a rider" value={d.out} />
          {data.summary ? <StatTile label="Delivery fees this month" value={formatMoney(data.summary.deliveryFeesThisMonth || 0)} /> : <StatTile label="Delivered" value={d.delivered} />}
        </div>
      )}

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, address, rider or order', label: 'Search deliveries' }}
        filters={[
          { key: 'view', label: 'Show', value: view, onChange: setView, options },
          { key: 'rider', label: 'Rider', value: rider, onChange: setRider, options: optionsFrom(data?.orders || [], (o) => o.riderName, 'Every rider') },
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
        <EmptyState icon="deliveries" message={search || rider !== 'all' || money !== 'all' || from || to ? 'No delivery matches these filters.' : view === 'todo' ? 'Nothing to deliver right now.' : 'No deliveries here.'} />
      ) : (
        <>
          <ListTotal count={rows.length} noun="delivery" plural="deliveries" />
          {data?.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest deliveries only. Search to find an older one.</p>}
          <DataTable columns={columns} rows={rows} numbered={false} onRowClick={(o) => router.push(`/dashboard/laundry/${o._id}`)} />
        </>
      )}
    </>
  );
}
