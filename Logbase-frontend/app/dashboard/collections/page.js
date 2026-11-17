'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCollections, getOrderHistory } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { methodLabel } from '@/lib/jobs';
import { businessTypeOf, hasFeature } from '@/lib/businessTypes';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FilterBar from '@/components/FilterBar';
import { StatTile } from '@/components/JobParts';
import { Badge, ErrorBanner, LoadingState, EmptyState, ListTotal, cardClass, inputClass, secondaryButtonClass } from '@/components/ui';

// Days are the person's own local days, written 2026-10-03.
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function presets() {
  const now = new Date();
  const today = ymd(now);
  const weekStart = addDays(now, -((now.getDay() + 6) % 7)); // Monday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return [
    { key: 'today', label: 'Today', from: today, to: today },
    { key: 'yesterday', label: 'Yesterday', from: ymd(addDays(now, -1)), to: ymd(addDays(now, -1)) },
    { key: 'week', label: 'This week', from: ymd(weekStart), to: today },
    { key: 'month', label: 'This month', from: ymd(monthStart), to: today },
    { key: 'last', label: 'Last month', from: ymd(lastMonthStart), to: ymd(lastMonthEnd) },
    { key: '30', label: 'Last 30 days', from: ymd(addDays(now, -29)), to: today },
  ];
}

const STATUS_LABELS = {
  received: 'Received',
  processing: 'Being washed',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  collected: 'Collected',
  in_repair: 'In repair',
  cutting: 'Cutting',
  sewing: 'Sewing',
  fitting: 'Fitting',
  finishing: 'Finishing',
  delivered: 'Delivered',
};

const BACK = { laundromat: '/dashboard/laundry', tailor: '/dashboard/tailor', repair: '/dashboard/repairs' };

