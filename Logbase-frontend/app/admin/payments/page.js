'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { EmptyState, ErrorBanner, ListTotal, LoadingState, inputClass } from '@/components/ui';
import { adminPayments } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Pager, PaymentBadge, StatCard, useLoad } from '@/components/admin/ui';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'flagged', label: 'Flagged' },
];

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [typed]);

  const { data, error, loading } = useLoad(() => adminPayments({ status, search, page }), [status, search, page]);

  const columns = [
    { key: 'date', label: 'Date', render: (p) => formatDateTime(p.paidAt || p.createdAt) },
    {
      key: 'business',
      label: 'Business',
      render: (p) =>
        p.business ? (
          <Link href={`/admin/businesses/${p.business._id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            {p.business.name}
          </Link>
        ) : (
          '—'
        ),
    },
    { key: 'plan', label: 'Plan', render: (p) => `${p.planName} (${p.interval})${p.renewal ? ' · auto-renewal' : ''}` },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => formatMoney(p.amount) },
    { key: 'status', label: 'Status', render: (p) => <PaymentBadge status={p.status} /> },
    {
      key: 'reference',
      label: 'Reference',
      render: (p) => (
        <span>
          <span className="break-all font-mono text-xs">{p.reference}</span>
          {p.failureReason && <span className="block text-xs text-red-500">{p.failureReason}</span>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Payments" subtitle="Every plan payment made through Paystack." />

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Paid" value={formatMoney(data.summary.success.amount)} sub={`${data.summary.success.count} payments`} tone="green" />
          <StatCard label="Pending" value={data.summary.pending.count} sub="started, not finished" />
          <StatCard label="Failed" value={data.summary.failed.count} sub={formatMoney(data.summary.failed.amount)} />
          <StatCard label="Flagged" value={data.summary.flagged.count} sub="amount did not match: look at these" tone={data.summary.flagged.count > 0 ? 'red' : 'gray'} />
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search by Paystack reference" className={inputClass} />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message="No payments match that." icon="billing" />
      ) : data ? (
        <>
          <ListTotal count={data.total} noun="payment" />
          <DataTable columns={columns} rows={data.items} numbered={false} />
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