const SOURCE_LABELS = { laundry: 'Laundry orders', tailor: 'Tailor orders', repair: 'Repair jobs' };
const SOURCE_PATHS = { laundry: '/dashboard/laundry', tailor: '/dashboard/tailor', repair: '/dashboard/repairs' };

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadOrdersCsv(rows, from, to) {
  const head = ['Order', 'Type', 'Customer', 'Phone', 'Details', 'Came in', 'Status', 'Collected on', 'Total', 'Paid', 'Balance'];
  const lines = rows.map((r) =>
    [r.code, r.sourceLabel, r.customer, r.phone, r.detail, ymd(new Date(r.cameIn)), STATUS_LABELS[r.status] || r.status, r.doneAt ? ymd(new Date(r.doneAt)) : '', r.value, r.paid, r.owing].map(csvCell).join(',')
  );
  const blob = new Blob([`\ufeff${[head.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all-orders-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows, from, to) {
  const head = ['Date', 'Time', 'Type', 'Order', 'Customer', 'Phone', 'Amount', 'Method', 'Note', 'Taken by'];
  const lines = rows.map((r) => {
    const d = new Date(r.at);
    return [ymd(d), d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }), r.sourceLabel, r.code, r.customer, r.phone, r.amount, methodLabel(r.method), r.note, r.by].map(csvCell).join(',');
  });
  const blob = new Blob([`﻿${[head.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `money-collected-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CollectionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const businessType = businessTypeOf(user);
  const list = useMemo(() => presets(), []);
  const [from, setFrom] = useState(list[3].from);
  const [to, setTo] = useState(list[3].to);
  const [source, setSource] = useState('all');
  const [method, setMethod] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('orders'); // orders = every order ever taken · money = payments taken
  const [show, setShow] = useState('all'); // all | done | open
  const [basis, setBasis] = useState('in'); // the dates are about the day it came in, or the day it was collected
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  const sources = ['laundry', 'tailor', 'repair'].filter((s) => hasFeature(businessType, s === 'repair' ? 'repairs' : s === 'laundry' ? 'laundry' : 'tailor'));

  useEffect(() => {
    if (!from || !to || to < from) return undefined;
    const ticket = (latest.current += 1);
    const timer = setTimeout(
      () => {
        setLoading(true);
        (tab === 'orders' ? getOrderHistory({ from, to, source, status: show, basis, search: search.trim() }) : getCollections({ from, to, source, method, search: search.trim() }))
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
      },
      search ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [tab, from, to, source, method, show, basis, search]);

  const activePreset = list.find((p) => p.from === from && p.to === to)?.key;
  const isOrders = tab === 'orders';
  // (the answer on screen belongs to the tab that asked for it)
  const ready = data && (isOrders ? Boolean(data.summary) : Array.isArray(data.payments));
  const rows = useMemo(() => {
    if (!data) return [];
    if (tab === 'orders') return (data.orders || []).map((o) => ({ ...o, _id: o.id }));
    return (data.payments || []).map((p) => ({ ...p, _id: p.id }));
  }, [data, tab]);
  const badRange = from && to && to < from;
  const oneDay = from === to;

  function switchTab(next) {
    if (next === tab) return;
    setData(null);
    setLoading(true);
    setTab(next);
  }

  const paymentColumns = [
    {
      key: 'at',
      label: 'Date',
      render: (p) => (
        <span className="font-medium text-gray-900">
          {formatDate(p.at)}
          <span className="block text-xs font-normal text-gray-400">{formatDateTime(p.at).split(', ')[1]}</span>
        </span>
      ),
    },
    {
      key: 'code',
      label: 'Order',
      render: (p) => (
        <span>
          {p.code}
          <span className="block text-xs text-gray-400">{p.detail || p.sourceLabel}</span>
        </span>
      ),
    },
    { key: 'customer', label: 'Customer' },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-semibold text-gray-900">{formatMoney(p.amount)}</span> },
    { key: 'method', label: 'Method', render: (p) => methodLabel(p.method) },
    { key: 'kind', label: 'For', render: (p) => (p.kind === 'deposit' ? <Badge tone="blue">Deposit</Badge> : <Badge tone="green">Payment</Badge>) },
    { key: 'by', label: 'Taken by' },
  ];

  const orderColumns = [
    {
      key: 'code',
      label: 'Order',
      render: (o) => (
        <span className="font-medium text-gray-900">
          {o.code}
          <span className="block text-xs font-normal text-gray-400">{[o.sourceLabel, o.detail].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { key: 'customer', label: 'Customer' },
    { key: 'cameIn', label: 'Came in', render: (o) => formatDate(o.cameIn) },
    { key: 'status', label: 'Status', render: (o) => (o.done ? <Badge tone="gray">{STATUS_LABELS[o.status] || 'Done'}</Badge> : <Badge tone="amber">{STATUS_LABELS[o.status] || o.status}</Badge>) },
    { key: 'doneAt', label: 'Collected on', render: (o) => (o.doneAt ? formatDate(o.doneAt) : '—') },
    { key: 'value', label: 'Total', align: 'right', render: (o) => <span className="font-semibold text-gray-900">{formatMoney(o.value)}</span> },
    { key: 'paid', label: 'Paid', align: 'right', render: (o) => formatMoney(o.paid) },
    { key: 'owing', label: 'Balance', align: 'right', render: (o) => (o.owing > 0 ? <span className="font-medium text-red-600">{formatMoney(o.owing)}</span> : <span className="text-gray-400">—</span>) },
  ];

  const byMethod = (data && data.byMethod) || {};
  const methodKeys = Object.keys(byMethod).sort((a, b) => byMethod[b] - byMethod[a]);
  const days = (data && data.days) || [];
  const best = days.reduce((top, d) => (!top || d.amount > top.amount ? d : top), null);
  const typeOptions = sources.length > 1 ? [{ value: 'all', label: 'All orders' }, ...sources.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))] : null;

  const tabButton = (key, label) => (
    <button
      type="button"
      key={key}
      onClick={() => switchTab(key)}
      aria-current={tab === key ? 'page' : undefined}
      className={`rounded-lg px-4 py-1.5 text-sm transition-all duration-200 ${tab === key ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        backHref={BACK[businessType] || '/dashboard'}
        backLabel="Orders"
        title="All orders"
        subtitle={isOrders ? 'Every order you have taken, for any dates. Orders stay here for good, even after they are collected.' : data && data.seesAll === false ? 'The money you took in on orders, for any dates.' : 'Everything collected on orders, for any dates. Deposits and later payments are counted on the day they were taken.'}
        action={
          rows.length > 0 ? (
            <button type="button" className={secondaryButtonClass} onClick={() => (isOrders ? downloadOrdersCsv(rows, from, to) : downloadCsv(rows, from, to))}>
              Download (Excel)
            </button>
          ) : null
        }
      />

      <nav className="mb-5 inline-flex rounded-xl bg-gray-100 p-1" aria-label="Views">
        {tabButton('orders', 'Orders')}
        {tabButton('money', 'Money collected')}
      </nav>

      <ErrorBanner message={error} />

      <div className={`${cardClass} mb-4 p-4`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {list.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                activePreset === p.key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setFrom('2020-01-01');
              setTo(ymd(new Date()));
            }}
            className={`rounded-full border px-3 py-1 text-sm transition ${from === '2020-01-01' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
          >
            All time
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-3">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-gray-500">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className={inputClass} />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-gray-500">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" className={inputClass} />
          </label>
          {isOrders && (
            <label className="col-span-2 block min-w-0 sm:col-span-1">
              <span className="mb-1 block text-xs font-medium text-gray-500">Dates are the day it…</span>
              <select value={basis} onChange={(e) => setBasis(e.target.value)} aria-label="What the dates are about" className={inputClass}>
                <option value="in">Came in</option>
                <option value="done">Was collected</option>
              </select>
            </label>
          )}
        </div>
        {badRange && <p className="mt-2 text-sm text-red-600">The “to” date is before the “from” date.</p>}
      </div>

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, phone or order number', label: isOrders ? 'Search orders' : 'Search payments' }}
        filters={[
          isOrders
            ? {
                key: 'show',
                label: 'Show',
                value: basis === 'done' ? 'done' : show,
                onChange: setShow,
                options: [
                  { value: 'all', label: 'All orders' },
                  { value: 'done', label: 'Collected / delivered' },
                  { value: 'open', label: 'Still in progress' },
                ],
              }
            : null,
          typeOptions ? { key: 'source', label: 'Type', value: source, onChange: setSource, options: typeOptions } : null,
          !isOrders
            ? {
                key: 'method',
                label: 'Paid by',
                value: method,
                onChange: setMethod,
                options: [
                  { value: 'all', label: 'Any method' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'transfer', label: 'Bank transfer' },
                  { value: 'card', label: 'Card' },
                  { value: 'other', label: 'Other' },
                ],
              }
            : null,
        ]}
      />

      {loading && !ready ? (
        <LoadingState />
      ) : !ready ? null : isOrders ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Orders" value={data.summary.count.toLocaleString()} />
            <StatTile label="Collected / delivered" value={`${data.summary.done.toLocaleString()} of ${data.summary.count.toLocaleString()}`} />
            <StatTile label="Total value" value={formatMoney(data.summary.value)} />
            <StatTile label="Still owed" value={formatMoney(data.summary.owing)} tone={data.summary.owing > 0 ? 'red' : undefined} />
          </div>
          {rows.length === 0 ? (
            <EmptyState icon="list" message={`No orders ${oneDay ? `on ${formatDate(from)}` : `between ${formatDate(from)} and ${formatDate(to)}`}${search || show !== 'all' || source !== 'all' || basis === 'done' ? ' for these filters' : ''}.`} />
          ) : (
            <>
              <ListTotal count={rows.length} noun="order" />
              {data.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest {rows.length.toLocaleString()} orders. The totals above cover every order in these dates; choose fewer days to see them all.</p>}
              <DataTable columns={orderColumns} rows={rows} numbered={false} onRowClick={(o) => router.push(`${SOURCE_PATHS[o.source]}/${o.orderId}`)} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={oneDay ? `Collected on ${formatDate(from)}` : 'Total collected'} value={formatMoney(data.total)} />
            <StatTile label="Payments" value={data.count.toLocaleString()} />
            {data.orders ? <StatTile label="Orders taken in" value={`${data.orders.count.toLocaleString()} · ${formatMoney(data.orders.value)}`} /> : <StatTile label="Average payment" value={formatMoney(data.count ? data.total / data.count : 0)} />}
            {data.orders ? <StatTile label="Still owed on them" value={formatMoney(data.orders.owing)} tone={data.orders.owing > 0 ? 'red' : undefined} /> : <StatTile label="Days with money in" value={days.length} />}
          </div>

          {data.count > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className={`${cardClass} p-4`}>
                <p className="mb-2 text-xs font-medium text-gray-500">By payment method</p>
                <ul className="space-y-1.5 text-sm">
                  {methodKeys.map((m) => (
                    <li key={m} className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">{methodLabel(m)}</span>
                      <span className="tabular font-semibold text-gray-900">{formatMoney(byMethod[m])}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${cardClass} p-4`}>
                <p className="mb-2 text-xs font-medium text-gray-500">{source === 'all' && sources.length > 1 ? 'By type of order' : 'By day'}</p>
                {source === 'all' && sources.length > 1 ? (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(data.bySource || {})
                      .filter(([, v]) => v.count > 0)
                      .map(([k, v]) => (
                        <li key={k} className="flex items-center justify-between gap-3">
                          <span className="text-gray-600">{SOURCE_LABELS[k]}</span>
                          <span className="tabular font-semibold text-gray-900">{formatMoney(v.amount)}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                    {[...days].reverse().map((d) => (
                      <li key={d.day} className="flex items-center justify-between gap-3">
                        <span className="text-gray-600">{formatDate(`${d.day}T12:00:00`)}</span>
                        <span className="tabular font-semibold text-gray-900">{formatMoney(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {!oneDay && best && <p className="mt-2 text-xs text-gray-400">Best day: {formatDate(`${best.day}T12:00:00`)} ({formatMoney(best.amount)})</p>}
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState icon="wallet" message={`No money was collected ${oneDay ? `on ${formatDate(from)}` : `between ${formatDate(from)} and ${formatDate(to)}`}${search || method !== 'all' || source !== 'all' ? ' for these filters' : ''}.`} />
          ) : (
            <>
              <ListTotal count={rows.length} noun="payment" />
              {data.truncated && <p className="mb-3 text-xs text-amber-700">Showing the newest {rows.length.toLocaleString()} payments. The totals above cover every payment; choose fewer days to see them all.</p>}
              <DataTable columns={paymentColumns} rows={rows} numbered={false} onRowClick={(p) => router.push(`${SOURCE_PATHS[p.source]}/${p.orderId}`)} />
            </>
          )}
        </>
      )}
    </>
  );
}
